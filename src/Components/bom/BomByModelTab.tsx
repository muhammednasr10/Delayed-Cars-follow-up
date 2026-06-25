import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCcw, Search, X } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { usePermissions } from '../../Context/PermissionsContext'
import { useAuth } from '../../Context/AuthContext'
import { getVehicleModels } from '../../services/settingsService'
import { deleteBomItem, getBomItems, type BomExcelColumnFilters, type BomListFilters } from '../../services/bomService'
import { BOM_PARTS_DISPLAY_COLUMNS, BOM_TABLE_COL_WIDTH } from '../../Utils/bomPartsColumns'
import { groupBomItemsForDisplay, type BomDisplayGroup } from '../../Utils/bomRowGroups'
import { buildModelFamilyGroups, isAssignableModel } from '../../Utils/vehicleModelHierarchy'
import { BomGroupedTableRow } from './BomGroupedTableRow'
import type { BomFilterColumn } from '../../Utils/bomFilterFields'
import { BomFormModal } from './BomFormModal'
import { ExcelColumnFilter } from './ExcelColumnFilter'
import { ConfirmDialog } from '../ConfirmDialog'
import { inputCls } from '../FormField'
import type { BomItemDetail } from '../../Types/bom'
import type { VehicleModel } from '../../Types/settings'

const PAGE_SIZE = 100

