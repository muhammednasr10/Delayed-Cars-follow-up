import { useEffect, useMemo, useState } from 'react'
import { RefreshCcw } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { getIplFeedingParts } from '../../services/warehouseService'
import { buildFeedingModelOptionGroups, firstAssignableModelId } from '../../Utils/iplBomLogistics'
import { normalizeBomStationCodeText } from '../../Utils/bomStationCode'
import {
  defaultFeedingWarehouseType,
  FEEDING_WAREHOUSE_TYPES,
  feedingWarehouseTypeLabel,
  resolveWarehouseIdForType,
  type FeedingWarehouseType
} from '../../Utils/feedingWarehouseType'
import type { Warehouse } from '../../Types/warehouse'
import type { Station, VehicleModel } from '../../Types/settings'
import { iplPlanRowFromIpl, type IplPlanDraftRow } from './feedingShared'

type Props = {
  warehouses: Warehouse[]
  models: VehicleModel[]
  stations: Station[]
  warehouseId: string
  warehouseType: FeedingWarehouseType
  variantId: string
  stationId: string
  plannedDate: string
  notes: string
  iplRows: IplPlanDraftRow[]
  iplLoading: boolean
  onWarehouseId: (v: string) => void
  onWarehouseType: (v: FeedingWarehouseType) => void
  onVariantId: (v: string) => void
  onStationId: (v: string) => void
  onPlannedDate: (v: string) => void
  onNotes: (v: string) => void
  onIplRows: (v: IplPlanDraftRow[] | ((prev: IplPlanDraftRow[]) => IplPlanDraftRow[])) => void
  onIplLoading: (v: boolean) => void
}

