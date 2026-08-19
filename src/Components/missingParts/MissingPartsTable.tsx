import { useLang } from '../../i18n/LanguageContext'
import {
  aggregateQty,
  buildMissingPartTableRows,
  vehicleIdsFromTableRow,
  type MissingPartTableRow
} from '../../Utils/missingPartDisplay'
import { ACTIVE_COLS, HISTORY_COLS, actionsCell, cell } from '../../Utils/missingPartPageUtils'
import type { MissingPartDetail } from '../../Types/missingPart'
import type { MpVehicleActionFlags, MpVehicleListActionProps } from '../../Types/mpVehicleActions'
import { ExportableTable } from '../ExportableTable'
import { ReportGroupRow, SinglePartRow, VehicleRows, type MissingPartsTableListTab } from './MissingPartsTableRows'

export type ListTab = MissingPartsTableListTab

type Props = {
  listTab: ListTab
  filtered: MissingPartDetail[]
  loading: boolean
  canBulkSelect: boolean
  canBulkInstall: boolean
  canExport: boolean
  noteCounts?: Record<string, number>
  selectableVehicleIds: Set<string>
  selectedVehicleIds: Set<string>
  bulkInstalling: boolean
  completingVehicleId: string | null
  allSelectableSelected: boolean
  someSelectableSelected: boolean
  onToggleSelectAll: () => void
  onToggleRowSelection: (row: MissingPartTableRow) => void
  onOpenVinList: (parts: MissingPartDetail[], pickComplete?: boolean) => void
  onRowClick: (parts: MissingPartDetail[]) => void
} & MpVehicleActionFlags &
  MpVehicleListActionProps

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
  assignMissionBusy,
  shortageMissions = []
}: Props) {
  const { t } = useLang()
  const cols = listTab === 'history' ? HISTORY_COLS : ACTIVE_COLS
  const tableRows = buildMissingPartTableRows(filtered, listTab === 'history' ? 'resolved-desc' : 'created-asc')
  const rowBase = {
    listTab,
    filtered,
    canBulkSelect,
    canBulkInstall,
    canEdit,
    canDelete,
    canUpdateStatus,
    canNotes,
    canComplete,
    noteCounts,
    bulkInstalling,
    completingVehicleId,
    onRowClick,
    onOpenNotes,
    onEdit,
    onUpdate,
    onDeleteParts,
    onComplete,
    onCompleteAll,
    onAssignFollowUp,
    onAssignShortageMission,
    assignMissionBusy,
    shortageMissions
  }

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
              const shared = {
                ...rowBase,
                rowChecked: rowChecked(row),
                rowSelectable: rowSelectable(row),
                onToggleRowSelection: () => onToggleRowSelection(row)
              }
              if (row.kind === 'report-group') {
                return (
                  <ReportGroupRow
                    key={row.displayRow.key}
                    {...shared}
                    displayRow={row.displayRow}
                    onOpenVinList={onOpenVinList}
                    deleteTargets={row.displayRow.items}
                  />
                )
              }
              if (row.kind === 'vehicle') {
                return (
                  <VehicleRows
                    key={`v-${row.vehicleId}`}
                    {...shared}
                    parts={row.parts}
                    primary={row.parts[0]}
                    qty={aggregateQty(row.parts)}
                    deleteTargets={row.parts}
                  />
                )
              }
              return <SinglePartRow key={row.item.id} {...shared} item={row.item} deleteTargets={[row.item]} />
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
