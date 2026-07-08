import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCcw, Search, X, Layers, Car } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { usePermissions } from '../../Context/PermissionsContext'
import { useAuth } from '../../Context/AuthContext'
import { getVehicleModels, getStations } from '../../services/settingsService'
import { deleteBomItem, deactivateBomItemsForPartModel, ensureBomLineForPart, getBomItemById, getBomItemsAll, getBomItemsForPartIds, saveBomFromModelCards, updateBomIplFeedingCard, updateBomItemStationForPart, updateIplModelLine, type BomExcelColumnFilters, type BomListFilters } from '../../services/bomService'
import { getPartById, getT4cIplStationOptions, listPartsForIplModel, updatePartMaster, type PartListStationOption } from '../../services/partsService'
import { parseApplicableModelNames } from '../../Utils/bomQtyByModel'
import { mergePartToBomItem } from '../../Utils/iplModelParts'
import { BOM_IPL_MODEL_ROW_COLUMNS, BOM_IPL_TABLE_COL_WIDTH, BOM_MAIN_ROW_COLUMNS, BOM_TABLE_COL_WIDTH } from '../../Utils/bomPartsColumns'
import { bomColumnLabelKey, BOM_COMPACT_HEADER_COLS } from '../../Utils/bomColumnHeader'
import { groupBomItemsForDisplay, bomItemsAsFlatGroups, type BomDisplayGroup } from '../../Utils/bomRowGroups'
import {
  bomRowsByModelName,
  buildBreakdownSaveCards,
  cardsCanConsolidate,
  familyIdForModel
} from '../../Utils/bomModelCards'
import { bomModelBreakdownLines, type BomModelLineDraft } from '../../Utils/bomModelBreakdown'
import { effectiveBomStopperType } from '../../Utils/bomStopper'
import { buildModelFamilyGroups, isAssignableModel } from '../../Utils/vehicleModelHierarchy'
import { filterBomItemsByLineScope, filterModelFamilyPicker, type BomLineScope } from '../../Utils/bomModelScope'
import { masterStationsForBom, normalizeBomStationCodeText, sortBomDisplayGroups } from '../../Utils/bomStationCode'
import { formatStationReferenceCode } from '../../Utils/stationHierarchy'
import { BomGroupedTableRow } from './BomGroupedTableRow'
import { ExportableTable } from '../ExportableTable'
import type { BomFilterColumn } from '../../Utils/bomFilterFields'
import { BomFormModal } from './BomFormModal'
import { BomPartListFormModal, type PartListFormState } from './BomPartListFormModal'
import { BomIplLogisticsModal } from './BomIplLogisticsModal'
import { ExcelColumnFilter } from './ExcelColumnFilter'
import { ConfirmDialog } from '../ConfirmDialog'
import { inputCls } from '../FormField'
import type { BomItemDetail, Part } from '../../Types/bom'
import type { BomIplFeedingCard } from '../../Utils/iplBomLogistics'
import type { VehicleModel, Station } from '../../Types/settings'

const PAGE_SIZE = 100

const emptyPartForm = (): PartListFormState => ({
  common_station: '',
  part_name_ar: '',
  part_name_en: '',
  common_name: '',
  model_names: []
})

