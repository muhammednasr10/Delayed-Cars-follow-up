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
  iconSize,
  isMissingPartRowOpen,
  uniqueVehicleReps
} from '../../Utils/missingPartPageUtils'
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
  const [expandedVehicles, setExpandedVehicles] = useState<Set<string>>(() => new Set())
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set())

  function toggleVehicleExpand(vehicleId: string) {
    setExpandedVehicles(prev => {
      const next = new Set(prev)
      if (next.has(vehicleId)) next.delete(vehicleId)
      else next.add(vehicleId)
      return next
    })
  }

  function toggleGroupExpand(groupKey: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupKey)) next.delete(groupKey)
      else next.add(groupKey)
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
              const expanded = expandedGroups.has(row.displayRow.key)
              return (
                <ReportGroupRow
                  key={row.displayRow.key}
                  displayRow={row.displayRow}
                  expanded={expanded}
                  onToggleExpand={() => toggleGroupExpand(row.displayRow.key)}
                  listTab={listTab}
                  filtered={filtered}
                  reasons={reasons}
                  departments={departments}
                  orgUnitLabelFor={orgUnitLabelFor}
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
                  deleteTargets={row.displayRow.items}
                  onComplete={onComplete}
                  onCompleteAll={onCompleteAll}
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
                  orgUnitLabelFor={orgUnitLabelFor}
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
                  onToggleExpand={() => toggleVehicleExpand(row.vehicleId)}
                  onToggleRowSelection={() => onToggleRowSelection(row)}
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
        <div className="p-8 text-center text-slate-400">{listTab === 'history' ? t('mp.history.empty') : t('common.noResults')}</div>
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

function ReportGroupRow({
  displayRow,
  expanded,
  onToggleExpand,
  ...props
}: RowProps & {
  displayRow: Extract<MissingPartDisplayRow, { kind: 'group' }>
  expanded: boolean
  onToggleExpand: () => void
}) {
  const { t, lang } = useLang()
  const i = primaryItem(displayRow)
  const groupVins = displayRow.items.map(x => x.vin)
  const qty = aggregateQty(displayRow.items)
  const issueCount = displayRow.items.length
  const vehicleReps = uniqueVehicleReps(displayRow.items)

  return (
    <>
      <PartDataRow
        {...props}
        item={i}
        issueCount={issueCount}
        isGroup
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
            <span className="text-cyan-300">{t('mp.vinCount', { n: groupVins.length })}</span>
          </div>
        }
        qty={qty}
        stationLabel={i.stationNumber ? (i.stationName ? `${i.stationNumber} · ${i.stationName}` : i.stationNumber) : '-'}
        orgUnitLabel={props.orgUnitLabelFor(i.factoryOrgUnitId)}
        deleteTargets={displayRow.items}
        reasons={props.reasons}
        departments={props.departments}
        lang={lang}
        relatedParts={displayRow.items}
        completeRep={vehicleReps[0] ?? i}
        completeAllReps={vehicleReps.length > 1 ? vehicleReps : undefined}
        rowClassName={expanded ? 'bg-slate-800/50' : ''}
      />
      {expanded &&
        vehicleReps.map((rep, index) => {
          const vehicleParts = displayRow.items.filter(p => p.vehicleId === rep.vehicleId)
          const vehicleQty = aggregateQty(vehicleParts)
          return (
            <tr key={rep.vehicleId} className="bg-slate-950/60">
              {props.listTab === 'active' && <td className={cell} />}
              <td className={`${cell} font-mono font-bold text-slate-200`} dir="ltr">
                <span className="me-2 text-slate-500">{index + 1}</span>
                {rep.vin}
              </td>
              <td className={cell}>{rep.modelName}</td>
              <td className={cell}>
                {rep.colorName ? (
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <span
                      className="inline-block h-3 w-3 rounded-full ring-1 ring-slate-500"
                      style={{ backgroundColor: rep.colorHex ?? '#fff' }}
                    />
                    {rep.colorName}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className={cell}>—</td>
              <td className={cell}>
                <span className="font-mono tabular-nums">
                  <span className="text-cyan-200">{vehicleQty.installed}</span>
                  <span className="text-slate-500">/</span>
                  <span className="text-slate-200">{vehicleQty.required}</span>
                </span>
              </td>
              <td className={cell} colSpan={3} />
              <td className={`${cell} text-slate-400`}>
                <DateTimeCell iso={rep.createdAt} lang={lang} />
              </td>
              {props.listTab === 'history' && <td className={cell} />}
              <td data-export-skip className={actionsCell} style={{ insetInlineEnd: 0 }}>
                <ActionsCell
                  item={rep}
                  issueCount={vehicleParts.length}
                  rowOpen={isMissingPartRowOpen(vehicleParts)}
                  archiveMode={props.listTab === 'history'}
                  filtered={props.filtered}
                  deleteTargets={vehicleParts}
                  canUpdateStatus={props.canUpdateStatus}
                  canNotes={props.canNotes}
                  canEdit={props.canEdit}
                  canDelete={props.canDelete}
                  canComplete={props.canComplete}
                  completeRep={rep}
                  completingVehicleId={props.completingVehicleId}
                  onOpenNotes={props.onOpenNotes}
                  onEdit={props.onEdit}
                  onUpdate={props.onUpdate}
                  onDeleteParts={props.onDeleteParts}
                  onComplete={props.onComplete}
                />
              </td>
            </tr>
          )
        })}
    </>
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
        orgUnitLabel={props.orgUnitLabelFor(primary.factoryOrgUnitId)}
        reasonSummary={t('mp.multiReasonsSummary', { n: parts.length })}
        reasonClassSummary="—"
        deleteTargets={parts}
        reasons={props.reasons}
        departments={props.departments}
        lang={lang}
        relatedParts={parts}
        completeRep={primary}
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
            <td className={cell}>{props.orgUnitLabelFor(part.factoryOrgUnitId)}</td>
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
            {props.listTab === 'history' && (
              <td className={`${cell} text-emerald-300/80`}>
                {part.shortageResolvedAt ? formatDateTime(part.shortageResolvedAt, lang).date : '—'}
              </td>
            )}
            <td data-export-skip className={actionsCell} style={{ insetInlineEnd: 0 }}>
              {(props.listTab === 'history' || props.listTab === 'active') && (
                <ActionsCell
                  item={part}
                  issueCount={1}
                  rowOpen={part.status !== 'closed' && part.status !== 'cancelled'}
                  archiveMode={props.listTab === 'history'}
                  filtered={props.filtered}
                  deleteTargets={[part]}
                  canUpdateStatus={props.canUpdateStatus}
                  canNotes={props.canNotes}
                  canEdit={props.canEdit}
                  canDelete={props.canDelete}
                  canComplete={false}
                  completingVehicleId={props.completingVehicleId}
                  onOpenNotes={props.onOpenNotes}
                  onEdit={props.onEdit}
                  onUpdate={props.onUpdate}
                  onDeleteParts={props.onDeleteParts}
                  onComplete={props.onComplete}
                />
              )}
            </td>
          </tr>
        ))}
    </>
  )
}

