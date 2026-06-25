import { useLang } from '../../i18n/LanguageContext'
import { mpLookupLabel } from '../../Utils/mpLookupLabel'
import {
  aggregateQty,
  hasPendingInstall,
  openPartsForDisplayRow,
  primaryItem,
  vehicleIdsFromDisplayRow,
  type MissingPartDisplayRow
} from '../../Utils/missingPartDisplay'
import {
  ACTIVE_COLS,
  HISTORY_COLS,
  actionsCell,
  canCompleteVehicle,
  cell,
  formatDateTime,
  iconSize,
  isFirstVehicleRow
} from '../../Utils/missingPartPageUtils'
import type { MissingPartDetail } from '../../Types/missingPart'
import type { MpLookupOption } from '../../Types/mpLookup'
import type { ListTab } from './MissingPartsToolbar'
import { CheckCircle2, MessageSquare, Pencil, Settings2, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  listTab: ListTab
  displayRows: MissingPartDisplayRow[]
  filtered: MissingPartDetail[]
  loading: boolean
  reasons: MpLookupOption[]
  departments: MpLookupOption[]
  canBulkInstall: boolean
  canEdit: boolean
  canDelete: boolean
  canUpdateStatus: boolean
  canComplete: boolean
  selectableVehicleIds: Set<string>
  selectedVehicleIds: Set<string>
  bulkInstalling: boolean
  completingVehicleId: string | null
  allSelectableSelected: boolean
  someSelectableSelected: boolean
  onToggleSelectAll: () => void
  onToggleRowSelection: (row: MissingPartDisplayRow) => void
  onOpenVinList: (vins: string[], modelName: string, colorName: string | null) => void
  onOpenDetail: (part: MissingPartDetail) => void
  onOpenNotes: (part: MissingPartDetail) => void
  onEdit: (part: MissingPartDetail) => void
  onUpdate: (part: MissingPartDetail) => void
  onDelete: (row: MissingPartDisplayRow) => void
  onComplete: (part: MissingPartDetail) => void
  vehicleIssueCount: (vehicleId: string) => number
}

