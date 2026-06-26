import { useState, type ReactNode } from 'react'
import { CheckCircle2, ChevronDown, ChevronLeft, MessageSquare, Pencil, Settings2, Trash2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { mpLookupLabel } from '../../Utils/mpLookupLabel'
import {
  aggregateQty,
  buildMissingPartTableRows,
  partsFromTableRow,
  primaryItem,
  vehicleIdsFromTableRow,
  type MissingPartDisplayRow,
  type MissingPartTableRow
} from '../../Utils/missingPartDisplay'
import {
  ACTIVE_COLS,
  HISTORY_COLS,
  actionsCell,
  canCompleteVehicle,
  cell,
  formatDateTime,
  iconSize
} from '../../Utils/missingPartPageUtils'
import type { MissingPartDetail } from '../../Types/missingPart'
import type { MpLookupOption } from '../../Types/mpLookup'
export type ListTab = 'active' | 'history'

type Props = {
  listTab: ListTab
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
  onToggleRowSelection: (row: MissingPartTableRow) => void
  onOpenVinList: (vins: string[], modelName: string, colorName: string | null) => void
  onOpenDetail: (part: MissingPartDetail) => void
  onOpenNotes: (part: MissingPartDetail) => void
  onEdit: (part: MissingPartDetail) => void
  onUpdate: (part: MissingPartDetail) => void
  onDeleteParts: (parts: MissingPartDetail[]) => void
  onComplete: (part: MissingPartDetail) => void
}

export function MissingPartsTable({
  listTab,
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
  onDeleteParts,
  onComplete
}: Props) {
  const { t, lang } = useLang()
  const cols = listTab === 'history' ? HISTORY_COLS : ACTIVE_COLS
  const tableRows = buildMissingPartTableRows(filtered)
  const [expandedVehicles, setExpandedVehicles] = useState<Set<string>>(() => new Set())

  function toggleVehicleExpand(vehicleId: string) {
    setExpandedVehicles(prev => {
      const next = new Set(prev)
      if (next.has(vehicleId)) next.delete(vehicleId)
      else next.add(vehicleId)
      return next
    })
  }

  function rowSelectable(row: MissingPartTableRow) {
    if (!canBulkInstall) return false
    const ids = vehicleIdsFromTableRow(row)
    return ids.some(id => selectableVehicleIds.has(id)) && partsFromTableRow(row).some(p => p.installedQty < p.requiredQty && p.status !== 'closed' && p.status !== 'cancelled')
  }

  function rowChecked(row: MissingPartTableRow) {
    const ids = vehicleIdsFromTableRow(row).filter(id => selectableVehicleIds.has(id))
    return rowSelectable(row) && ids.length > 0 && ids.every(id => selectedVehicleIds.has(id))
  }

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
          {tableRows.map(row => {
            if (row.kind === 'report-group') {
              return (
                <ReportGroupRow
                  key={row.displayRow.key}
                  displayRow={row.displayRow}
                  listTab={listTab}
                  filtered={filtered}
                  reasons={reasons}
                  departments={departments}
                  canBulkInstall={canBulkInstall}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  canUpdateStatus={canUpdateStatus}
                  canComplete={canComplete}
                  bulkInstalling={bulkInstalling}
                  completingVehicleId={completingVehicleId}
                  rowChecked={rowChecked(row)}
                  rowSelectable={rowSelectable(row)}
                  onToggleRowSelection={() => onToggleRowSelection(row)}
                  onOpenVinList={onOpenVinList}
                  onOpenDetail={onOpenDetail}
                  onOpenNotes={onOpenNotes}
                  onEdit={onEdit}
                  onUpdate={onUpdate}
                  onDeleteParts={() => onDeleteParts(row.displayRow.items)}
                  onComplete={onComplete}
                />
              )
            }

            if (row.kind === 'vehicle') {
              const expanded = expandedVehicles.has(row.vehicleId)
              const primary = row.parts[0]
              const qty = aggregateQty(row.parts)
              return (
                <VehicleRows
                  key={`v-${row.vehicleId}`}
                  parts={row.parts}
                  primary={primary}
                  qty={qty}
                  expanded={expanded}
                  listTab={listTab}
                  filtered={filtered}
                  reasons={reasons}
                  departments={departments}
                  canBulkInstall={canBulkInstall}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  canUpdateStatus={canUpdateStatus}
                  canComplete={canComplete}
                  bulkInstalling={bulkInstalling}
                  completingVehicleId={completingVehicleId}
                  rowChecked={rowChecked(row)}
                  rowSelectable={rowSelectable(row)}
                  onToggleExpand={() => toggleVehicleExpand(row.vehicleId)}
                  onToggleRowSelection={() => onToggleRowSelection(row)}
                  onOpenDetail={onOpenDetail}
                  onOpenNotes={onOpenNotes}
                  onEdit={onEdit}
                  onUpdate={onUpdate}
                  onDeleteParts={() => onDeleteParts(row.parts)}
                  onComplete={onComplete}
                />
              )
            }

            return (
              <SinglePartRow
                key={row.item.id}
                item={row.item}
                listTab={listTab}
                filtered={filtered}
                reasons={reasons}
                departments={departments}
                canBulkInstall={canBulkInstall}
                canEdit={canEdit}
                canDelete={canDelete}
                canUpdateStatus={canUpdateStatus}
                canComplete={canComplete}
                bulkInstalling={bulkInstalling}
                completingVehicleId={completingVehicleId}
                rowChecked={rowChecked(row)}
                rowSelectable={rowSelectable(row)}
                onToggleRowSelection={() => onToggleRowSelection(row)}
                onOpenDetail={onOpenDetail}
                onOpenNotes={onOpenNotes}
                onEdit={onEdit}
                onUpdate={onUpdate}
                onDeleteParts={() => onDeleteParts([row.item])}
                onComplete={onComplete}
              />
            )
          })}
        </tbody>
      </table>
      {loading && <div className="p-8 text-center text-slate-400">{t('common.loading')}</div>}
      {!loading && tableRows.length === 0 && (
        <div className="p-8 text-center text-slate-400">{listTab === 'history' ? t('mp.history.empty') : t('common.noResults')}</div>
      )}
    </div>
  )
}