function SinglePartRow({ item, ...props }: RowProps & { item: MissingPartDetail }) {
  const { lang } = useLang()
  const stationLabel = item.stationNumber ? (item.stationName ? `${item.stationNumber} · ${item.stationName}` : item.stationNumber) : '-'
  const orgUnitLabel = props.orgUnitLabelFor(item.factoryOrgUnitId)

  return (
    <PartDataRow
      {...props}
      item={item}
      issueCount={1}
      isGroup={false}
      vinCell={<span dir="ltr">{item.vin}</span>}
      qty={{ installed: item.installedQty, required: item.requiredQty }}
      stationLabel={stationLabel}
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
  stationLabel,
  orgUnitLabel,
  reasonSummary,
  reasonClassSummary,
  reasons,
  departments,
  lang,
  canBulkInstall,
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
  stationLabel: string
  orgUnitLabel: string
  reasonSummary?: string
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
    <tr className={`bg-slate-900/30 hover:bg-slate-800/40 ${rowChecked ? 'ring-1 ring-inset ring-cyan-500/40' : ''} ${rowClassName}`}>
      {listTab === 'active' && (
        <td data-export-skip className={cell}>
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
      {(listTab === 'active' || listTab === 'history') && (
        <td data-export-skip className={actionsCell} style={{ insetInlineEnd: 0 }}>
          <ActionsCell
            item={item}
            issueCount={issueCount}
            rowOpen={rowOpen}
            archiveMode={listTab === 'history'}
            filtered={filtered}
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

function ActionsCell({
  item,
  issueCount,
  rowOpen,
  archiveMode = false,
  filtered,
  deleteTargets,
  canUpdateStatus,
  canNotes,
  canEdit,
  canDelete,
  canComplete,
  completeRep,
  completeAllReps,
  completingVehicleId,
  onOpenNotes,
  onEdit,
  onUpdate,
  onDeleteParts,
  onComplete,
  onCompleteAll
}: {
  item: MissingPartDetail
  issueCount: number
  rowOpen: boolean
  archiveMode?: boolean
  filtered: MissingPartDetail[]
  deleteTargets: MissingPartDetail[]
  canUpdateStatus: boolean
  canNotes: boolean
  canEdit: boolean
  canDelete: boolean
  canComplete: boolean
  completeRep?: MissingPartDetail
  completeAllReps?: MissingPartDetail[]
  completingVehicleId: string | null
  onOpenNotes: (part: MissingPartDetail) => void
  onEdit: (part: MissingPartDetail) => void
  onUpdate: (part: MissingPartDetail) => void
  onDeleteParts: (parts: MissingPartDetail[]) => void
  onComplete: (part: MissingPartDetail) => void
  onCompleteAll?: (parts: MissingPartDetail[]) => void
}) {
  const { t } = useLang()
  const canAct = archiveMode || rowOpen
  const target = completeRep ?? item
  const completeAll = completeAllReps && completeAllReps.length > 1
  const canArchiveSingle = canCompleteVehicle(target.vehicleId, filtered)
  const canArchiveAnyInGroup = completeAllReps?.some(rep => canCompleteVehicle(rep.vehicleId, filtered)) ?? false
  const groupBusy = completeAllReps?.some(rep => completingVehicleId === rep.vehicleId) ?? false
  const singleBusy = completingVehicleId === target.vehicleId

  return (
    <div className="flex items-center justify-center gap-1">
      {!archiveMode && rowOpen && canUpdateStatus && (
        <IconBtn title={t('mp.act.updateVehicle', { n: issueCount })} onClick={() => onUpdate(item)} className="text-cyan-300 hover:bg-cyan-500/20">
          <Settings2 className={iconSize} />
        </IconBtn>
      )}
      {!archiveMode && rowOpen && canNotes && (
        <IconBtn title={t('mp.thread.open')} onClick={() => onOpenNotes(item)} className="text-cyan-400 hover:bg-cyan-500/20">
          <MessageSquare className={iconSize} />
        </IconBtn>
      )}
      {canAct && canEdit && (
        <IconBtn title={t('mp.edit.editVehicle', { n: issueCount })} onClick={() => onEdit(item)} className="text-slate-200 hover:bg-slate-700">
          <Pencil className={iconSize} />
        </IconBtn>
      )}
      {canAct && canDelete && (
        <IconBtn title={t('common.delete')} onClick={() => onDeleteParts(deleteTargets)} className="text-red-300 hover:bg-red-500/20">
          <Trash2 className={iconSize} />
        </IconBtn>
      )}
      {!archiveMode && rowOpen && canComplete && completeAll && onCompleteAll && (
        <IconBtn
          title={canArchiveAnyInGroup ? t('mp.completeAllConfirm') : t('mp.completeDisabledHint')}
          disabled={!canArchiveAnyInGroup || groupBusy}
          onClick={() => onCompleteAll(completeAllReps)}
          className="text-emerald-400 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <CheckCircle2 className={iconSize} />
        </IconBtn>
      )}
      {!archiveMode && rowOpen && canComplete && !completeAll && (
        <IconBtn
          title={canArchiveSingle ? t('mp.complete') : t('mp.completeDisabledHint')}
          disabled={!canArchiveSingle || singleBusy}
          onClick={() => onComplete(target)}
          className="text-emerald-400 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <CheckCircle2 className={iconSize} />
        </IconBtn>
      )}
    </div>
  )
}

function IconBtn({
  title,
  onClick,
  className,
  disabled,
  children
}: {
  title: string
  onClick: () => void
  className: string
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button type="button" title={title} disabled={disabled} onClick={onClick} className={`rounded-md p-1.5 ${className}`}>
      {children}
    </button>
  )
}
