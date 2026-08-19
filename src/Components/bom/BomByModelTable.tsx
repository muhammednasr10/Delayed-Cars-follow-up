import { bomColumnLabelKey, BOM_COMPACT_HEADER_COLS } from '../../Utils/bomColumnHeader'
import { BomGroupedTableRow } from './BomGroupedTableRow'
import { ExportableTable } from '../ExportableTable'
import { ExcelColumnFilter } from './ExcelColumnFilter'
import { IplModelCompareTable } from './IplModelCompareTable'
import type { BomByModelDataReturn } from '../../hooks/useBomByModelData'

export function BomByModelTable({ data }: { data: BomByModelDataReturn }) {
  const {
    t, perModel, loading, iplRefreshing, compareMode, openTabsActive,
    compareItemsByModel, canUpdate, canDelete, openPartEditById,
    pagedGroups, colCount, rowColumns, colWidths, baseFilters,
    excelFilters, setColumnFilter, expandedKeys, toggleExpanded,
    models, stations, stationOptions, onIplStationChange, onIplFieldSave,
    setIplLogisticsGroup, setIplDeleteTarget, openPartEdit,
    setFormMode, setEditId, setEditIds, setDeleteTarget,
    saveBreakdown, saveIplLogistics, breakdownSaving, iplSaving
  } = data

  return (
    <div className="card-industrial relative overflow-hidden">
      {perModel && (loading || iplRefreshing) && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5 bg-slate-800">
          <div className="h-full w-full animate-pulse bg-cyan-400/90" />
        </div>
      )}
      {perModel && compareMode ? (
        <IplModelCompareTable
          openTabs={openTabsActive}
          itemsByModel={compareItemsByModel}
          loading={loading && compareItemsByModel.size === 0}
          canUpdate={canUpdate}
          onEditPart={partId => void openPartEditById(partId)}
        />
      ) : (
        <ExportableTable filename="bom-parts" title={t('bom.title')} rowCount={pagedGroups.length}>
          <table className="bom-parts-table">
            <colgroup>
              {rowColumns.map(c => (
                <col key={c} style={{ width: colWidths[c as keyof typeof colWidths] }} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-slate-800">
                {rowColumns.map(c => {
                  if (c === 'actions') {
                    return (
                      <th key={c}>
                        <span className="bom-th-label">{t('common.actions')}</span>
                      </th>
                    )
                  }
                  const compact = BOM_COMPACT_HEADER_COLS.has(c)
                  const fullLabel = t(bomColumnLabelKey(c, false))
                  const headerLabel = compact ? t(bomColumnLabelKey(c, true)) : fullLabel
                  return (
                    <th key={c}>
                      <div className="bom-th-wrap">
                        <span className={`bom-th-label${compact ? ' bom-th-label--compact' : ''}`} title={fullLabel}>
                          {headerLabel}
                        </span>
                        {!perModel && (
                          <ExcelColumnFilter
                            column={c}
                            label={fullLabel}
                            baseFilters={baseFilters}
                            selected={excelFilters[c]}
                            onApply={v => setColumnFilter(c, v)}
                          />
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {loading && pagedGroups.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="text-slate-400">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : pagedGroups.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="text-slate-400">
                    {t('bom.noModelBom')}
                  </td>
                </tr>
              ) : (
                pagedGroups.map(group => (
                  <BomGroupedTableRow
                    key={group.key}
                    group={group}
                    models={models}
                    stations={stations}
                    expanded={expandedKeys.has(group.key)}
                    onToggle={() => toggleExpanded(group.key)}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                    iplModelMode={perModel}
                    stationOptions={perModel ? stationOptions : undefined}
                    onStationChange={perModel && canUpdate ? onIplStationChange : undefined}
                    onIplFieldSave={perModel && canUpdate ? onIplFieldSave : undefined}
                    onOpenFeeding={perModel ? g => setIplLogisticsGroup(g) : undefined}
                    onDeleteRow={perModel && canDelete ? g => setIplDeleteTarget(g) : undefined}
                    onEdit={() => {
                      if (perModel) {
                        void openPartEdit(group)
                        return
                      }
                      setFormMode('edit')
                      setEditId(group.primary.id)
                      setEditIds(group.allIds)
                    }}
                    onEditVariant={id => {
                      setFormMode('edit')
                      setEditId(id)
                      setEditIds([id])
                    }}
                    onDeleteVariant={v => setDeleteTarget({ group, variant: { id: v.id, modelName: v.modelName } })}
                    onSaveBreakdown={canUpdate ? saveBreakdown : undefined}
                    onSaveIplLogistics={canUpdate ? saveIplLogistics : undefined}
                    breakdownSaving={breakdownSaving}
                    iplSaving={iplSaving}
                  />
                ))
              )}
            </tbody>
          </table>
        </ExportableTable>
      )}
    </div>
  )
}
