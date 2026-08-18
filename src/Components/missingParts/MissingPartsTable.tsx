import { type MouseEvent, type ReactNode } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { formatVehicleColorLabel } from '../../Utils/vehicleColorLabel'
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
  cell,
  formatDateTime,
  isMissingPartRowOpen,
  completerNames,
  reporterNames,
  uniqueVehicleReps,
  uniqueIssueReps
} from '../../Utils/missingPartPageUtils'
import { MissingPartVehicleActions } from './MissingPartVehicleActions'
import type { ShortageMissionAssignInput } from './MpAssignShortageMissionButton'
import { notesCountForVehicleIds } from '../../services/vehicleNotesService'
import type { MissingPartDetail } from '../../Types/missingPart'
import { ExportableTable } from '../ExportableTable'
export type ListTab = 'active' | 'history'

type Props = {
  listTab: ListTab
  filtered: MissingPartDetail[]
  loading: boolean
  canBulkSelect: boolean
  canBulkInstall: boolean
  canExport: boolean
  canEdit: boolean
  canDelete: boolean
  canUpdateStatus: boolean
  canNotes: boolean
  canComplete: boolean
  noteCounts?: Record<string, number>
  selectableVehicleIds: Set<string>
  selectedVehicleIds: Set<string>
  bulkInstalling: boolean
  completingVehicleId: string | null
  allSelectableSelected: boolean
  someSelectableSelected: boolean
  onToggleSelectAll: () => void
  onToggleRowSelection: (row: MissingPartTableRow) => void
  onOpenVinList: (vins: string[], modelName: string, colorName: string | null) => void
  onRowClick: (parts: MissingPartDetail[]) => void
  onOpenNotes: (part: MissingPartDetail) => void
  onEdit: (part: MissingPartDetail) => void
  onUpdate: (part: MissingPartDetail) => void
  onDeleteParts: (parts: MissingPartDetail[]) => void
  onComplete: (part: MissingPartDetail) => void
  onCompleteAll: (parts: MissingPartDetail[]) => void
  onAssignFollowUp?: (
    part: MissingPartDetail,
    assignment: { completingDepartment: string; followUpEmployeeId: string }
  ) => void
  onAssignShortageMission?: (part: MissingPartDetail, input: ShortageMissionAssignInput) => void | Promise<void>
  assignMissionBusy?: boolean
}