export function WarehouseFeedingPlanForm({
  warehouses,
  models,
  stations,
  warehouseId,
  warehouseType,
  variantId,
  stationId,
  plannedDate,
  notes,
  iplRows,
  iplLoading,
  onWarehouseId,
  onWarehouseType,
  onVariantId,
  onStationId,
  onPlannedDate,
  onNotes,
  onIplRows,
  onIplLoading
}: Props) {
  const { t } = useLang()
  const [search, setSearch] = useState('')

  const modelOptionGroups = useMemo(
    () =>
      buildFeedingModelOptionGroups(models, {
        other: t('warehouses.feeding.iplOtherModels'),
        flat: t('warehouses.feeding.pickModel')
      }),
    [models, t]
  )

  const masterStations = useMemo(
    () =>
      stations
        .filter(s => s.is_active && !s.parent_station_id)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.station_number.localeCompare(b.station_number)),
    [stations]
  )

  const selectedModelName = useMemo(
    () => models.find(m => m.id === variantId)?.name ?? '',
    [models, variantId]
  )

  const stationCode = useMemo(() => {
    if (!stationId) return undefined
    const st = masterStations.find(s => s.id === stationId)
    return st ? normalizeBomStationCodeText(st.station_number) : undefined
  }, [stationId, masterStations])

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const base = [...iplRows].sort(
      (a, b) =>
        (a.stationCode ?? '').localeCompare(b.stationCode ?? '') || a.partNumber.localeCompare(b.partNumber)
    )
    if (!term) return base
    return base.filter(
      r =>
        r.partNumber.toLowerCase().includes(term) ||
        r.partName.toLowerCase().includes(term) ||
        (r.stationCode?.toLowerCase().includes(term) ?? false) ||
        r.warehouseTypeLabel.toLowerCase().includes(term) ||
        r.partDirectionLabel.toLowerCase().includes(term) ||
        r.classification.toLowerCase().includes(term)
    )
  }, [iplRows, search])

  const includedCount = useMemo(() => iplRows.filter(r => r.included).length, [iplRows])

  useEffect(() => {
    const resolved = resolveWarehouseIdForType(warehouses, warehouseType)
    if (resolved && resolved !== warehouseId) onWarehouseId(resolved)
  }, [warehouses, warehouseType, warehouseId, onWarehouseId])

  useEffect(() => {
    if (!variantId) {
      onIplRows([])
      return
    }

    let cancelled = false
    onIplLoading(true)
    getIplFeedingParts(
      variantId,
      {
        warehouseId: warehouseId || undefined,
        warehouseType,
        stationCode
      },
      t
    )
      .then(rows => {
        if (!cancelled) onIplRows(rows.map(iplPlanRowFromIpl))
      })
      .catch(() => {
        if (!cancelled) onIplRows([])
      })
      .finally(() => {
        if (!cancelled) onIplLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [variantId, warehouseId, warehouseType, stationCode, t, onIplRows, onIplLoading])

  function setAllIncluded(included: boolean) {
    onIplRows(prev => prev.map(r => ({ ...r, included })))
  }

  function updateRow(bomItemId: string, patch: Partial<IplPlanDraftRow>) {
    onIplRows(prev => prev.map(r => (r.bomItemId === bomItemId ? { ...r, ...patch } : r)))
  }

  function reloadIpl() {
    if (!variantId) return
    onIplLoading(true)
    getIplFeedingParts(
      variantId,
      {
        warehouseId: warehouseId || undefined,
        warehouseType,
        stationCode
      },
      t
    )
      .then(rows => onIplRows(rows.map(iplPlanRowFromIpl)))
      .catch(() => onIplRows([]))
      .finally(() => onIplLoading(false))
  }

  const th = 'whitespace-nowrap px-2 py-2 text-center align-middle text-[10px] font-bold text-slate-400'
  const td = 'whitespace-nowrap px-2 py-1.5 text-center align-middle text-xs text-slate-300'

  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-slate-500">{t('warehouses.feeding.warehouseTypeLabel')}</label>
          <select
            className="input-dark"
            value={warehouseType}
            onChange={e => onWarehouseType(e.target.value as FeedingWarehouseType)}
          >
            {FEEDING_WAREHOUSE_TYPES.map(type => (
              <option key={type} value={type}>
                {feedingWarehouseTypeLabel(type, t)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">{t('warehouses.feeding.plannedDate')}</label>
          <input className="input-dark" type="date" value={plannedDate} onChange={e => onPlannedDate(e.target.value)} />
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-xs text-slate-500">{t('warehouses.feeding.iplPickModel')}</label>
        {modelOptionGroups.length > 0 ? (
          <select className="input-dark" value={variantId} onChange={e => onVariantId(e.target.value)} dir="ltr">
            <option value="">{t('warehouses.feeding.pickModel')}</option>
            {modelOptionGroups.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.models.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        ) : (
          <p className="text-sm text-amber-200">{t('mp.noModelsInSettings')}</p>
        )}
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-xs text-slate-500">{t('warehouses.feeding.station')}</label>
        <select className="input-dark" value={stationId} onChange={e => onStationId(e.target.value)}>
          <option value="">{t('warehouses.feeding.optional')}</option>
          {masterStations.map(s => (
            <option key={s.id} value={s.id}>
              {s.station_number} — {s.station_name}
            </option>
          ))}
        </select>
      </div>

      {variantId && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-black text-white">
              {t('warehouses.feeding.iplTitle', { model: selectedModelName })}
            </h4>
            <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-200">
              {feedingWarehouseTypeLabel(warehouseType, t)}
            </span>
            <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-200">
              {t('warehouses.feeding.iplRowCount', { n: iplRows.length })}
            </span>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
              {t('warehouses.feeding.iplSelectedCount', { n: includedCount })}
            </span>
            <button
              type="button"
              onClick={reloadIpl}
              disabled={iplLoading}
              className="ms-auto flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-xs font-bold text-slate-300 hover:bg-slate-700 disabled:opacity-50"
            >
              <RefreshCcw className={`h-3 w-3 ${iplLoading ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              className="input-dark min-w-[12rem] flex-1"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('warehouses.stock.searchPh')}
            />
            <button
              type="button"
              onClick={() => setAllIncluded(true)}
              className="rounded-lg bg-violet-500/15 px-3 py-1.5 text-xs font-bold text-violet-200 hover:bg-violet-500/25"
            >
              {t('warehouses.feeding.iplSelectAll')}
            </button>
            <button
              type="button"
              onClick={() => setAllIncluded(false)}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-400 hover:bg-slate-700"
            >
              {t('warehouses.feeding.iplSelectNone')}
            </button>
          </div>

          {iplLoading ? (
            <p className="py-6 text-center text-sm text-slate-400">{t('common.loading')}</p>
          ) : iplRows.length === 0 ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              {t('warehouses.feeding.iplEmptyForFilter')}
            </p>
          ) : (
            <div className="max-h-[32rem] overflow-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[96rem] text-sm">
                <thead className="sticky top-0 z-10 bg-slate-950/95">
                  <tr className="border-b border-slate-800">
                    <th className={`${th} w-10`} />
                    <th className={th}>{t('warehouses.feeding.cols.partNo')}</th>
                    <th className={th}>{t('warehouses.feeding.cols.partName')}</th>
                    <th className={th}>{t('warehouses.feeding.cols.qv')}</th>
                    <th className={th}>{t('warehouses.feeding.cols.station')}</th>
                    <th className={th}>{t('warehouses.feeding.cols.warehouseType')}</th>
                    <th className={th}>{t('warehouses.feeding.cols.direction')}</th>
                    <th className={th}>{t('warehouses.feeding.cols.partKind')}</th>
                    <th className={th}>{t('warehouses.feeding.cols.dimensions')}</th>
                    <th className={th}>{t('warehouses.feeding.cols.rackCapacity')}</th>
                    <th className={th}>{t('warehouses.feeding.cols.cartonQty')}</th>
                    <th className={th}>{t('warehouses.feeding.cols.feedingMethod')}</th>
                    <th className={th}>{t('warehouses.feeding.cols.replenFreq')}</th>
                    <th className={th}>{t('warehouses.feeding.cols.reorderPoint')}</th>
                    <th className={th}>{t('warehouses.feeding.qty')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(r => (
                    <tr key={r.bomItemId} className="border-t border-slate-800/80 hover:bg-slate-900/40">
                      <td className={td}>
                        <input
                          type="checkbox"
                          checked={r.included}
                          onChange={e => updateRow(r.bomItemId, { included: e.target.checked })}
                          className="mx-auto block h-4 w-4 rounded border-slate-600"
                        />
                      </td>
                      <td className={`${td} font-mono text-cyan-200/90`} dir="ltr">
                        {r.partNumber}
                      </td>
                      <td className={`${td} max-w-[10rem] truncate text-slate-400`} title={r.partName}>
                        {r.partName}
                      </td>
                      <td className={`${td} text-slate-400`} dir="ltr">
                        {r.qtyPerVehicle}
                      </td>
                      <td className={`${td} font-mono text-cyan-200/70`} dir="ltr">
                        {r.stationCode || '—'}
                      </td>
                      <td className={td}>{r.warehouseTypeLabel}</td>
                      <td className={td}>{r.partDirectionLabel}</td>
                      <td className={td}>{r.partKindLabel}</td>
                      <td className={`${td} text-slate-400`} dir="ltr">
                        {r.dimensions}
                      </td>
                      <td className={`${td} text-slate-400`} dir="ltr">
                        {r.rackCapacity}
                      </td>
                      <td className={`${td} text-slate-400`} dir="ltr">
                        {r.cartonQty}
                      </td>
                      <td className={td}>{r.feedingMethod}</td>
                      <td className={td}>
                        <input
                          className="input-dark mx-auto w-20 text-center text-xs"
                          type="text"
                          disabled={!r.included}
                          value={r.replenishmentFreq}
                          onChange={e => updateRow(r.bomItemId, { replenishmentFreq: e.target.value })}
                          placeholder={t('warehouses.feeding.cols.replenFreq')}
                        />
                      </td>
                      <td className={td}>
                        <input
                          className="input-dark mx-auto w-20 text-center text-xs"
                          type="text"
                          disabled={!r.included}
                          value={r.reorderPoint}
                          onChange={e => updateRow(r.bomItemId, { reorderPoint: e.target.value })}
                          placeholder={t('warehouses.feeding.cols.reorderPoint')}
                        />
                      </td>
                      <td className={td}>
                        <input
                          className="input-dark mx-auto w-16 text-center text-xs"
                          type="number"
                          min={0.001}
                          step="any"
                          disabled={!r.included}
                          value={r.quantity}
                          onChange={e => updateRow(r.bomItemId, { quantity: e.target.value })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="mt-3">
        <label className="mb-1 block text-xs text-slate-500">{t('common.notes')}</label>
        <input className="input-dark" value={notes} onChange={e => onNotes(e.target.value)} />
      </div>
    </>
  )
}

export function useFeedingPlanFormState(warehouses: Warehouse[], models: VehicleModel[] = []) {
  const [warehouseId, setWarehouseId] = useState('')
  const [warehouseType, setWarehouseType] = useState<FeedingWarehouseType>(defaultFeedingWarehouseType())
  const [variantId, setVariantId] = useState('')
  const [stationId, setStationId] = useState('')
  const [plannedDate, setPlannedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [iplRows, setIplRows] = useState<IplPlanDraftRow[]>([])
  const [iplLoading, setIplLoading] = useState(false)

  const defaultVariantId = useMemo(() => firstAssignableModelId(models), [models])

  useEffect(() => {
    if (!warehouseId && warehouses.length > 0) {
      setWarehouseId(resolveWarehouseIdForType(warehouses, warehouseType))
    }
  }, [warehouses, warehouseId, warehouseType])

  useEffect(() => {
    if (!variantId && defaultVariantId) setVariantId(defaultVariantId)
  }, [variantId, defaultVariantId])

  return {
    warehouseId,
    setWarehouseId,
    warehouseType,
    setWarehouseType,
    variantId,
    setVariantId,
    stationId,
    setStationId,
    plannedDate,
    setPlannedDate,
    notes,
    setNotes,
    iplRows,
    setIplRows,
    iplLoading,
    setIplLoading
  }
}
