import { type MouseEvent, type ReactNode } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { formatVehicleColorLabel } from '../../Utils/vehicleColorLabel'
import { departmentLeafLabel, mpLookupLabel } from '../../Utils/mpLookupLabel'
import type { FactoryOrgUnit } from '../../Types/factoryOrg'
import { aggregateQty, primaryItem, type MissingPartDisplayRow } from '../../Utils/missingPartDisplay'
import type { MpLookupOption } from '../../Types/mpLookup'
import { mainPartsForReportGroup } from '../../Utils/shortageGroupDisplay'
import {
  actionsCell,
  cell,
  formatDateTime,
  isMissingPartRowOpen,
  completerNames,
  shortageDurationDays,
  uniqueVehicleReps,
  uniqueIssueReps
} from '../../Utils/missingPartPageUtils'
import { MissingPartVehicleActions } from './MissingPartVehicleActions'
import { notesCountForVehicleIds } from '../../services/vehicleNotesService'
import type { MissingPartDetail } from '../../Types/missingPart'
import type { MpVehicleActionFlags, MpVehicleListActionProps } from '../../Types/mpVehicleActions'
import { isRepeatedShortageVin } from '../../Utils/vinListConflict'

export type MissingPartsTableListTab = 'active' | 'history'

export type MissingPartsTableRowProps = {
  listTab: MissingPartsTableListTab
  reasons: MpLookupOption[]
  departments: MpLookupOption[]
  orgUnits: FactoryOrgUnit[]
  filtered: MissingPartDetail[]
  repeatedVinKeys?: ReadonlySet<string>
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

function VinText({ vin, repeatedVinKeys }: { vin: string; repeatedVinKeys?: ReadonlySet<string> }) {
  const repeated = isRepeatedShortageVin(vin, repeatedVinKeys ?? new Set())
  return (
    <span dir="ltr" className={repeated ? 'font-black text-red-400' : undefined}>
      {vin}
    </span>
  )
}

export function ReportGroupRow({
  displayRow,
  onOpenVinList,
  ...props
}: MissingPartsTableRowProps & {
  displayRow: Extract<MissingPartDisplayRow, { kind: 'group' }>
  onOpenVinList: (parts: MissingPartDetail[], pickComplete?: boolean) => void
}) {
  const { t, lang } = useLang()
  const groupVins = [...new Set(displayRow.items.map(x => x.vin))].sort((a, b) => a.localeCompare(b))
  const vehicleIds = [...new Set(displayRow.items.map(i => i.vehicleId))]
  const scopeParts = props.filtered.filter(p => vehicleIds.includes(p.vehicleId))
  const mainParts = mainPartsForReportGroup(scopeParts)
  const i = primaryItem({ kind: 'group', items: mainParts.length > 0 ? mainParts : displayRow.items, key: displayRow.key })
  const qty = aggregateQty(mainParts.length > 0 ? mainParts : displayRow.items)
  const issueCount = mainParts.length > 0 ? mainParts.length : displayRow.items.length
  const vehicleReps = uniqueVehicleReps(displayRow.items)
  const uniqueIssues = uniqueIssueReps(mainParts)
  const multiIssues = uniqueIssues.length > 1
  const hasRepeatedVin = groupVins.some(vin => isRepeatedShortageVin(vin, props.repeatedVinKeys ?? new Set()))

  return (
    <PartDataRow
      {...props}
      item={i}
      issueCount={issueCount}
      vinCell={
        groupVins.length === 1 ? (
          <VinText vin={groupVins[0]} repeatedVinKeys={props.repeatedVinKeys} />
        ) : (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onOpenVinList(displayRow.items)
            }}
            className={`relative z-0 rounded-lg border px-3 py-1.5 text-sm font-bold transition ${
              hasRepeatedVin
                ? 'border-red-500/40 bg-red-500/10 text-red-300 hover:border-red-400/50 hover:bg-red-500/20'
                : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:border-cyan-400/50 hover:bg-cyan-500/20'
            }`}
            title={`${t('mp.vinListModal.open')}: ${groupVins.join(' · ')}`}
            data-export-value={groupVins.join('\n')}
          >
            {t('mp.vinCount', { n: groupVins.length })}
          </button>
        )
      }
      qty={qty}
      completerLabel={completerNames(displayRow.items)}
      reasonCell={multiIssues ? <StackedShortageReasons parts={mainParts} /> : undefined}
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
      vinCell={<VinText vin={primary.vin} repeatedVinKeys={props.repeatedVinKeys} />}
      qty={qty}
      completerLabel={completerNames(parts)}
      reasonCell={uniqueIssues.length > 1 ? <StackedShortageReasons parts={parts} /> : undefined}
      deleteTargets={parts}
      lang={lang}
      relatedParts={parts}
      completeRep={primary}
    />
  )
}