export function MissingPartsTable({
  listTab,
  filtered,
  loading,
  canBulkSelect,
  canBulkInstall,
  canExport,
  canEdit,
  canDelete,
  canUpdateStatus,
  canNotes,
  canComplete,
  noteCounts = {},
  selectableVehicleIds,
  selectedVehicleIds,
  bulkInstalling,
  completingVehicleId,
  allSelectableSelected,
  someSelectableSelected,
  onToggleSelectAll,
  onToggleRowSelection,
  onOpenVinList,
  onRowClick,
  onOpenNotes,
  onEdit,
  onUpdate,
  onDeleteParts,
  onComplete,
  onCompleteAll,
  onAssignFollowUp,
  onAssignShortageMission,
  assignMissionBusy
}: Props) {
  const { t, lang } = useLang()
  const cols = listTab === 'history' ? HISTORY_COLS : ACTIVE_COLS
  const tableRows = buildMissingPartTableRows(filtered, listTab === 'history' ? 'resolved-desc' : 'created-asc')

  function rowSelectable(row: MissingPartTableRow) {
    if (!canBulkSelect) return false
    return vehicleIdsFromTableRow(row).some(id => selectableVehicleIds.has(id))
  }

  function rowChecked(row: MissingPartTableRow) {
    const ids = vehicleIdsFromTableRow(row).filter(id => selectableVehicleIds.has(id))
    return rowSelectable(row) && ids.length > 0 && ids.every(id => selectedVehicleIds.has(id))
  }

  return (
    <ExportableTable
      filename={listTab === 'history' ? 'missing-parts-archive' : 'missing-parts'}
      title={t('mp.title')}
      rowCount={loading ? 0 : tableRows.length}
      showExport={canExport}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-center">
          <thead className="bg-slate-950/90">
            <tr>
              {cols.map(c => (
                <th
                  key={c}
                  className={`${c === 'actions' ? actionsCell : cell} font-black uppercase text-slate-400`}
                  style={c === 'actions' ? { insetInlineEnd: 0 } : undefined}
                  {...(c === 'actions' || c === 'select' ? { 'data-export-skip': true } : {})}
                >
                  {c === 'select' && canBulkSelect ? (
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
                    canBulkSelect={canBulkSelect}
                    canBulkInstall={canBulkInstall}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    canUpdateStatus={canUpdateStatus}
                    canNotes={canNotes}
                    canComplete={canComplete}
                    noteCounts={noteCounts}
                    bulkInstalling={bulkInstalling}
                    completingVehicleId={completingVehicleId}
                    rowChecked={rowChecked(row)}
                    rowSelectable={rowSelectable(row)}
                    onToggleRowSelection={() => onToggleRowSelection(row)}
                    onOpenVinList={onOpenVinList}
                    onRowClick={onRowClick}
                    onOpenNotes={onOpenNotes}
                    onEdit={onEdit}
                    onUpdate={onUpdate}
                    onDeleteParts={onDeleteParts}
                    deleteTargets={row.displayRow.items}
                    onComplete={onComplete}
                    onCompleteAll={onCompleteAll}
                    onAssignFollowUp={onAssignFollowUp}
                    onAssignShortageMission={onAssignShortageMission}
                    assignMissionBusy={assignMissionBusy}
                  />
                )
              }

              if (row.kind === 'vehicle') {
                const primary = row.parts[0]
                const qty = aggregateQty(row.parts)
                return (
                  <VehicleRows
                    key={`v-${row.vehicleId}`}
                    parts={row.parts}
                    primary={primary}
                    qty={qty}
                    listTab={listTab}
                    filtered={filtered}
                    canBulkSelect={canBulkSelect}
                    canBulkInstall={canBulkInstall}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    canUpdateStatus={canUpdateStatus}
                    canNotes={canNotes}
                    canComplete={canComplete}
                    noteCounts={noteCounts}
                    bulkInstalling={bulkInstalling}
                    completingVehicleId={completingVehicleId}
                    rowChecked={rowChecked(row)}
                    rowSelectable={rowSelectable(row)}
                    onToggleRowSelection={() => onToggleRowSelection(row)}
                    onRowClick={onRowClick}
                    onOpenNotes={onOpenNotes}
                    onEdit={onEdit}
                    onUpdate={onUpdate}
                    onDeleteParts={onDeleteParts}
                    deleteTargets={row.parts}
                    onComplete={onComplete}
                    onCompleteAll={onCompleteAll}
                    onAssignFollowUp={onAssignFollowUp}
                    onAssignShortageMission={onAssignShortageMission}
                    assignMissionBusy={assignMissionBusy}
                  />
                )
              }

              return (
                <SinglePartRow
                  key={row.item.id}
                  item={row.item}
                  listTab={listTab}
                  filtered={filtered}
                  canBulkSelect={canBulkSelect}
                  canBulkInstall={canBulkInstall}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  canUpdateStatus={canUpdateStatus}
                  canNotes={canNotes}
                  canComplete={canComplete}
                  noteCounts={noteCounts}
                  bulkInstalling={bulkInstalling}
                  completingVehicleId={completingVehicleId}
                  rowChecked={rowChecked(row)}
                  rowSelectable={rowSelectable(row)}
                  onToggleRowSelection={() => onToggleRowSelection(row)}
                  onRowClick={onRowClick}
                  onOpenNotes={onOpenNotes}
                  onEdit={onEdit}
                  onUpdate={onUpdate}
                  onDeleteParts={onDeleteParts}
                  deleteTargets={[row.item]}
                  onComplete={onComplete}
                  onCompleteAll={onCompleteAll}
                  onAssignFollowUp={onAssignFollowUp}
                  onAssignShortageMission={onAssignShortageMission}
                  assignMissionBusy={assignMissionBusy}
                />
              )
            })}
          </tbody>
        </table>
        {loading && <div className="p-8 text-center text-slate-400">{t('common.loading')}</div>}
        {!loading && tableRows.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            {listTab === 'history' ? t('mp.history.empty') : t('common.noResults')}
          </div>
        )}
      </div>
    </ExportableTable>
  )
}

type RowProps = {
  listTab: ListTab
  filtered: MissingPartDetail[]
  canBulkSelect: boolean
  canBulkInstall: boolean
  canEdit: boolean
  canDelete: boolean
  canUpdateStatus: boolean
  canNotes: boolean
  canComplete: boolean
  noteCounts?: Record<string, number>
  bulkInstalling: boolean
  completingVehicleId: string | null
  rowChecked: boolean
  rowSelectable: boolean
  onToggleRowSelection: () => void
  onRowClick: (parts: MissingPartDetail[]) => void
  onOpenNotes: (part: MissingPartDetail) => void
  onEdit: (part: MissingPartDetail) => void
  onUpdate: (part: MissingPartDetail) => void
  onDeleteParts: (parts: MissingPartDetail[]) => void
  deleteTargets: MissingPartDetail[]
  onComplete: (part: MissingPartDetail) => void
  onCompleteAll: (parts: MissingPartDetail[]) => void
  onAssignFollowUp?: (
    part: MissingPartDetail,
    assignment: { completingDepartment: string; followUpEmployeeId: string }
  ) => void
  onAssignShortageMission?: (part: MissingPartDetail, input: ShortageMissionAssignInput) => void | Promise<void>
  assignMissionBusy?: boolean
}