export function MissingPartsTable({
  listTab,
  displayRows,
  filtered,
  loading,
  reasons,
  departments,
  canBulkInstall,
  canEdit,
  canDelete,
  canUpdateStatus,
  canComplete,
  selectableVehicleIds,
  selectedVehicleIds,
  bulkInstalling,
  completingVehicleId,
  allSelectableSelected,
  someSelectableSelected,
  onToggleSelectAll,
  onToggleRowSelection,
  onOpenVinList,
  onOpenDetail,
  onOpenNotes,
  onEdit,
  onUpdate,
  onDelete,
  onComplete,
  vehicleIssueCount
}: Props) {
  const { t, lang } = useLang()
  const cols = listTab === 'history' ? HISTORY_COLS : ACTIVE_COLS

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-center">
        <thead className="bg-slate-950/90">
          <tr>
            {cols.map(c => (
              <th
                key={c}
                className={`${c === 'actions' ? actionsCell : cell} font-black uppercase text-slate-400`}
                style={c === 'actions' ? { insetInlineEnd: 0 } : undefined}
              >
                {c === 'select' && canBulkInstall ? (
                  <input
                    type="checkbox"
                    checked={allSelectableSelected}
                    ref={el => {
                      if (el) el.indeterminate = someSelectableSelected && !allSelectableSelected
                    }}
                    onChange={onToggleSelectAll}
                    disabled={selectableVehicleIds.size === 0 || bulkInstalling}
                    title={t('mp.bulk.selectAll')}
                    className="h-4 w-4 cursor-pointer rounded border-slate-600 bg-slate-800 text-cyan-500"
                  />
                ) : c === 'actions' || c === 'select' ? (
                  ''
                ) : (
                  t(`mp.cols.${c === 'dateTime' ? 'dateTime' : c}`)
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {displayRows.map(displayRow => {
            const i = primaryItem(displayRow)
            const groupVins = displayRow.kind === 'group' ? displayRow.items.map(x => x.vin) : [i.vin]
            const qty =
              displayRow.kind === 'group' ? aggregateQty(displayRow.items) : { installed: i.installedQty, required: i.requiredQty }
            const stationLabel = i.stationNumber ? (i.stationName ? `${i.stationNumber} · ${i.stationName}` : i.stationNumber) : '-'
            const { date, time } = formatDateTime(i.createdAt, lang)
            const rowVehicleIds = vehicleIdsFromDisplayRow(displayRow)
            const rowSelectable = canBulkInstall && hasPendingInstall(openPartsForDisplayRow(displayRow, filtered))
            const rowChecked =
              rowSelectable && rowVehicleIds.filter(id => selectableVehicleIds.has(id)).every(id => selectedVehicleIds.has(id))
            const rowOpen = i.status !== 'closed' && i.status !== 'cancelled'
            const isGroup = displayRow.kind === 'group'
            const canArchiveVehicle = canCompleteVehicle(i.vehicleId, filtered)
            const showCompleteBtn =
              listTab === 'active' && canComplete && canArchiveVehicle && !isGroup && isFirstVehicleRow(filtered, filtered.indexOf(i), i.vehicleId)
            const issueCount = isGroup ? displayRow.items.length : vehicleIssueCount(i.vehicleId)

            return (
              <tr
                key={displayRow.key}
                className={`bg-slate-900/30 hover:bg-slate-800/40 ${rowChecked ? 'ring-1 ring-inset ring-cyan-500/40' : ''}`}
              >
                {listTab === 'active' && (
                  <td className={cell}>
                    {canBulkInstall && (
                      <input
                        type="checkbox"
                        checked={rowChecked}
                        disabled={!rowSelectable || bulkInstalling}
                        onChange={() => onToggleRowSelection(displayRow)}
                        className="h-4 w-4 cursor-pointer rounded border-slate-600 bg-slate-800 text-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
                      />
                    )}
                  </td>
                )}
                <td className={`${cell} font-bold text-white`}>
                  {groupVins.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => onOpenVinList(groupVins, i.modelName, i.colorName)}
                      className="text-cyan-300 hover:text-cyan-200 hover:underline"
                      title={t('mp.vinListModal.open')}
                    >
                      {t('mp.vinCount', { n: groupVins.length })}
                    </button>
                  ) : (
                    <span dir="ltr">{i.vin}</span>
                  )}
                </td>
                <td className={cell}>{i.modelName}</td>
                <td className={cell}>
                  {i.colorName ? (
                    <span className="inline-flex items-center justify-center gap-1.5">
                      <span className="inline-block h-3 w-3 rounded-full ring-1 ring-slate-500" style={{ backgroundColor: i.colorHex ?? '#fff' }} />
                      {i.colorName}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className={cell} title={stationLabel}>
                  {stationLabel}
                </td>
                <td className={cell}>
                  <span className="font-mono tabular-nums">
                    <span className="text-cyan-200">{qty.installed}</span>
                    <span className="text-slate-500">/</span>
                    <span className="text-slate-200">{qty.required}</span>
                  </span>
                </td>
                <td className={cell} title={i.partDescription}>
                  <span className="mx-auto block max-w-[140px] truncate text-slate-200">{i.partDescription}</span>
                </td>
                <td className={cell}>
                  <button
                    type="button"
                    onClick={() => onOpenDetail(i)}
                    className="mx-auto block max-w-[120px] truncate text-cyan-300 hover:text-cyan-200 hover:underline"
                    title={t('mp.detail.title')}
                  >
                    {mpLookupLabel(reasons, i.reason, lang)}
                  </button>
                </td>
                <td className={cell}>{mpLookupLabel(departments, i.department, lang)}</td>
                <td className={`${cell} text-slate-400`}>
                  <div className="leading-tight">
                    <div>{date}</div>
                    <div className="text-[10px] text-slate-500">{time}</div>
                  </div>
                </td>
                {listTab === 'history' && (
                  <td className={`${cell} text-emerald-300/80`}>
                    {i.shortageResolvedAt ? formatDateTime(i.shortageResolvedAt, lang).date : '-'}
                  </td>
                )}
                {listTab === 'active' && (
                  <td className={actionsCell} style={{ insetInlineEnd: 0 }}>
                    <div className="flex items-center justify-center gap-1">
                      <IconBtn title={t('mp.thread.open')} onClick={() => onOpenNotes(i)} className="text-cyan-400 hover:bg-cyan-500/20">
                        <MessageSquare className={iconSize} />
                      </IconBtn>
                      {rowOpen && canEdit && (
                        <IconBtn title={t('mp.edit.editVehicle', { n: issueCount })} onClick={() => onEdit(i)} className="text-slate-200 hover:bg-slate-700">
                          <Pencil className={iconSize} />
                        </IconBtn>
                      )}
                      {rowOpen && canUpdateStatus && (
                        <IconBtn title={t('mp.act.updateVehicle', { n: issueCount })} onClick={() => onUpdate(i)} className="text-cyan-300 hover:bg-cyan-500/20">
                          <Settings2 className={iconSize} />
                        </IconBtn>
                      )}
                      {rowOpen && canDelete && (
                        <IconBtn title={t('common.delete')} onClick={() => onDelete(displayRow)} className="text-red-300 hover:bg-red-500/20">
                          <Trash2 className={iconSize} />
                        </IconBtn>
                      )}
                      {rowOpen && showCompleteBtn && (
                        <IconBtn
                          title={t('mp.complete')}
                          onClick={() => onComplete(i)}
                          className={`text-emerald-400 hover:bg-emerald-500/20 ${completingVehicleId === i.vehicleId ? 'opacity-35' : ''}`}
                        >
                          <CheckCircle2 className={iconSize} />
                        </IconBtn>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
      {loading && <div className="p-8 text-center text-slate-400">{t('common.loading')}</div>}
      {!loading && displayRows.length === 0 && (
        <div className="p-8 text-center text-slate-400">{listTab === 'history' ? t('mp.history.empty') : t('common.noResults')}</div>
      )}
    </div>
  )
}

function IconBtn({ title, onClick, className, children }: { title: string; onClick: () => void; className: string; children: ReactNode }) {
  return (
    <button type="button" title={title} onClick={onClick} className={`rounded-md p-1.5 ${className}`}>
      {children}
    </button>
  )
}