export function BomByModelTab({
  notify,
  lineScope = 'main',
  viewMode = 'consolidated'
}: {
  notify: (m: string, err?: boolean) => void
  lineScope?: BomLineScope
  /** consolidated = مجمع عبر الموديلات · perModel = IPL موديل واحد */
  viewMode?: 'consolidated' | 'perModel'
}) {
  const { t } = useLang()
  const { hasRole } = useAuth()
  const { hasPermission } = usePermissions()
  const canCreate = hasRole('admin') || hasPermission('bom', 'create')
  const canUpdate = hasRole('admin') || hasPermission('bom', 'update')
  const canDelete = hasRole('admin') || hasPermission('bom', 'delete') || canUpdate

  const [models, setModels] = useState<VehicleModel[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [modelName, setModelName] = useState('')
  const [stationId, setStationId] = useState('')
  const [search, setSearch] = useState('')
  const [stopperType, setStopperType] = useState('')
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
  const [deleteTarget, setDeleteTarget] = useState<
    { group: BomDisplayGroup; variant?: { id: string; modelName: string } } | null
  >(null)
  const [deleting, setDeleting] = useState(false)
  const [breakdownSaving, setBreakdownSaving] = useState(false)
  const [iplSaving, setIplSaving] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  const [stationOptions, setStationOptions] = useState<PartListStationOption[]>([])
  const [partFormOpen, setPartFormOpen] = useState(false)
  const [partEditId, setPartEditId] = useState<string | null>(null)
  const [partForm, setPartForm] = useState<PartListFormState>(emptyPartForm)
  const [partFormBusy, setPartFormBusy] = useState(false)
  const [iplLogisticsGroup, setIplLogisticsGroup] = useState<BomDisplayGroup | null>(null)
  const [iplDeleteTarget, setIplDeleteTarget] = useState<BomDisplayGroup | null>(null)
  const [partsCache, setPartsCache] = useState<Map<string, Part>>(new Map())

  const perModel = viewMode === 'perModel'
  const modelPicker = useMemo(() => filterModelFamilyPicker(buildModelFamilyGroups(models), lineScope), [models, lineScope])
  const masterStations = useMemo(() => masterStationsForBom(stations), [stations])
  const scopedItems = useMemo(() => filterBomItemsByLineScope(items, lineScope), [items, lineScope])
  const displayGroups = useMemo(
    () =>
      sortBomDisplayGroups(
        perModel ? bomItemsAsFlatGroups(scopedItems) : groupBomItemsForDisplay(scopedItems),
        stations
      ),
    [scopedItems, stations, perModel]
  )
  const pagedGroups = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return displayGroups.slice(start, start + PAGE_SIZE)
  }, [displayGroups, page])
  const groupTotal = displayGroups.length

  const rowColumns = perModel ? BOM_IPL_MODEL_ROW_COLUMNS : BOM_MAIN_ROW_COLUMNS
  const colWidths = perModel ? BOM_IPL_TABLE_COL_WIDTH : BOM_TABLE_COL_WIDTH
  const colCount = rowColumns.length

  const baseFilters = useMemo((): Omit<BomListFilters, 'page' | 'pageSize'> => {
    const f: Omit<BomListFilters, 'page' | 'pageSize'> = { search, excel: excelFilters }
    if (modelName) f.modelName = modelName
    if (stationId) {
      const st = masterStations.find(s => s.id === stationId)
      f.stationId = stationId
      if (st) f.stationNumber = normalizeBomStationCodeText(st.station_number)
    }
    if (stopperType) f.stopperType = stopperType as BomListFilters['stopperType']
    if (noOperationOnly) f.noOperationOnly = true
    return f
  }, [search, modelName, stationId, masterStations, excelFilters, stopperType, noOperationOnly])

  const activeExcelFilterCount = Object.values(excelFilters).filter(v => v && v.length > 0).length

  const load = useCallback(async () => {
    if (perModel && !modelName) {
      setItems([])
      setTotal(0)
      setFilteredCount(0)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      if (perModel) {
        const st = stationId ? masterStations.find(s => s.id === stationId) : undefined
        const stationCode = st ? normalizeBomStationCodeText(st.station_number) : undefined
        const partsRes = await listPartsForIplModel({
          modelName,
          search,
          stationCode,
          page,
          pageSize: PAGE_SIZE
        })
        const bomMap = await getBomItemsForPartIds(
          partsRes.items.map(p => p.id),
          modelName
        )
        const merged = partsRes.items.map(p => mergePartToBomItem(p, bomMap.get(p.id), modelName))
        setPartsCache(new Map(partsRes.items.map(p => [p.id, p])))
        setItems(merged)
        setTotal(partsRes.total)
        setFilteredCount(partsRes.total)
      } else {
        const list = await getBomItemsAll(baseFilters)
        setItems(list.items)
        setTotal(list.total)
        setFilteredCount(list.total)
        if (list.truncated) notify(t('bom.mergeTruncated'), true)
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setLoading(false)
    }
  }, [baseFilters, notify, t, perModel, modelName, search, stationId, masterStations, page])

  useEffect(() => {
    Promise.all([getVehicleModels(), getStations()])
      .then(([m, s]) => {
        setModels(m)
        setStations(s.filter(st => st.is_active))
      })
      .catch(() => notify(t('common.error'), true))
  }, [notify, t])

  useEffect(() => {
    if (!perModel || modelName) return
    const first = modelPicker.groups.flatMap(g => g.variants)[0]
    if (first) setModelName(first.name)
  }, [perModel, modelName, modelPicker])

  useEffect(() => {
    if (!perModel) return
    void getT4cIplStationOptions()
      .then(setStationOptions)
      .catch(() => setStationOptions([]))
  }, [perModel])

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
      if (deleteTarget.variant) {
        await deleteBomItem(deleteTarget.variant.id)
      } else {
        for (const id of deleteTarget.group.allIds) {
          await deleteBomItem(id)
        }
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

  useEffect(() => {
    void load()
  }, [load])

  async function saveIplLogistics(itemIds: string[], card: BomIplFeedingCard) {
    setIplSaving(true)
    try {
      if (perModel && iplLogisticsGroup) {
        const part = partsCache.get(iplLogisticsGroup.primary.part_id) ?? (await getPartById(iplLogisticsGroup.primary.part_id))
        const vehicleModel = models.find(m => m.name === modelName)
        if (!part || !vehicleModel) throw new Error(t('common.error'))
        const bomId = await ensureBomLineForPart(
          part,
          modelName,
          vehicleModel.id,
          iplLogisticsGroup.primary.station_code_text ?? part.common_station
        )
        await updateBomIplFeedingCard([bomId], card)
      } else {
        await updateBomIplFeedingCard(itemIds, card)
      }
      reload(t('settings.updated'))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
      throw e
    } finally {
      setIplSaving(false)
    }
  }

  async function onIplFieldSave(group: BomDisplayGroup, field: 'part_number' | 'qty', value: string) {
    if (!canUpdate || !modelName) return
    const part = partsCache.get(group.primary.part_id) ?? (await getPartById(group.primary.part_id))
    const vehicleModel = models.find(m => m.name === modelName)
    if (!part || !vehicleModel) return
    try {
      if (field === 'part_number') {
        await updateIplModelLine(part, modelName, vehicleModel.id, { part_number: value })
      } else {
        const quantity = Number(value)
        if (!Number.isFinite(quantity) || quantity <= 0) return
        await updateIplModelLine(part, modelName, vehicleModel.id, { quantity })
      }
      reload(t('settings.updated'))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    }
  }

  async function onIplStationChange(group: BomDisplayGroup, stationCode: string) {
    if (!canUpdate || !modelName) return
    const part = partsCache.get(group.primary.part_id) ?? (await getPartById(group.primary.part_id))
    const vehicleModel = models.find(m => m.name === modelName)
    if (!part || !vehicleModel) return
    const station = masterStations.find(s => normalizeBomStationCodeText(s.station_number) === stationCode)
    try {
      await updateBomItemStationForPart(part, modelName, vehicleModel.id, stationCode, station?.id ?? null)
      reload(t('settings.updated'))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    }
  }

  async function openPartEdit(group: BomDisplayGroup) {
    const part = partsCache.get(group.primary.part_id) ?? (await getPartById(group.primary.part_id))
    if (!part) return
    const stored = parseApplicableModelNames(part.applicable_models_text)
    setPartEditId(part.id)
    setPartForm({
      common_station: part.common_station ?? '',
      part_name_ar: part.part_name_ar ?? '',
      part_name_en: part.part_name_en ?? '',
      common_name: part.common_name ?? part.part_name_ar ?? part.part_name_en ?? '',
      model_names: stored
    })
    setPartFormOpen(true)
  }

  async function submitPartForm() {
    if (!partEditId) return
    setPartFormBusy(true)
    try {
      await updatePartMaster(partEditId, {
        common_station: partForm.common_station,
        part_name_ar: partForm.part_name_ar,
        part_name_en: partForm.part_name_en,
        common_name: partForm.common_name,
        model_names: partForm.model_names
      })
      setPartFormOpen(false)
      reload(t('settings.updated'))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setPartFormBusy(false)
    }
  }

  async function confirmIplDelete() {
    if (!iplDeleteTarget || !modelName) return
    setDeleting(true)
    try {
      const partId = iplDeleteTarget.primary.part_id
      const part = partsCache.get(partId) ?? (await getPartById(partId))
      if (part) {
        const next = parseApplicableModelNames(part.applicable_models_text).filter(
          n => n.trim().toUpperCase() !== modelName.trim().toUpperCase()
        )
        await updatePartMaster(partId, {
          common_station: part.common_station,
          part_name_ar: part.part_name_ar,
          part_name_en: part.part_name_en,
          common_name: part.common_name,
          model_names: next
        })
      }
      await deactivateBomItemsForPartModel(partId, modelName)
      setIplDeleteTarget(null)
      reload(t('settings.deleted'))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setDeleting(false)
    }
  }

  async function saveBreakdown(group: BomDisplayGroup, draftByModel: Record<string, BomModelLineDraft>) {
    setBreakdownSaving(true)
    try {
      const rows = (
        await Promise.all(group.allIds.map(id => getBomItemById(id)))
      ).filter((r): r is NonNullable<typeof r> => Boolean(r))
      if (rows.length === 0) throw new Error(t('common.error'))

      const { familyIds, cards } = buildBreakdownSaveCards(models, group, rows, draftByModel, stations)
      const active = cards.filter(c => {
        const q = Number(c.qty)
        return c.part_number.trim() && c.modelId && Number.isFinite(q) && q > 0
      })
      if (active.length === 0) throw new Error(t('bom.breakdownNoActive'))

      const row = rows[0]
      const names = {
        part_name_ar: row.part_name_ar ?? undefined,
        part_name_en: row.part_name_en ?? undefined,
        notes: row.notes ?? undefined,
        stopper_type: effectiveBomStopperType(row)
      }

      const usedIds = new Set<string>()
      const rowByModel = bomRowsByModelName(models, rows)

      if (cardsCanConsolidate(active)) {
        const id = await saveBomFromModelCards(group.primary.id, familyIds, cards, names, models)
        usedIds.add(id)
      } else {
        for (const card of active) {
          const existing = rowByModel.get(card.modelName)
          const editId =
            existing?.id && !usedIds.has(existing.id) ? existing.id : usedIds.size === 0 ? group.primary.id : undefined
          const famId = familyIdForModel(models, card.modelId)
          const id = await saveBomFromModelCards(
            editId,
            famId ? [famId] : familyIds,
            [card],
            names,
            models
          )
          usedIds.add(id)
        }
      }

      for (const id of group.allIds) {
        if (!usedIds.has(id)) await deleteBomItem(id)
      }

      reload(t('settings.updated'))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
      throw e
    } finally {
      setBreakdownSaving(false)
    }
  }

  const selectedName = modelName || t('bom.allModels')

  return (
    <div className="space-y-4">
      {perModel && (
        <div className="card-industrial p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-orange-500/15 p-3 text-orange-300">
              <Car className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{t('bom.tabs.iplModels')}</h3>
              <p className="text-sm text-slate-400">{t('bom.iplModelsHint')}</p>
            </div>
          </div>
        </div>
      )}
      {viewMode === 'consolidated' && lineScope === 'main' && (
        <div className="card-industrial p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{t('bom.tabs.consolidated')}</h3>
              <p className="text-sm text-slate-400">{t('bom.consolidatedHint')}</p>
            </div>
          </div>
        </div>
      )}
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
              {!perModel && <option value="">{t('bom.allModels')}</option>}
              {perModel && !modelName && (
                <option value="">{t('bom.selectModel')}</option>
              )}
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
            <span className="mb-1 block text-[10px] font-bold uppercase text-cyan-300">{t('bom.filterStation')}</span>
            <select
              className={inputCls()}
              value={stationId}
              onChange={e => {
                setStationId(e.target.value)
                setPage(1)
              }}
            >
              <option value="">{t('bom.allStations')}</option>
              {masterStations.map(s => (
                <option key={s.id} value={s.id}>
                  {formatStationReferenceCode(s.station_number)} — {s.station_name}
                </option>
              ))}
            </select>
          </label>
          {!perModel && (
          <>
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
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm text-slate-300">
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
          </>
          )}
        </div>

        <p className="mt-3 border-t border-slate-800/80 pt-3 text-xs text-slate-500">
          {modelName
            ? t('bom.modelBomSummary', { model: selectedName, n: filteredCount ?? 0, shown: groupTotal })
            : lineScope === 'gd'
              ? t('bom.gdBomSummary', { n: filteredCount ?? total, shown: groupTotal })
              : t('bom.allBomSummary', { n: filteredCount ?? total, shown: groupTotal })}
          {activeExcelFilterCount > 0 && (
            <span className="ms-2 text-cyan-400">· {t('bom.excel.filtersActive', { n: activeExcelFilterCount })}</span>
          )}
        </p>
      </div>

      <div className="card-industrial overflow-hidden">
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
                <th
                  key={c}
                >
                  <div className="bom-th-wrap">
                    <span
                      className={`bom-th-label${compact ? ' bom-th-label--compact' : ''}`}
                      title={fullLabel}
                    >
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
              )})}
            </tr>
          </thead>
          <tbody>
            {loading ? (
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
      </div>

      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>
          {t('bom.mergedRowCount', { rows: total, groups: groupTotal })}
        </span>
        <div className="flex gap-2">
          <button type="button" disabled={page <= 1} className="rounded-lg bg-slate-800 px-3 py-1 font-bold disabled:opacity-40" onClick={() => setPage(p => p - 1)}>
            {t('common.back')}
          </button>
          <span className="px-2 py-1">{page}</span>
          <button type="button" disabled={page * PAGE_SIZE >= groupTotal} className="rounded-lg bg-slate-800 px-3 py-1 font-bold disabled:opacity-40" onClick={() => setPage(p => p + 1)}>
            {t('common.next')}
          </button>
        </div>
      </div>

      <BomIplLogisticsModal
        open={Boolean(iplLogisticsGroup)}
        group={iplLogisticsGroup}
        canUpdate={canUpdate}
        saving={iplSaving}
        onClose={() => setIplLogisticsGroup(null)}
        onSave={saveIplLogistics}
      />

      <BomPartListFormModal
        open={partFormOpen}
        editId={partEditId}
        form={partForm}
        busy={partFormBusy}
        onClose={() => setPartFormOpen(false)}
        onSave={() => void submitPartForm()}
        onChange={setPartForm}
      />

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
        open={Boolean(iplDeleteTarget)}
        title={t('bom.iplRemoveFromModelTitle')}
        message={t('bom.iplRemoveFromModelConfirm', {
          name: iplDeleteTarget?.summary.part_name_ar || iplDeleteTarget?.summary.part_name_en || '',
          model: modelName
        })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        busy={deleting}
        onConfirm={() => void confirmIplDelete()}
        onCancel={() => setIplDeleteTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('bom.deleteRow')}
        message={
          deleteTarget
            ? deleteTarget.variant
              ? `${deleteTarget.group.summary.part_number} — ${deleteTarget.variant.modelName}`
              : `${deleteTarget.group.summary.part_number} — ${deleteTarget.group.summary.applicable_models_text || deleteTarget.group.summary.part_name_ar || ''}${
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
