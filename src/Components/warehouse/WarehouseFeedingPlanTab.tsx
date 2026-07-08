import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Play, Route, ShoppingCart, TableProperties } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { EmptyState } from '../EmptyState'
import { NavTabButton } from '../layout/NavTabButton'
import { WarehouseFeedingPlanForm, useFeedingPlanFormState } from './WarehouseFeedingPlanForm'
import { WarehouseFeedingPlanTripsTab } from './WarehouseFeedingPlanTripsTab'
import { WarehouseFeedingPlanCartsTab } from './WarehouseFeedingPlanCartsTab'
import { buildFeedingModelOptionGroups } from '../../Utils/iplBomLogistics'
import { parseIplPlanLines } from './feedingShared'
import {
  cancelWarehouseFeedingPlan,
  createWarehouseFeedingPlan,
  executeWarehouseFeedingPlan,
  getWarehouseFeedingPlans
} from '../../services/warehouseService'
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

type PlanSubTab = 'ipl' | 'trips' | 'carts'

export function WarehouseFeedingPlanTab({ warehouses, models, stations, canManage, notify }: Props) {
  const { t } = useLang()
  const [plans, setPlans] = useState<WarehouseFeedingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [planSubTab, setPlanSubTab] = useState<PlanSubTab>('ipl')

  const form = useFeedingPlanFormState(warehouses, models)

  const modelOptionGroups = useMemo(
    () =>
      buildFeedingModelOptionGroups(models, {
        other: t('warehouses.feeding.iplOtherModels'),
        flat: t('warehouses.feeding.pickModel')
      }),
    [models, t]
  )

  const modelPlans = useMemo(() => {
    if (!form.variantId) return []
    return plans
      .filter(p => p.vehicleModelId === form.variantId)
      .sort((a, b) => b.plannedDate.localeCompare(a.plannedDate))
  }, [plans, form.variantId])

  const selectedModelName = useMemo(
    () => models.find(m => m.id === form.variantId)?.name ?? '',
    [models, form.variantId]
  )

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
      form.setNotes('')
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
      <div className="card-industrial p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{t('warehouses.feeding.subTabs.plan')}</h3>
              <p className="text-sm text-slate-400">{t('warehouses.feeding.iplFromEngineering')}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <NavTabButton
              compact
              label={t('warehouses.feeding.planSubTabs.ipl')}
              icon={TableProperties}
              active={planSubTab === 'ipl'}
              onClick={() => setPlanSubTab('ipl')}
            />
            <NavTabButton
              compact
              label={t('warehouses.feeding.planSubTabs.trips')}
              icon={Route}
              active={planSubTab === 'trips'}
              onClick={() => setPlanSubTab('trips')}
            />
            <NavTabButton
              compact
              label={t('warehouses.feeding.planSubTabs.carts')}
              icon={ShoppingCart}
              active={planSubTab === 'carts'}
              onClick={() => setPlanSubTab('carts')}
            />
          </div>
        </div>
      </div>

      {planSubTab === 'carts' && (
        <WarehouseFeedingPlanCartsTab warehouses={warehouses} canManage={canManage} notify={notify} />
      )}

      {planSubTab === 'trips' && (
        <div className="card-industrial p-4">
          <WarehouseFeedingPlanTripsTab
            iplRows={form.iplRows}
            variantId={form.variantId}
            selectedModelName={selectedModelName}
          />
        </div>
      )}

      {planSubTab === 'ipl' && canManage && (
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
            warehouseType={form.warehouseType}
            variantId={form.variantId}
            stationId={form.stationId}
            plannedDate={form.plannedDate}
            notes={form.notes}
            iplRows={form.iplRows}
            iplLoading={form.iplLoading}
            onWarehouseId={form.setWarehouseId}
            onWarehouseType={form.setWarehouseType}
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

      {planSubTab === 'ipl' && (
      <div className="card-industrial overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <h3 className="text-sm font-black text-white">{t('warehouses.feeding.planList')}</h3>
          {modelOptionGroups.length > 0 && (
            <select
              className="input-dark min-w-[12rem] text-sm"
              value={form.variantId}
              onChange={e => form.setVariantId(e.target.value)}
              dir="ltr"
            >
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
          )}
        </div>
        {loading ? (
          <p className="p-8 text-center text-slate-400">{t('common.loading')}</p>
        ) : !form.variantId ? (
          <p className="p-8 text-center text-sm text-slate-500">{t('warehouses.feeding.pickModelForPlans')}</p>
        ) : modelPlans.length === 0 ? (
          <EmptyState title={t('warehouses.feeding.planEmptyForModel', { model: selectedModelName })} />
        ) : (
          <div className="divide-y divide-slate-800">
            {modelPlans.map(p => (
              <div key={p.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-black text-violet-200" dir="ltr">
                    {p.plannedDate}
                  </span>
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
        )}
      </div>
      )}
    </div>
  )
}