type RowProps = {
  listTab: ListTab
  filtered: MissingPartDetail[]
  reasons: MpLookupOption[]
  departments: MpLookupOption[]
  canBulkInstall: boolean
  canEdit: boolean
  canDelete: boolean
  canUpdateStatus: boolean
  canComplete: boolean
  bulkInstalling: boolean
  completingVehicleId: string | null
  rowChecked: boolean
  rowSelectable: boolean
  onToggleRowSelection: () => void
  onOpenDetail: (part: MissingPartDetail) => void
  onOpenNotes: (part: MissingPartDetail) => void
  onEdit: (part: MissingPartDetail) => void
  onUpdate: (part: MissingPartDetail) => void
  onDeleteParts: () => void
  onComplete: (part: MissingPartDetail) => void
}

function ReportGroupRow({
  displayRow,
  onOpenVinList,
  ...props
}: RowProps & { displayRow: Extract<MissingPartDisplayRow, { kind: 'group' }>; onOpenVinList: Props['onOpenVinList'] }) {
  const { t, lang } = useLang()
  const i = primaryItem(displayRow)
  const groupVins = displayRow.items.map(x => x.vin)
  const qty = aggregateQty(displayRow.items)
  const issueCount = displayRow.items.length

  return (
    <PartDataRow
      {...props}
      item={i}
      issueCount={issueCount}
      isGroup
      vinCell={
        <button
          type="button"
          onClick={() => onOpenVinList(groupVins, i.modelName, i.colorName)}
          className="text-cyan-300 hover:text-cyan-200 hover:underline"
          title={t('mp.vinListModal.open')}
        >
          {t('mp.vinCount', { n: groupVins.length })}
        </button>
      }
      qty={qty}
      stationLabel={i.stationNumber ? (i.stationName ? `${i.stationNumber} · ${i.stationName}` : i.stationNumber) : '-'}
      reasons={props.reasons}
      departments={props.departments}
      lang={lang}
      showCompleteBtn={false}
    />
  )
}

