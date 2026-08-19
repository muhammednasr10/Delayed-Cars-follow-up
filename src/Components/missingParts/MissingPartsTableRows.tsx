import { type MouseEvent, type ReactNode } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { formatVehicleColorLabel } from '../../Utils/vehicleColorLabel'
import { aggregateQty, primaryItem, type MissingPartDisplayRow } from '../../Utils/missingPartDisplay'
import {
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
import { notesCountForVehicleIds } from '../../services/vehicleNotesService'
import type { MissingPartDetail } from '../../Types/missingPart'
import type { MpVehicleActionFlags, MpVehicleListActionProps } from '../../Types/mpVehicleActions'

export type MissingPartsTableListTab = 'active' | 'history'

export type MissingPartsTableRowProps = {
  listTab: MissingPartsTableListTab
  filtered: MissingPartDetail[]
  canBulkSelect: boolean
  canBulkInstall: boolean
  noteCounts?: Record<string, number>
  bulkInstalling: boolean
  completingVehicleId: string | null
  rowChecked: boolean
  rowSelectable: boolean
  onToggleRowSelection: () => void
  onRowClick: (parts: MissingPartDetail[]) => void
  deleteTargets: MissingPartDetail[]
} & MpVehicleActionFlags &
  MpVehicleListActionProps

export function ReportGroupRow({
  displayRow,
  onOpenVinList,
  ...props
}: MissingPartsTableRowProps & {
  displayRow: Extract<MissingPartDisplayRow, { kind: 'group' }>
  onOpenVinList: (parts: MissingPartDetail[], pickComplete?: boolean) => void
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
      vinCell={
        groupVins.length === 1 ? (
          <span dir="ltr">{groupVins[0]}</span>
        ) : (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onOpenVinList(displayRow.items)
            }}
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

export function VehicleRows({
  parts,
  primary,
  qty,
  ...props
}: MissingPartsTableRowProps & {
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

export function SinglePartRow({ item, ...props }: MissingPartsTableRowProps & { item: MissingPartDetail }) {
  const { lang } = useLang()

  return (
    <PartDataRow
      {...props}
      item={item}
      issueCount={1}
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
  shortageMissions = [],
  noteCounts = {},
  rowClassName = '',
  relatedParts,
  completeRep,
  completeAllReps
}: MissingPartsTableRowProps & {
  item: MissingPartDetail
  issueCount: number
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
            shortageMissions={shortageMissions}
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