function ReportGroupRow({
  displayRow,
  onOpenVinList,
  ...props
}: RowProps & {
  displayRow: Extract<MissingPartDisplayRow, { kind: 'group' }>
  onOpenVinList: (vins: string[], modelName: string, colorName: string | null) => void
}) {
  const { t, lang } = useLang()
  const i = primaryItem(displayRow)
  const groupVins = [...new Set(displayRow.items.map(x => x.vin))].sort((a, b) => a.localeCompare(b))
  const qty = aggregateQty(displayRow.items)
  const issueCount = displayRow.items.length
  const vehicleReps = uniqueVehicleReps(displayRow.items)
  const uniqueIssues = uniqueIssueReps(displayRow.items)
  const multiIssues = uniqueIssues.length > 1

  return (
    <PartDataRow
      {...props}
      item={i}
      issueCount={issueCount}
      isGroup
      vinCell={
        groupVins.length === 1 ? (
          <span dir="ltr">{groupVins[0]}</span>
        ) : (
          <button
            type="button"
            onClick={() => onOpenVinList(groupVins, i.modelName, i.colorName)}
            className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-sm font-bold text-cyan-300 transition hover:border-cyan-400/50 hover:bg-cyan-500/20"
            title={t('mp.vinListModal.open')}
          >
            {t('mp.vinCount', { n: groupVins.length })}
          </button>
        )
      }
      qty={qty}
      reporterLabel={reporterNames(displayRow.items)}
      completerLabel={completerNames(displayRow.items)}
      reasonCell={multiIssues ? <StackedShortageReasons parts={displayRow.items} /> : undefined}
      deleteTargets={displayRow.items}
      lang={lang}
      relatedParts={displayRow.items}
      completeRep={vehicleReps[0] ?? i}
      completeAllReps={vehicleReps.length > 1 ? vehicleReps : undefined}
    />
  )
}

function VehicleRows({
  parts,
  primary,
  qty,
  ...props
}: RowProps & {
  parts: MissingPartDetail[]
  primary: MissingPartDetail
  qty: { installed: number; required: number }
}) {
  const { lang } = useLang()
  const uniqueIssues = uniqueIssueReps(parts)

  return (
    <PartDataRow
      {...props}
      item={primary}
      issueCount={parts.length}
      isGroup={false}
      vinCell={<span dir="ltr">{primary.vin}</span>}
      qty={qty}
      reporterLabel={reporterNames(parts)}
      completerLabel={completerNames(parts)}
      reasonCell={uniqueIssues.length > 1 ? <StackedShortageReasons parts={parts} /> : undefined}
      deleteTargets={parts}
      lang={lang}
      relatedParts={parts}
      completeRep={primary}
    />
  )
}

function StackedShortageReasons({ parts }: { parts: MissingPartDetail[] }) {
  const issues = uniqueIssueReps(parts)
  return (
    <span
      className="mx-auto flex max-w-[16rem] flex-col items-center gap-1 py-0.5 text-sm leading-snug text-slate-200"
      title={issues.map(p => p.partDescription).join('\n')}
      onClick={e => e.stopPropagation()}
    >
      {issues.map(p => (
        <span key={p.id} className="block w-full text-center">
          {p.partDescription}
        </span>
      ))}
    </span>
  )
}