function VehicleRows({
  parts,
  primary,
  qty,
  expanded,
  onToggleExpand,
  ...props
}: RowProps & {
  parts: MissingPartDetail[]
  primary: MissingPartDetail
  qty: { installed: number; required: number }
  expanded: boolean
  onToggleExpand: () => void
}) {
  const { t, lang } = useLang()

  return (
    <>
      <PartDataRow
        {...props}
        item={primary}
        issueCount={parts.length}
        isGroup={false}
        vinCell={
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={onToggleExpand}
              className="rounded-md p-1 text-cyan-300 hover:bg-slate-800"
              title={expanded ? t('mp.collapseReasons') : t('mp.expandReasons')}
              aria-expanded={expanded}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4 rtl:rotate-180" />}
            </button>
            <span dir="ltr">{primary.vin}</span>
          </div>
        }
        qty={qty}
        stationLabel="—"
        reasonSummary={t('mp.multiReasonsSummary', { n: parts.length })}
        reasonClassSummary="—"
        reasons={props.reasons}
        departments={props.departments}
        lang={lang}
        rowClassName={expanded ? 'bg-slate-800/50' : ''}
      />
      {expanded &&
        parts.map((part, index) => (
          <tr key={part.id} className="bg-slate-950/60">
            {props.listTab === 'active' && <td className={cell} />}
            <td className={`${cell} text-slate-500`}>{index + 1}</td>
            <td className={cell} colSpan={2} />
            <td className={cell} title={part.stationNumber ? `${part.stationNumber} · ${part.stationName ?? ''}` : ''}>
              {part.stationNumber ? `${part.stationNumber}${part.stationName ? ` · ${part.stationName}` : ''}` : '—'}
            </td>
            <td className={cell}>
              <span className="font-mono tabular-nums">
                <span className="text-cyan-200">{part.installedQty}</span>
                <span className="text-slate-500">/</span>
                <span className="text-slate-200">{part.requiredQty}</span>
              </span>
            </td>
            <td className={cell} title={part.partDescription}>
              <span className="mx-auto block max-w-[140px] truncate text-slate-200">{part.partDescription}</span>
            </td>
            <td className={cell}>
              <button
                type="button"
                onClick={() => props.onOpenDetail(part)}
                className="mx-auto block max-w-[120px] truncate text-cyan-300 hover:text-cyan-200 hover:underline"
              >
                {mpLookupLabel(props.reasons, part.reason, lang)}
              </button>
            </td>
            <td className={cell}>{mpLookupLabel(props.departments, part.department, lang)}</td>
            <td className={`${cell} text-slate-400`}>
              <DateTimeCell iso={part.createdAt} lang={lang} />
            </td>
            {props.listTab === 'active' && <td className={actionsCell} />}
          </tr>
        ))}
    </>
  )
}

function SinglePartRow({ item, ...props }: RowProps & { item: MissingPartDetail }) {
  const { lang } = useLang()
  const stationLabel = item.stationNumber ? (item.stationName ? `${item.stationNumber} · ${item.stationName}` : item.stationNumber) : '-'

  return (
    <PartDataRow
      {...props}
      item={item}
      issueCount={1}
      isGroup={false}
      vinCell={<span dir="ltr">{item.vin}</span>}
      qty={{ installed: item.installedQty, required: item.requiredQty }}
      stationLabel={stationLabel}
      reasons={props.reasons}
      departments={props.departments}
      lang={lang}
    />
  )
}

