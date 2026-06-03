import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, RefreshCcw, Search, Trash2, X } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { usePermissions } from '../../Context/PermissionsContext'
import { useAuth } from '../../Context/AuthContext'
import { getVehicleModels } from '../../services/settingsService'
import { deleteBomItem, getBomCountForModel, getBomItems, type BomExcelColumnFilters, type BomListFilters } from '../../services/bomService'
import { BOM_PARTS_DISPLAY_COLUMNS, T4_VARIANT_MODELS } from '../../Utils/bomPartsColumns'
import { bomPartsCellValue } from '../../Utils/bomPartsCellValue'
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
  const [modelId, setModelId] = useState('')
  const [search, setSearch] = useState('')
  const [excelFilters, setExcelFilters] = useState<BomExcelColumnFilters>({})
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<BomItemDetail[]>([])
  const [total, setTotal] = useState(0)
  const [filteredCount, setFilteredCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BomItemDetail | null>(null)
  const [deleting, setDeleting] = useState(false)

  const t4Models = useMemo(
    () => models.filter(m => T4_VARIANT_MODELS.some(v => m.name.toUpperCase() === v)),
    [models]
  )

  const showModelCol = !modelId

  const baseFilters = useMemo((): Omit<BomListFilters, 'page' | 'pageSize'> => {
    const f: Omit<BomListFilters, 'page' | 'pageSize'> = { search, excel: excelFilters }
    if (modelId) f.vehicleModelId = modelId
    return f
  }, [search, modelId, excelFilters])

  const activeExcelFilterCount = Object.values(excelFilters).filter(v => v && v.length > 0).length

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await getBomItems({ ...baseFilters, page, pageSize: PAGE_SIZE })
      setItems(list.items)
      setTotal(list.total)
      if (modelId) setFilteredCount(await getBomCountForModel(modelId))
      else setFilteredCount(list.total)
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setLoading(false)
    }
  }, [baseFilters, page, modelId, notify, t])

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
      await deleteBomItem(deleteTarget.id)
      setDeleteTarget(null)
      reload(t('settings.deleted'))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setDeleting(false)
    }
  }

  const selectedName = modelId ? models.find(m => m.id === modelId)?.name ?? '' : t('bom.allModels')

  return (
    <div className="space-y-4">
      <div className="card-industrial space-y-3 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase text-violet-300">{t('bom.filterModel')}</span>
              <select
                className={inputCls()}
                value={modelId}
                onChange={e => {
                  setModelId(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">{t('bom.allModels')}</option>
                {models.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">{t('bom.search')}</span>
              <div className="relative">
                <Search className="absolute start-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  className={`${inputCls()} ps-9`}
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder={t('bom.searchPh')}
                />
              </div>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeExcelFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllExcelFilters}
                className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200"
              >
                <X className="inline h-3 w-3" /> {t('bom.excel.clearAllFilters', { n: activeExcelFilterCount })}
              </button>
            )}
            <button type="button" onClick={() => reload()} className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700">
              <RefreshCcw className="inline h-4 w-4" /> {t('common.refresh')}
            </button>
            {canCreate && (
              <button
                type="button"
                onClick={() => {
                  setFormMode('create')
                  setEditId(null)
                }}
                className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400"
              >
                <Plus className="inline h-4 w-4" /> {t('bom.addRow')}
              </button>
            )}
          </div>
        </div>

        {t4Models.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase text-cyan-400">{t('bom.t4QuickFilter')}</span>
            <button
              type="button"
              onClick={() => {
                setModelId('')
                setPage(1)
              }}
              className={`rounded-lg px-3 py-1 text-xs font-bold ${!modelId ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
            >
              T4 {t('bom.all')}
            </button>
            {t4Models.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setModelId(m.id)
                  setPage(1)
                }}
                className={`rounded-lg px-3 py-1 text-xs font-bold ${modelId === m.id ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
              >
                {m.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-sm text-slate-400">
        {modelId
          ? t('bom.modelBomSummary', { model: selectedName, n: filteredCount ?? 0, shown: total })
          : t('bom.allBomSummary', { n: filteredCount ?? total, shown: total })}
        {activeExcelFilterCount > 0 && (
          <span className="ms-2 text-cyan-400">· {t('bom.excel.filtersActive', { n: activeExcelFilterCount })}</span>
        )}
      </p>

      <div className="card-industrial overflow-x-auto">
        <table className="w-full min-w-[1200px] text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-500">
              {showModelCol && (
                <th className="table-cell whitespace-nowrap">
                  <div className="flex items-center justify-between gap-1">
                    <span>{t('bom.model')}</span>
                    <ExcelColumnFilter
                      column="vehicle_model"
                      label={t('bom.model')}
                      baseFilters={baseFilters}
                      selected={excelFilters.vehicle_model}
                      onApply={v => setColumnFilter('vehicle_model', v)}
                    />
                  </div>
                </th>
              )}
              {BOM_PARTS_DISPLAY_COLUMNS.map(c => (
                <th key={c} className="table-cell whitespace-nowrap">
                  <div className="flex items-center justify-between gap-1">
                    <span>{t(`bom.col.${c}`)}</span>
                    <ExcelColumnFilter
                      column={c}
                      label={t(`bom.col.${c}`)}
                      baseFilters={baseFilters}
                      selected={excelFilters[c]}
                      onApply={v => setColumnFilter(c, v)}
                    />
                  </div>
                </th>
              ))}
              {(canUpdate || canDelete) && <th className="table-cell sticky end-0 bg-slate-950">{t('common.actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={BOM_PARTS_DISPLAY_COLUMNS.length + (showModelCol ? 1 : 0) + 1} className="table-cell text-slate-400">
                  {t('common.loading')}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={BOM_PARTS_DISPLAY_COLUMNS.length + (showModelCol ? 1 : 0) + 1} className="table-cell text-slate-400">
                  {t('bom.noModelBom')}
                </td>
              </tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="border-b border-slate-800/80 hover:bg-slate-900/50">
                  {showModelCol && (
                    <td className="table-cell font-bold text-violet-200">{row.vehicle_model_name || '—'}</td>
                  )}
                  {BOM_PARTS_DISPLAY_COLUMNS.map(c => (
                    <td
                      key={c}
                      className="table-cell max-w-[220px] truncate text-slate-200"
                      dir={c === 'part_number' || c === 'station_code' || c === 'part_name_en' ? 'ltr' : undefined}
                      title={bomPartsCellValue(row, c)}
                    >
                      {bomPartsCellValue(row, c) || '—'}
                    </td>
                  ))}
                  {(canUpdate || canDelete) && (
                    <td className="table-cell sticky end-0 bg-slate-900/95">
                      <div className="flex gap-1">
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormMode('edit')
                              setEditId(row.id)
                            }}
                            className="rounded-lg bg-orange-500/15 p-2 text-orange-200 hover:bg-orange-500/25"
                            title={t('common.edit')}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(row)}
                            className="rounded-lg bg-red-500/15 p-2 text-red-200 hover:bg-red-500/25"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
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
        open={formMode != null}
        defaultVehicleModelId={modelId || undefined}
        onClose={() => {
          setFormMode(null)
          setEditId(null)
        }}
        onSaved={() => reload(t('settings.updated'))}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('bom.deleteRow')}
        message={
          deleteTarget
            ? `${deleteTarget.part_number} — ${deleteTarget.vehicle_model_name || deleteTarget.applicable_models_text || ''}`
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
