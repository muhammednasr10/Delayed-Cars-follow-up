import { type ReactNode } from 'react'
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
  cell,
  formatDateTime,
  isMissingPartRowOpen,
  uniqueVehicleReps,
  uniqueIssueReps
} from '../../Utils/missingPartPageUtils'
import { MissingPartVehicleActions } from './MissingPartVehicleActions'
import type { MissingPartDetail } from '../../Types/missingPart'
import type { MpLookupOption } from '../../Types/mpLookup'
import { ExportableTable } from '../ExportableTable'
export type ListTab = 'active' | 'history'

type Props = {
  listTab: ListTab
  filtered: MissingPartDetail[]
  loading: boolean
  reasons: MpLookupOption[]
  departments: MpLookupOption[]
  orgUnitLabelFor?: (id: string | null | undefined) => string
  canBulkSelect: boolean
  canBulkInstall: boolean
  canExport: boolean
  canEdit: boolean
  canDelete: boolean
  canUpdateStatus: boolean
  canNotes: boolean
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
  onOpenIssuesList: (parts: MissingPartDetail[], vin?: string, modelName?: string) => void
  onOpenDetail: (part: MissingPartDetail) => void
  onOpenNotes: (part: MissingPartDetail) => void
  onEdit: (part: MissingPartDetail) => void
  onUpdate: (part: MissingPartDetail) => void
  onDeleteParts: (parts: MissingPartDetail[]) => void
  onComplete: (part: MissingPartDetail) => void
  onCompleteAll: (parts: MissingPartDetail[]) => void
}

export function MissingPartsTable({
  listTab,
  filtered,
  loading,
  reasons,
  departments,
  orgUnitLabelFor = () => '—',
  canBulkSelect,
  canBulkInstall,
  canExport,
  canEdit,
  canDelete,
  canUpdateStatus,
  canNotes,
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
  onOpenIssuesList,
  onOpenDetail,
  onOpenNotes,
  onEdit,
  onUpdate,
  onDeleteParts,
  onComplete,
  onCompleteAll
}: Props) {
  const { t, lang } = useLang()
  const cols = listTab === 'history' ? HISTORY_COLS : ACTIVE_COLS
  const tableRows = buildMissingPartTableRows(filtered)

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
                    reasons={reasons}
                    departments={departments}
                    orgUnitLabelFor={orgUnitLabelFor}
                    canBulkSelect={canBulkSelect}
                    canBulkInstall={canBulkInstall}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    canUpdateStatus={canUpdateStatus}
                    canNotes={canNotes}
                    canComplete={canComplete}
                    bulkInstalling={bulkInstalling}
                    completingVehicleId={completingVehicleId}
                    rowChecked={rowChecked(row)}
                    rowSelectable={rowSelectable(row)}
                    onToggleRowSelection={() => onToggleRowSelection(row)}
                    onOpenVinList={onOpenVinList}
                    onOpenIssuesList={onOpenIssuesList}
                    onOpenDetail={onOpenDetail}
                    onOpenNotes={onOpenNotes}
                    onEdit={onEdit}
                    onUpdate={onUpdate}
                    onDeleteParts={onDeleteParts}
                    deleteTargets={row.displayRow.items}
                    onComplete={onComplete}
                    onCompleteAll={onCompleteAll}
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
                    reasons={reasons}
                    departments={departments}
                    orgUnitLabelFor={orgUnitLabelFor}
                    canBulkSelect={canBulkSelect}
                    canBulkInstall={canBulkInstall}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    canUpdateStatus={canUpdateStatus}
                    canNotes={canNotes}
                    canComplete={canComplete}
                    bulkInstalling={bulkInstalling}
                    completingVehicleId={completingVehicleId}
                    rowChecked={rowChecked(row)}
                    rowSelectable={rowSelectable(row)}
                    onToggleRowSelection={() => onToggleRowSelection(row)}
                    onOpenIssuesList={onOpenIssuesList}
                    onOpenDetail={onOpenDetail}
                    onOpenNotes={onOpenNotes}
                    onEdit={onEdit}
                    onUpdate={onUpdate}
                    onDeleteParts={onDeleteParts}
                    deleteTargets={row.parts}
                    onComplete={onComplete}
                    onCompleteAll={onCompleteAll}
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
                  orgUnitLabelFor={orgUnitLabelFor}
                  canBulkSelect={canBulkSelect}
                  canBulkInstall={canBulkInstall}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  canUpdateStatus={canUpdateStatus}
                  canNotes={canNotes}
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
                  onDeleteParts={onDeleteParts}
                  deleteTargets={[row.item]}
                  onComplete={onComplete}
                  onCompleteAll={onCompleteAll}
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
  reasons: MpLookupOption[]
  departments: MpLookupOption[]
  orgUnitLabelFor: (id: string | null | undefined) => string
  canBulkSelect: boolean
  canBulkInstall: boolean
  canEdit: boolean
  canDelete: boolean
  canUpdateStatus: boolean
  canNotes: boolean
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
  onDeleteParts: (parts: MissingPartDetail[]) => void
  deleteTargets: MissingPartDetail[]
  onComplete: (part: MissingPartDetail) => void
  onCompleteAll: (parts: MissingPartDetail[]) => void
}