function SinglePartRow({ item, ...props }: RowProps & { item: MissingPartDetail }) {
  const { lang } = useLang()

  return (
    <PartDataRow
      {...props}
      item={item}
      issueCount={1}
      isGroup={false}
      vinCell={<span dir="ltr">{item.vin}</span>}
      qty={{ installed: item.installedQty, required: item.requiredQty }}
      reporterLabel={reporterNames([item])}
      completerLabel={completerNames([item])}
      deleteTargets={[item]}
      lang={lang}
      completeRep={item}
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
  reporterLabel,
  completerLabel,
  reasonCell,
  lang,
  canBulkSelect,
  canEdit,
  canDelete,
  canUpdateStatus,
  canNotes,
  canComplete,
  bulkInstalling,
  completingVehicleId,
  rowChecked,
  rowSelectable,
  onToggleRowSelection,
  onRowClick,
  onOpenNotes,
  onEdit,
  onUpdate,
  onDeleteParts,
  deleteTargets,
  onComplete,
  onCompleteAll,
  onAssignFollowUp,
  onAssignShortageMission,
  assignMissionBusy,
  noteCounts = {},
  rowClassName = '',
  relatedParts,
  completeRep,
  completeAllReps
}: RowProps & {
  item: MissingPartDetail
  issueCount: number
  isGroup: boolean
  vinCell: ReactNode
  qty: { installed: number; required: number }
  reporterLabel: string
  completerLabel: string
  reasonCell?: ReactNode
  lang: string
  rowClassName?: string
  relatedParts?: MissingPartDetail[]
  completeRep?: MissingPartDetail
  completeAllReps?: MissingPartDetail[]
}) {
  const { t } = useLang()
  const rowScope = relatedParts ?? [item]
  const rowOpen = isMissingPartRowOpen(rowScope)
  const completeTarget = completeRep ?? item
  const noteCount = notesCountForVehicleIds(
    rowScope.map(p => p.vehicleId),
    noteCounts
  )

  function handleRowClick(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (target.closest('button,a,input,select,textarea,[data-export-skip]')) return
    onRowClick(relatedParts ?? [item])
  }

  return (
    <tr
      className={`cursor-pointer bg-slate-900/30 hover:bg-slate-800/40 ${rowChecked ? 'ring-1 ring-inset ring-cyan-500/40' : ''} ${rowClassName}`}
      onClick={handleRowClick}
    >
      {(listTab === 'active' || listTab === 'history') && (
        <td data-export-skip className={cell}>
          {canBulkSelect && (
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
      <td className={`${cell} font-bold text-white`}>
        <span className="inline-flex items-center justify-center gap-2">
          {vinCell}
          {rowScope.some(p => !!p.transferredAt) && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-black text-emerald-200">
              {t('mp.vehicleCard.archiveBadge')}
            </span>
          )}
          {rowScope.some(p => !!p.pendingTransferRequestId) && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-black text-amber-200">
              {t('mp.workflow.transferPending')}
            </span>
          )}
          {rowScope.some(p => !!p.pendingRestoreRequestId) && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-black text-amber-200">
              {t('mp.workflow.restorePending')}
            </span>
          )}
        </span>
      </td>
      <td className={cell}>{item.modelName}</td>
      <td className={cell}>
        {item.colorName ? (
          <span className="inline-flex items-center justify-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full ring-1 ring-slate-500"
              style={{ backgroundColor: item.colorHex ?? '#fff' }}
            />
            {formatVehicleColorLabel(item.colorName, item.colorCode)}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td className={cell} title={reporterLabel}>
        <span className="mx-auto block max-w-[10rem] truncate text-slate-300">{reporterLabel}</span>
      </td>
      <td className={cell}>
        <span className="font-mono tabular-nums">
          <span className="text-cyan-200">{qty.installed}</span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-200">{qty.required}</span>
        </span>
      </td>
      <td className={cell} title={reasonCell ? undefined : item.partDescription}>
        {reasonCell ?? (
          <span className="mx-auto block max-w-[140px] truncate text-slate-200">{item.partDescription}</span>
        )}
      </td>
      <td className={`${cell} text-slate-400`}>
        <DateTimeCell iso={item.createdAt} lang={lang} />
      </td>
      {listTab === 'history' && (
        <>
          <td className={cell} title={completerLabel}>
            <span className="mx-auto block max-w-[10rem] truncate text-slate-300">{completerLabel}</span>
          </td>
          <td className={`${cell} text-emerald-300/80`}>
            {item.shortageResolvedAt ? <DateTimeCell iso={item.shortageResolvedAt} lang={lang} /> : '-'}
          </td>
        </>
      )}
      {(listTab === 'active' || listTab === 'history') && (
        <td data-export-skip className={actionsCell} style={{ insetInlineEnd: 0 }}>
          <MissingPartVehicleActions
            item={item}
            issueCount={issueCount}
            noteCount={noteCount}
            rowOpen={rowOpen}
            archiveMode={listTab === 'history'}
            allItems={filtered}
            deleteTargets={deleteTargets}
            canUpdateStatus={canUpdateStatus}
            canNotes={canNotes}
            canEdit={canEdit}
            canDelete={canDelete}
            canComplete={canComplete}
            completeRep={completeTarget}
            completeAllReps={completeAllReps}
            completingVehicleId={completingVehicleId}
            onOpenNotes={onOpenNotes}
            onEdit={onEdit}
            onUpdate={onUpdate}
            onDeleteParts={onDeleteParts}
            onComplete={onComplete}
            onCompleteAll={onCompleteAll}
            onAssignFollowUp={onAssignFollowUp}
            onAssignShortageMission={onAssignShortageMission}
            assignMissionBusy={assignMissionBusy}
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