export function BomByModelTab({ notify }: { notify: (m: string, err?: boolean) => void }) {
  const { t } = useLang()
  const { hasRole } = useAuth()
  const { hasPermission } = usePermissions()
  const canCreate = hasRole('admin') || hasPermission('bom', 'create')
  const canUpdate = hasRole('admin') || hasPermission('bom', 'update')
  const canDelete = hasRole('admin') || hasPermission('bom', 'delete') || canUpdate

  const [models, setModels] = useState<VehicleModel[]>([])
  const [modelName, setModelName] = useState('')
  const [search, setSearch] = useState('')
  const [stopperType, setStopperType] = useState('')
  const [criticalOnly, setCriticalOnly] = useState(false)
  const [noOperationOnly, setNoOperationOnly] = useState(false)
  const [excelFilters, setExcelFilters] = useState<BomExcelColumnFilters>({})
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<BomItemDetail[]>([])
  const [total, setTotal] = useState(0)
  const [filteredCount, setFilteredCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editIds, setEditIds] = useState<string[]>([])
  const [deleteTarget, setDeleteTarget] = useState<{ group: BomDisplayGroup } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  const modelPicker = useMemo(() => buildModelFamilyGroups(models), [models])
  const displayGroups = useMemo(() => groupBomItemsForDisplay(items), [items])

  const colCount = BOM_PARTS_DISPLAY_COLUMNS.length + (canUpdate || canDelete ? 1 : 0)

  const baseFilters = useMemo((): Omit<BomListFilters, 'page' | 'pageSize'> => {
    const f: Omit<BomListFilters, 'page' | 'pageSize'> = { search, excel: excelFilters }
    if (modelName) f.modelName = modelName
    if (stopperType) f.stopperType = stopperType as BomListFilters['stopperType']
    if (criticalOnly) f.isCriticalOnly = true
    if (noOperationOnly) f.noOperationOnly = true
    return f
  }, [search, modelName, excelFilters, stopperType, criticalOnly, noOperationOnly])

  const activeExcelFilterCount = Object.values(excelFilters).filter(v => v && v.length > 0).length

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await getBomItems({ ...baseFilters, page, pageSize: PAGE_SIZE })
      setItems(list.items)
      setTotal(list.total)
      setFilteredCount(list.total)
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setLoading(false)
    }
  }, [baseFilters, page, notify, t])

  useEffect(() => {
    getVehicleModels()
      .then(setModels)
      .catch(() => notify(t('common.error'), true))
  }, [notify, t])

  useEffect(() => {
    void load()
  }, [load])

  function reload(msg?: string) {
    void load().then(() => {
      if (msg) notify(msg)
    })
  }

  function setColumnFilter(col: BomFilterColumn, values: string[] | undefined) {
    setExcelFilters(prev => {
      const next = { ...prev }
      if (!values) delete next[col]
      else next[col] = values
      return next
    })
    setPage(1)
  }

  function clearAllExcelFilters() {
    setExcelFilters({})
    setPage(1)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      for (const id of deleteTarget.group.allIds) {
        await deleteBomItem(id)
      }
      setDeleteTarget(null)
      reload(t('settings.deleted'))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setDeleting(false)
    }
  }

  function toggleExpanded(key: string) {
    setExpandedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectedName = modelName || t('bom.allModels')

  return (
    <div className="space-y-4">
      <div className="card-industrial p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">{t('bom.search')}</span>
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              className={`${inputCls()} w-full ps-9`}
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder={t('bom.searchPh')}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
            {activeExcelFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllExcelFilters}
                className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200"
              >
                <X className="inline h-3 w-3" /> {t('bom.excel.clearAllFilters', { n: activeExcelFilterCount })}
              </button>
            )}
            <button
              type="button"
              onClick={() => reload()}
              className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
            >
              <RefreshCcw className="inline h-4 w-4" /> {t('common.refresh')}
            </button>
            {canCreate && (
              <button
                type="button"
                onClick={() => {
                  setFormMode('create')
                  setEditId(null)
                  setEditIds([])
                }}
                className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400"
              >
                <Plus className="inline h-4 w-4" /> {t('bom.addRow')}
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-800/80 pt-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase text-violet-300">{t('bom.filterModel')}</span>
            <select
              className={inputCls()}
              value={modelName}
              onChange={e => {
                setModelName(e.target.value)
                setPage(1)
              }}
            >
              <option value="">{t('bom.allModels')}</option>
              {modelPicker.groups.map(g => (
                <optgroup key={g.family.id} label={g.family.name}>
                  {g.variants.filter(isAssignableModel).map(m => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </optgroup>
              ))}
              {modelPicker.orphanVariants.filter(isAssignableModel).map(m => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">{t('bom.stopperType')}</span>
            <select
              className={inputCls()}
              value={stopperType}
              onChange={e => {
                setStopperType(e.target.value)
                setPage(1)
              }}
            >
              <option value="">{t('common.all')}</option>
              <option value="line_stopper">{t('bom.stopperLine')}</option>
              <option value="car_stopper">{t('bom.stopperCar')}</option>
              <option value="non_stopper">{t('bom.stopperNone')}</option>
            </select>
          </label>
          <div className="flex flex-wrap items-end gap-x-5 gap-y-2 sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                className="rounded border-slate-600"
                checked={criticalOnly}
                onChange={e => {
                  setCriticalOnly(e.target.checked)
                  setPage(1)
                }}
              />
              {t('bom.criticalOnly')}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                className="rounded border-slate-600"
                checked={noOperationOnly}
                onChange={e => {
                  setNoOperationOnly(e.target.checked)
                  setPage(1)
                }}
              />
              {t('bom.noOperationOnly')}
            </label>
          </div>
        </div>

        <p className="mt-3 border-t border-slate-800/80 pt-3 text-xs text-slate-500">
          {modelName
            ? t('bom.modelBomSummary', { model: selectedName, n: filteredCount ?? 0, shown: total })
            : t('bom.allBomSummary', { n: filteredCount ?? total, shown: total })}
          {activeExcelFilterCount > 0 && (
            <span className="ms-2 text-cyan-400">· {t('bom.excel.filtersActive', { n: activeExcelFilterCount })}</span>
          )}
        </p>
      </div>

      <div className="card-industrial overflow-hidden">
        <table className="bom-parts-table">
          <colgroup>
            {BOM_PARTS_DISPLAY_COLUMNS.map(c => (
              <col key={c} style={{ width: BOM_TABLE_COL_WIDTH[c] }} />
            ))}
            {(canUpdate || canDelete) && <col className="bom-actions-col" />}
          </colgroup>
          <thead>
            <tr className="border-b border-slate-800">
              {BOM_PARTS_DISPLAY_COLUMNS.map(c => (
                <th
                  key={c}
                  className={c === 'qty_by_model' ? 'text-center' : ''}
                >
                  <div className="flex items-start justify-between gap-0.5">
                    <span className="min-w-0 leading-tight">
                      {c === 'vehicle_model' ? t('bom.model') : t(`bom.col.${c}`)}
                    </span>
                    <ExcelColumnFilter
                      column={c}
                      label={c === 'vehicle_model' ? t('bom.model') : t(`bom.col.${c}`)}
                      baseFilters={baseFilters}
                      selected={excelFilters[c]}
                      onApply={v => setColumnFilter(c, v)}
                    />
                  </div>
                </th>
              ))}
              {(canUpdate || canDelete) && (
                <th className="bom-actions-col text-center">{t('common.actions')}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colCount} className="text-slate-400">
                  {t('common.loading')}
                </td>
              </tr>
            ) : displayGroups.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="text-slate-400">
                  {t('bom.noModelBom')}
                </td>
              </tr>
            ) : (
              displayGroups.map(group => (
                <BomGroupedTableRow
                  key={group.key}
                  group={group}
                  expanded={expandedKeys.has(group.key)}
                  onToggle={() => toggleExpanded(group.key)}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  onEdit={() => {
                    setFormMode('edit')
                    setEditId(group.primary.id)
                    setEditIds(group.allIds)
                  }}
                  onDelete={() => setDeleteTarget({ group })}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>{t('bom.rowCount', { n: total })}</span>
        <div className="flex gap-2">
          <button type="button" disabled={page <= 1} className="rounded-lg bg-slate-800 px-3 py-1 font-bold disabled:opacity-40" onClick={() => setPage(p => p - 1)}>
            {t('common.back')}
          </button>
          <span className="px-2 py-1">{page}</span>
          <button type="button" disabled={page * PAGE_SIZE >= total} className="rounded-lg bg-slate-800 px-3 py-1 font-bold disabled:opacity-40" onClick={() => setPage(p => p + 1)}>
            {t('common.next')}
          </button>
        </div>
      </div>

      <BomFormModal
        mode={formMode === 'create' ? 'create' : 'edit'}
        itemId={editId}
        editItemIds={editIds.length > 1 ? editIds : undefined}
        open={formMode != null}
        defaultVehicleModelId={models.find(m => m.name === modelName)?.id || undefined}
        onClose={() => {
          setFormMode(null)
          setEditId(null)
          setEditIds([])
        }}
        onSaved={() => reload(t('settings.updated'))}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('bom.deleteRow')}
        message={
          deleteTarget
            ? `${deleteTarget.group.summary.part_number} — ${deleteTarget.group.summary.applicable_models_text || deleteTarget.group.summary.part_name_ar || ''}${
                deleteTarget.group.allIds.length > 1
                  ? ` (${t('bom.deleteGroupHint', { n: deleteTarget.group.allIds.length })})`
                  : ''
              }`
            : ''
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