function multiReasonButton(
  t: (key: string, vars?: Record<string, string | number>) => string,
  count: number,
  onClick: () => void
) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm font-bold text-amber-200 transition hover:border-amber-400/50 hover:bg-amber-500/20"
      title={t('mp.issuesListModal.open')}
    >
      {t('mp.multiReasonsSummary', { n: count })}
    </button>
  )
}

function ReportGroupRow({
  displayRow,
  onOpenVinList,
  onOpenIssuesList,
  ...props
}: RowProps & {
  displayRow: Extract<MissingPartDisplayRow, { kind: 'group' }>
  onOpenVinList: (vins: string[], modelName: string, colorName: string | null) => void
  onOpenIssuesList: (parts: MissingPartDetail[], vin?: string, modelName?: string) => void
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
      orgUnitLabel={props.orgUnitLabelFor(i.factoryOrgUnitId)}
      reasonCell={
        multiIssues
          ? multiReasonButton(t, uniqueIssues.length, () =>
              onOpenIssuesList(uniqueIssues, groupVins.length === 1 ? groupVins[0] : undefined, i.modelName)
            )
          : undefined
      }
      reasonClassSummary={multiIssues ? '—' : undefined}
      deleteTargets={displayRow.items}
      reasons={props.reasons}
      departments={props.departments}
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
  onOpenIssuesList,
  ...props
}: RowProps & {
  parts: MissingPartDetail[]
  primary: MissingPartDetail
  qty: { installed: number; required: number }
  onOpenIssuesList: (parts: MissingPartDetail[], vin?: string, modelName?: string) => void
}) {
  const { t, lang } = useLang()
  const multi = parts.length > 1

  return (
    <PartDataRow
      {...props}
      item={primary}
      issueCount={parts.length}
      isGroup={false}
      vinCell={<span dir="ltr">{primary.vin}</span>}
      qty={qty}
      orgUnitLabel={props.orgUnitLabelFor(primary.factoryOrgUnitId)}
      reasonCell={
        multi
          ? multiReasonButton(t, parts.length, () => onOpenIssuesList(parts, primary.vin, primary.modelName))
          : undefined
      }
      reasonClassSummary={multi ? '—' : undefined}
      deleteTargets={parts}
      reasons={props.reasons}
      departments={props.departments}
      lang={lang}
      relatedParts={parts}
      completeRep={primary}
    />
  )
}

function SinglePartRow({ item, ...props }: RowProps & { item: MissingPartDetail }) {
  const { lang } = useLang()
  const orgUnitLabel = props.orgUnitLabelFor(item.factoryOrgUnitId)

  return (
    <PartDataRow
      {...props}
      item={item}
      issueCount={1}
      isGroup={false}
      vinCell={<span dir="ltr">{item.vin}</span>}
      qty={{ installed: item.installedQty, required: item.requiredQty }}
      orgUnitLabel={orgUnitLabel}
      deleteTargets={[item]}
      reasons={props.reasons}
      departments={props.departments}
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
  orgUnitLabel,
  reasonCell,
  reasonClassSummary,
  reasons,
  departments,
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
  onOpenDetail,
  onOpenNotes,
  onEdit,
  onUpdate,
  onDeleteParts,
  deleteTargets,
  onComplete,
  onCompleteAll,
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
  orgUnitLabel: string
  reasonCell?: ReactNode
  reasonClassSummary?: string
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

  return (
    <tr
      className={`bg-slate-900/30 hover:bg-slate-800/40 ${rowChecked ? 'ring-1 ring-inset ring-cyan-500/40' : ''} ${rowClassName}`}
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
      <td className={`${cell} font-bold text-white`}>{vinCell}</td>
      <td className={cell}>{item.modelName}</td>
      <td className={cell}>
        {item.colorName ? (
          <span className="inline-flex items-center justify-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full ring-1 ring-slate-500"
              style={{ backgroundColor: item.colorHex ?? '#fff' }}
            />
            {item.colorName}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td className={cell} title={orgUnitLabel}>
        <span className="mx-auto block max-w-[10rem] truncate text-slate-300">{orgUnitLabel}</span>
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
      {(listTab === 'active' || listTab === 'history') && (
        <td data-export-skip className={actionsCell} style={{ insetInlineEnd: 0 }}>
          <MissingPartVehicleActions
            item={item}
            issueCount={issueCount}
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