function PartDataRow({
  listTab,
  filtered,
  item,
  issueCount,
  isGroup,
  vinCell,
  qty,
  stationLabel,
  reasonSummary,
  reasonClassSummary,
  reasons,
  departments,
  lang,
  canBulkInstall,
  canEdit,
  canDelete,
  canUpdateStatus,
  canComplete,
  bulkInstalling,
  completingVehicleId,
  rowChecked,
  rowSelectable,
  onToggleRowSelection,
  onOpenDetail,
  onOpenNotes,
  onEdit,
  onUpdate,
  onDeleteParts,
  onComplete,
  rowClassName = '',
  showCompleteBtn: showCompleteBtnOverride
}: RowProps & {
  item: MissingPartDetail
  issueCount: number
  isGroup: boolean
  vinCell: ReactNode
  qty: { installed: number; required: number }
  stationLabel: string
  reasonSummary?: string
  reasonClassSummary?: string
  lang: string
  rowClassName?: string
  showCompleteBtn?: boolean
}) {
  const { t } = useLang()
  const rowOpen = item.status !== 'closed' && item.status !== 'cancelled'
  const canArchiveVehicle = canCompleteVehicle(item.vehicleId, filtered)
  const showCompleteBtn =
    showCompleteBtnOverride ?? (listTab === 'active' && canComplete && canArchiveVehicle && !isGroup)

  return (
    <tr className={`bg-slate-900/30 hover:bg-slate-800/40 ${rowChecked ? 'ring-1 ring-inset ring-cyan-500/40' : ''} ${rowClassName}`}>
      {listTab === 'active' && (
        <td className={cell}>
          {canBulkInstall && (
            <input
              type="checkbox"
              checked={rowChecked}
              disabled={!rowSelectable || bulkInstalling}
              onChange={onToggleRowSelection}
              className="h-4 w-4 cursor-pointer rounded border-slate-600 bg-slate-800 text-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
            />
          )}
        </td>
      )}
      <td className={`${cell} font-bold text-white`}>{vinCell}</td>
      <td className={cell}>{item.modelName}</td>
      <td className={cell}>
        {item.colorName ? (
          <span className="inline-flex items-center justify-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full ring-1 ring-slate-500" style={{ backgroundColor: item.colorHex ?? '#fff' }} />
            {item.colorName}
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
      <td className={cell} title={reasonSummary ? undefined : item.partDescription}>
        {reasonSummary ? (
          <span className="text-amber-200">{reasonSummary}</span>
        ) : (
          <span className="mx-auto block max-w-[140px] truncate text-slate-200">{item.partDescription}</span>
        )}
      </td>
      <td className={cell}>
        {reasonClassSummary ? (
          <span className="text-slate-500">{reasonClassSummary}</span>
        ) : (
          <button
            type="button"
            onClick={() => onOpenDetail(item)}
            className="mx-auto block max-w-[120px] truncate text-cyan-300 hover:text-cyan-200 hover:underline"
            title={t('mp.detail.title')}
          >
            {mpLookupLabel(reasons, item.reason, lang)}
          </button>
        )}
      </td>
      <td className={cell}>{reasonClassSummary ? '—' : mpLookupLabel(departments, item.department, lang)}</td>
      <td className={`${cell} text-slate-400`}>
        <DateTimeCell iso={item.createdAt} lang={lang} />
      </td>
      {listTab === 'history' && (
        <td className={`${cell} text-emerald-300/80`}>
          {item.shortageResolvedAt ? formatDateTime(item.shortageResolvedAt, lang).date : '-'}
        </td>
      )}
      {listTab === 'active' && (
        <td className={actionsCell} style={{ insetInlineEnd: 0 }}>
          <ActionsCell
            item={item}
            issueCount={issueCount}
            rowOpen={rowOpen}
            canUpdateStatus={canUpdateStatus}
            canEdit={canEdit}
            canDelete={canDelete}
            showCompleteBtn={showCompleteBtn}
            completingVehicleId={completingVehicleId}
            onOpenNotes={onOpenNotes}
            onEdit={onEdit}
            onUpdate={onUpdate}
            onDeleteParts={onDeleteParts}
            onComplete={onComplete}
          />
        </td>
      )}
    </tr>
  )
}

function DateTimeCell({ iso, lang }: { iso: string; lang: string }) {
  const { date, time } = formatDateTime(iso, lang)
  return (
    <div className="leading-tight">
      <div>{date}</div>
      <div className="text-[10px] text-slate-500">{time}</div>
    </div>
  )
}

function ActionsCell({
  item,
  issueCount,
  rowOpen,
  canUpdateStatus,
  canEdit,
  canDelete,
  showCompleteBtn,
  completingVehicleId,
  onOpenNotes,
  onEdit,
  onUpdate,
  onDeleteParts,
  onComplete
}: {
  item: MissingPartDetail
  issueCount: number
  rowOpen: boolean
  canUpdateStatus: boolean
  canEdit: boolean
  canDelete: boolean
  showCompleteBtn: boolean
  completingVehicleId: string | null
  onOpenNotes: (part: MissingPartDetail) => void
  onEdit: (part: MissingPartDetail) => void
  onUpdate: (part: MissingPartDetail) => void
  onDeleteParts: () => void
  onComplete: (part: MissingPartDetail) => void
}) {
  const { t } = useLang()

  return (
    <div className="flex items-center justify-center gap-1">
      {rowOpen && canUpdateStatus && (
        <IconBtn title={t('mp.act.updateVehicle', { n: issueCount })} onClick={() => onUpdate(item)} className="text-cyan-300 hover:bg-cyan-500/20">
          <Settings2 className={iconSize} />
        </IconBtn>
      )}
      <IconBtn title={t('mp.thread.open')} onClick={() => onOpenNotes(item)} className="text-cyan-400 hover:bg-cyan-500/20">
        <MessageSquare className={iconSize} />
      </IconBtn>
      {rowOpen && canEdit && (
        <IconBtn title={t('mp.edit.editVehicle', { n: issueCount })} onClick={() => onEdit(item)} className="text-slate-200 hover:bg-slate-700">
          <Pencil className={iconSize} />
        </IconBtn>
      )}
      {rowOpen && canDelete && (
        <IconBtn title={t('common.delete')} onClick={onDeleteParts} className="text-red-300 hover:bg-red-500/20">
          <Trash2 className={iconSize} />
        </IconBtn>
      )}
      {rowOpen && showCompleteBtn && (
        <IconBtn
          title={t('mp.complete')}
          onClick={() => onComplete(item)}
          className={`text-emerald-400 hover:bg-emerald-500/20 ${completingVehicleId === item.vehicleId ? 'opacity-35' : ''}`}
        >
          <CheckCircle2 className={iconSize} />
        </IconBtn>
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