/** Extra shortages on one VIN that already belongs to a multi-chassis report group. */
export function GroupBranchRow({
  parts,
  primary,
  qty,
  ...props
}: MissingPartsTableRowProps & {
  parts: MissingPartDetail[]
  primary: MissingPartDetail
  qty: { installed: number; required: number }
}) {
  const { t, lang } = useLang()
  const uniqueIssues = uniqueIssueReps(parts)

  return (
    <PartDataRow
      {...props}
      item={primary}
      issueCount={parts.length}
      vinCell={
        <span className="inline-flex max-w-full items-center gap-1.5" title={t('mp.groupBranchHint')}>
          <span className="font-mono text-slate-500" aria-hidden>
            └
          </span>
          <VinText vin={primary.vin} repeatedVinKeys={props.repeatedVinKeys} />
        </span>
      }
      qty={qty}
      completerLabel={completerNames(parts)}
      reasonCell={uniqueIssues.length > 1 ? <StackedShortageReasons parts={parts} /> : undefined}
      deleteTargets={parts}
      lang={lang}
      relatedParts={parts}
      completeRep={primary}
      rowClassName="bg-slate-950/40"
      nestUnderGroup
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
      vinCell={<VinText vin={item.vin} repeatedVinKeys={props.repeatedVinKeys} />}
      qty={{ installed: item.installedQty, required: item.requiredQty }}
      completerLabel={completerNames([item])}
      deleteTargets={[item]}
      lang={lang}
      completeRep={item}
    />
  )
}

function lookupLabels(
  parts: MissingPartDetail[],
  pick: (part: MissingPartDetail) => string | null | undefined,
  options: MpLookupOption[],
  lang: string
): string[] {
  const seen = new Set<string>()
  const labels: string[] = []
  for (const part of parts) {
    const label = mpLookupLabel(options, pick(part)?.trim() ?? '', lang)
    if (!label || label === '—') continue
    if (seen.has(label)) continue
    seen.add(label)
    labels.push(label)
  }
  return labels
}

function departmentLabels(
  parts: MissingPartDetail[],
  pick: (part: MissingPartDetail) => string | null | undefined,
  options: MpLookupOption[],
  orgUnits: FactoryOrgUnit[],
  lang: string
): { labels: string[]; title: string } {
  const seen = new Set<string>()
  const labels: string[] = []
  const titles: string[] = []
  for (const part of parts) {
    const code = pick(part)?.trim() ?? ''
    const label = departmentLeafLabel(code, options, orgUnits, lang)
    if (!label || label === '—') continue
    if (seen.has(label)) continue
    seen.add(label)
    labels.push(label)
    const full = mpLookupLabel(options, code, lang)
    titles.push(full && full !== '—' ? full : label)
  }
  return { labels, title: titles.join('\n') }
}

function LookupCell({ labels, title }: { labels: string[]; title?: string }) {
  if (labels.length === 0) return <span className="text-slate-500">—</span>
  return (
    <span
      className="mx-auto flex max-w-[11rem] flex-col items-center gap-0.5 text-sm leading-snug text-slate-200"
      title={title ?? labels.join('\n')}
    >
      {labels.map(label => (
        <span key={label} className="block w-full truncate text-center">
          {label}
        </span>
      ))}
    </span>
  )
}

function PartDataRow({
  listTab,
  filtered,
  reasons,
  departments,
  orgUnits,
  item,
  issueCount,
  vinCell,
  qty,
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
  completeAllReps,
  nestUnderGroup = false
}: MissingPartsTableRowProps & {
  item: MissingPartDetail
  issueCount: number
  vinCell: ReactNode
  qty: { installed: number; required: number }
  completerLabel: string
  reasonCell?: ReactNode
  lang: string
  rowClassName?: string
  relatedParts?: MissingPartDetail[]
  completeRep?: MissingPartDetail
  completeAllReps?: MissingPartDetail[]
  nestUnderGroup?: boolean
}) {
  const { t } = useLang()
  const rowScope = relatedParts ?? [item]
  const rowOpen = isMissingPartRowOpen(rowScope)
  const completeTarget = completeRep ?? item
  const noteCount = notesCountForVehicleIds(
    rowScope.map(p => p.vehicleId),
    noteCounts
  )
  const daysInShortage = listTab === 'history' ? shortageDurationDays(rowScope) : null
  const causing = departmentLabels(rowScope, part => part.department, departments, orgUnits, lang)
  const reasonClassLabels = lookupLabels(rowScope, part => part.reason, reasons, lang)
  const completing = departmentLabels(rowScope, part => part.completingDepartment, departments, orgUnits, lang)

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
      <td className={`${cell} max-w-[12rem] overflow-hidden font-bold text-white`}>
        <span
          className={`inline-flex max-w-full items-center justify-center gap-2 ${
            nestUnderGroup ? 'ms-3 border-s-2 border-cyan-500/35 ps-2' : ''
          }`}
        >
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
      <td className={cell}>
        <LookupCell labels={causing.labels} title={causing.title} />
      </td>
      <td className={cell}>
        <LookupCell labels={reasonClassLabels} />
      </td>
      <td className={cell}>
        <LookupCell labels={completing.labels} title={completing.title} />
      </td>
      <td className={`${cell} text-slate-400`}>
        <DateTimeCell iso={earliestCreatedAt(rowScope)} lang={lang} />
      </td>
      {listTab === 'history' && (
        <>
          <td className={cell} title={completerLabel}>
            <span className="mx-auto block max-w-[10rem] truncate text-slate-300">{completerLabel}</span>
          </td>
          <td className={`${cell} text-emerald-300/80`}>
            {item.shortageResolvedAt ? <DateTimeCell iso={item.shortageResolvedAt} lang={lang} /> : '-'}
          </td>
          <td className={`${cell} tabular-nums font-bold text-amber-200`}>
            {daysInShortage == null ? '—' : daysInShortage}
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

function earliestCreatedAt(parts: MissingPartDetail[]): string {
  let min = parts[0]?.createdAt ?? ''
  for (const part of parts) {
    if (part.createdAt && (!min || part.createdAt < min)) min = part.createdAt
  }
  return min
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
