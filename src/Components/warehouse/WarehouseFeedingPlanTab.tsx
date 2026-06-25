import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Play } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { EmptyState } from '../EmptyState'
import { WarehouseFeedingPlanForm, useFeedingPlanFormState } from './WarehouseFeedingPlanForm'
import { WarehouseIplImportPanel } from './WarehouseIplImportPanel'
import { parseIplPlanLines } from './feedingShared'
import {
  cancelWarehouseFeedingPlan,
  createWarehouseFeedingPlan,
  executeWarehouseFeedingPlan,
  getWarehouseFeedingPlans
} from '../../services/warehouseService'
import { buildModelFamilyGroups } from '../../Utils/vehicleModelHierarchy'
import type { Warehouse, WarehouseFeedingPlan } from '../../Types/warehouse'
import type { Station, VehicleModel } from '../../Types/settings'

type Props = {
  warehouses: Warehouse[]
  models: VehicleModel[]
  stations: Station[]
  canManage: boolean
  notify: (msg: string, isError?: boolean) => void
}

const STATUS_TONE: Record<string, string> = {
  planned: 'bg-amber-500/15 text-amber-200',
  executed: 'bg-emerald-500/15 text-emerald-200',
  cancelled: 'bg-slate-700 text-slate-400'
}

export function WarehouseFeedingPlanTab({ warehouses, models, stations, canManage, notify }: Props) {
  const { t } = useLang()
  const [plans, setPlans] = useState<WarehouseFeedingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [iplRefreshKey, setIplRefreshKey] = useState(0)

  const form = useFeedingPlanFormState(warehouses)

  const modelFamilyById = useMemo(() => {
    const map = new Map<string, string>()
    const { groups } = buildModelFamilyGroups(models)
    for (const g of groups) {
      for (const v of g.variants) map.set(v.id, g.family.name)
    }
    return map
  }, [models])

  const groupedPlans = useMemo(() => {
    const map = new Map<string, WarehouseFeedingPlan[]>()
    for (const p of plans) {
      const family = modelFamilyById.get(p.vehicleModelId) ?? t('warehouses.stock.allModels')
      const list = map.get(family) ?? []
      list.push(p)
      map.set(family, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [plans, modelFamilyById, t])

  const loadPlans = useCallback(async () => {
    setLoading(true)
    try {
      setPlans(await getWarehouseFeedingPlans())
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setLoading(false)
    }
  }, [notify, t])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  async function submitPlan() {
    if (!canManage || !form.warehouseId || !form.variantId) return
    const payload = parseIplPlanLines(form.iplRows)
    if (!payload) {
      notify(t('warehouses.feeding.invalidQty'), true)
      return
    }
    setBusy(true)
    try {
      await createWarehouseFeedingPlan({
        vehicleModelId: form.variantId,
        warehouseId: form.warehouseId,
        stationId: form.stationId || null,
        plannedDate: form.plannedDate,
        notes: form.notes.trim() || null,
        lines: payload
      })
      notify(t('settings.added'))
      form.setIplRows([])
      form.setNotes('')
      form.setVariantId('')
      await loadPlans()
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  async function executePlan(planId: string) {
    setBusy(true)
    try {
      await executeWarehouseFeedingPlan(planId)
      notify(t('warehouses.feeding.planExecuted'))
      await loadPlans()
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  async function cancelPlan(planId: string) {
    setBusy(true)
    try {
      await cancelWarehouseFeedingPlan(planId)
      notify(t('settings.updated'))
      await loadPlans()
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  const canSubmit =
    form.variantId &&
    form.iplRows.some(r => r.included) &&
    !form.iplLoading

  return (
    <div className="space-y-4">
      {canManage && (
        <WarehouseIplImportPanel
          models={models}
          onImported={() => setIplRefreshKey(k => k + 1)}
          notify={notify}
        />
      )}

      {canManage && (
        <div className="card-industrial p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-white">
            <CalendarDays className="h-4 w-4 text-violet-300" />
            {t('warehouses.feeding.planNewTitle')}
          </h3>
          <WarehouseFeedingPlanForm
            warehouses={warehouses}
            models={models}
            stations={stations}
            warehouseId={form.warehouseId}
            variantId={form.variantId}
            stationId={form.stationId}
            plannedDate={form.plannedDate}
            notes={form.notes}
            iplRows={form.iplRows}
            iplLoading={form.iplLoading}
            iplRefreshKey={iplRefreshKey}
            onWarehouseId={form.setWarehouseId}
            onVariantId={form.setVariantId}
            onStationId={form.setStationId}
            onPlannedDate={form.setPlannedDate}
            onNotes={form.setNotes}
            onIplRows={form.setIplRows}
            onIplLoading={form.setIplLoading}
          />
          <button
            type="button"
            disabled={busy || !canSubmit}
            onClick={submitPlan}
            className="mt-4 rounded-xl bg-violet-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-violet-400 disabled:opacity-50"
          >
            {t('warehouses.feeding.planSubmit')}
          </button>
        </div>
      )}

      <div className="card-industrial overflow-hidden">
        <div className="border-b border-slate-800 px-4 py-3">
          <h3 className="text-sm font-black text-white">{t('warehouses.feeding.planList')}</h3>
        </div>
        {loading ? (
          <p className="p-8 text-center text-slate-400">{t('common.loading')}</p>
        ) : plans.length === 0 ? (
          <EmptyState title={t('warehouses.feeding.planEmpty')} />
        ) : (
          <div className="divide-y divide-slate-800">
            {groupedPlans.map(([familyName, familyPlans]) => (
              <div key={familyName}>
                <div className="bg-slate-950/60 px-4 py-2 text-xs font-black text-violet-200">{familyName}</div>
                {familyPlans.map(p => (
                  <div key={p.id} className="border-t border-slate-800/80 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-black text-violet-200" dir="ltr">
                        {p.plannedDate}
                      </span>
                      <span className="text-slate-300">{p.modelName}</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-400">{p.warehouseCode}</span>
                      {p.stationNumber && (
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300" dir="ltr">
                          {p.stationNumber}
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_TONE[p.status]}`}>
                        {t(`warehouses.feeding.planStatus.${p.status}`)}
                      </span>
                    </div>
                    {p.notes && <p className="mt-1 text-xs text-slate-500">{p.notes}</p>}
                    <ul className="mt-2 space-y-1">
                      {p.lines.map(l => (
                        <li key={l.id} className="flex flex-wrap gap-2 text-xs text-slate-400">
                          <span className="font-mono text-cyan-200/80" dir="ltr">
                            {l.partNumber}
                          </span>
                          <span>× {l.quantity}</span>
                        </li>
                      ))}
                    </ul>
                    {canManage && p.status === 'planned' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => executePlan(p.id)}
                          className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/30"
                        >
                          <Play className="h-3 w-3" />
                          {t('warehouses.feeding.executePlan')}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => cancelPlan(p.id)}
                          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-400 hover:bg-slate-700"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
