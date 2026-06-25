import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, PlusCircle, RefreshCcw, Save, Target } from 'lucide-react'
import { useAuth } from '../Context/AuthContext'
import { useVehicles } from '../Context/VehiclesContext'
import { useLang } from '../i18n/LanguageContext'
import { Field, inputCls } from '../Components/FormField'
import { CompletionBar } from '../Components/VehicleBadges'
import { VehicleModelFamilyPicker, resolveFamilyIdForVariant } from '../Components/VehicleModelFamilyPicker'
import {
  getModelPlanTargets,
  mergePlanTargets,
  saveModelPlanTargets
} from '../services/modelProductionPlanService'
import { createProductionOrder, getProductionOrders } from '../services/productionOrdersService'
import { getVehicleModels } from '../services/settingsService'
import { chassisRangeCount, vinInChassisRange } from '../Utils/chassisRange'
import {
  buildPlanSummaryRows,
  planProgressPercent,
  tallyAchievedByModel
} from '../Utils/productionPlanSummary'
import type { ProductionOrder } from '../Types/production'
import type { VehicleModel } from '../Types/settings'

const cell = 'table-cell text-center align-middle'
const totalRow = 'bg-slate-950/95 text-base font-black'

type Props = {
  availableDays: number
}

export function ProductionPlanOrdersTab({ availableDays }: Props) {
  const { t } = useLang()
  const { hasRole } = useAuth()
  const { vehicles, refresh: refreshVehicles } = useVehicles()
  const canManage = hasRole('admin', 'production')

  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])
  const [planTargets, setPlanTargets] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [listsLoading, setListsLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [planAddOpen, setPlanAddOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [savingPlan, setSavingPlan] = useState(false)
  const [error, setError] = useState('')
  const [planSuccess, setPlanSuccess] = useState('')

  const [orderNumber, setOrderNumber] = useState('')
  const [familyId, setFamilyId] = useState('')
  const [modelId, setModelId] = useState('')
  const [chassisStart, setChassisStart] = useState('')
  const [chassisEnd, setChassisEnd] = useState('')

  const [planFamilyId, setPlanFamilyId] = useState('')
  const [planModelId, setPlanModelId] = useState('')
  const [planAddQty, setPlanAddQty] = useState('')

  const carCount = useMemo(() => chassisRangeCount(chassisStart, chassisEnd), [chassisStart, chassisEnd])

  const assemblyEntryByOrderId = useMemo(() => {
    const counts = new Map<string, number>()
    for (const order of orders) {
      const start = order.chassisStart ?? ''
      const end = order.chassisEnd ?? ''
      if (!start || !end) {
        counts.set(order.id, 0)
        continue
      }
      const entered = vehicles.filter(v => vinInChassisRange(v.vin, start, end)).length
      counts.set(order.id, entered)
    }
    return counts
  }, [orders, vehicles])

  const achievedByModelId = useMemo(() => tallyAchievedByModel(vehicles), [vehicles])

  const planRows = useMemo(
    () => buildPlanSummaryRows(models, planTargets, achievedByModelId),
    [models, planTargets, achievedByModelId]
  )

  const planTotals = useMemo(() => {
    const variants = planRows.filter(row => row.kind === 'variant')
    return {
      planned: variants.reduce((sum, row) => sum + row.planned, 0),
      achieved: variants.reduce((sum, row) => sum + row.achieved, 0)
    }
  }, [planRows])

  async function reload() {
    setLoading(true)
    setPlanSuccess('')
    try {
      await refreshVehicles()
      const [orderRows, modelRows, dbTargets] = await Promise.all([
        getProductionOrders(),
        getVehicleModels(),
        getModelPlanTargets().catch(() => [])
      ])
      setOrders(orderRows)
      setModels(modelRows)
      setPlanTargets(mergePlanTargets(dbTargets, orderRows))
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  useEffect(() => {
    if (!formOpen && !planAddOpen) return
    setListsLoading(true)
    getVehicleModels()
      .then(setModels)
      .catch(e => setError(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setListsLoading(false))
  }, [formOpen, planAddOpen, t])

  function setPlanTarget(modelId: string, quantity: number) {
    setPlanTargets(prev => {
      const next = new Map(prev)
      next.set(modelId, Math.max(0, quantity))
      return next
    })
    setPlanSuccess('')
  }

  function addModelToPlan() {
    if (!planModelId) {
      setError(t('mp.f.model'))
      return
    }
    const qty = Number(planAddQty) || 0
    setPlanTargets(prev => {
      const next = new Map(prev)
      next.set(planModelId, qty)
      return next
    })
    setPlanAddOpen(false)
    setPlanFamilyId('')
    setPlanModelId('')
    setPlanAddQty('')
    setPlanSuccess('')
  }

  async function savePlan() {
    setSavingPlan(true)
    setError('')
    setPlanSuccess('')
    try {
      const targets = [...planTargets.entries()].map(([modelId, targetQty]) => ({ modelId, targetQty }))
      await saveModelPlanTargets(targets)
      setPlanSuccess(t('productionOrders.planSaved'))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSavingPlan(false)
    }
  }

  function resetForm() {
    setOrderNumber('')
    setFamilyId('')
    setModelId('')
    setChassisStart('')
    setChassisEnd('')
    setError('')
  }

  async function submit() {
    if (!orderNumber.trim()) {
      setError(t('productionOrders.orderNumberRequired'))
      return
    }
    if (!modelId) {
      setError(t('mp.f.model'))
      return
    }
    if (!chassisStart.trim() || !chassisEnd.trim()) {
      setError(t('productionOrders.chassisRequired'))
      return
    }
    const qty = carCount
    if (!qty || qty < 1) {
      setError(t('productionOrders.invalidRange'))
      return
    }

    setSubmitting(true)
    try {
      await createProductionOrder({
        orderNumber: orderNumber.trim(),
        modelId,
        plannedQty: qty,
        chassisStart: chassisStart.trim(),
        chassisEnd: chassisEnd.trim()
      })
      resetForm()
      setFormOpen(false)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSubmitting(false)
    }
  }

  function modelLabel(row: ProductionOrder): string {
    if (row.familyName && row.modelName && row.familyName !== row.modelName) {
      return `${row.familyName} — ${row.modelName}`
    }
    return row.modelName || '—'
  }

  return (
    <section className="space-y-6">
      <div className="card-industrial p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">{t('productionOrders.title')}</h2>
              <p className="text-sm text-slate-400">{t('productionOrders.subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
          >
            <RefreshCcw className="mr-1 inline h-4 w-4" /> {t('common.refresh')}
          </button>
        </div>

        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-black text-violet-200">{t('productionOrders.planSummary')}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2">
              <span className="text-xs font-bold text-violet-200">{t('productionOrders.workDays.available')}:</span>
              <span className="text-lg font-black text-white">{availableDays}</span>
            </div>
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() => setPlanAddOpen(v => !v)}
                  className="rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-sm font-bold text-violet-200 hover:bg-violet-500/20"
                >
                  <PlusCircle className="mr-1 inline h-4 w-4" /> {t('productionOrders.addModelToPlan')}
                </button>
                <button
                  type="button"
                  disabled={savingPlan}
                  onClick={() => void savePlan()}
                  className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
                >
                  <Save className="mr-1 inline h-4 w-4" /> {savingPlan ? t('common.saving') : t('productionOrders.savePlan')}
                </button>
              </>
            )}
          </div>
        </div>

        {planSuccess && (
          <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            {planSuccess}
          </div>
        )}

        {canManage && planAddOpen && (
          <div className="mb-4 space-y-4 rounded-2xl border border-violet-500/30 bg-slate-900/50 p-4">
            <VehicleModelFamilyPicker
              models={models}
              familyId={planFamilyId}
              variantId={planModelId}
              loading={listsLoading}
              onFamilyChange={setPlanFamilyId}
              onVariantChange={id => {
                setPlanModelId(id)
                const fam = resolveFamilyIdForVariant(models, id)
                if (fam) setPlanFamilyId(fam)
              }}
            />
            <Field label={t('productionOrders.plannedQty')}>
              <input
                type="number"
                min={0}
                className={inputCls()}
                value={planAddQty}
                onChange={e => setPlanAddQty(e.target.value)}
              />
            </Field>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPlanAddOpen(false)
                  setPlanFamilyId('')
                  setPlanModelId('')
                  setPlanAddQty('')
                }}
                className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={addModelToPlan}
                className="rounded-xl bg-violet-500 px-5 py-2 font-black text-slate-950"
              >
                {t('common.add')}
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-950/90">
              <tr>
                <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.cols.model')}</th>
                <th className={`${cell} text-xs font-black uppercase text-cyan-300`}>{t('productionOrders.plannedQty')}</th>
                <th className={`${cell} text-xs font-black uppercase text-emerald-300`}>{t('productionOrders.achievedQty')}</th>
                <th className={`${cell} min-w-[140px] text-xs font-black uppercase text-slate-400`}>{t('productionOrders.progress')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {planRows.map(row => (
                <tr
                  key={row.key}
                  className={row.kind === 'family' ? 'bg-violet-500/10' : 'bg-slate-900/30 hover:bg-slate-800/40'}
                >
                  <td className={`${cell} font-bold ${row.kind === 'family' ? 'text-violet-200' : 'text-slate-200'}`}>
                    {row.kind === 'variant' ? <span className="text-slate-400">— </span> : null}
                    {row.label}
                  </td>
                  <td className={cell}>
                    {canManage && row.kind === 'variant' && row.modelId ? (
                      <input
                        type="number"
                        min={0}
                        className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-center text-sm font-black text-cyan-300"
                        value={row.planned || ''}
                        onChange={e => setPlanTarget(row.modelId!, Number(e.target.value) || 0)}
                      />
                    ) : (
                      <span className="font-black text-cyan-300">{row.planned || '—'}</span>
                    )}
                  </td>
                  <td className={`${cell} font-black text-emerald-300`}>{row.achieved || '—'}</td>
                  <td className={cell}>
                    <CompletionBar percent={planProgressPercent(row.planned, row.achieved)} />
                  </td>
                </tr>
              ))}
              {planRows.length > 0 && (
                <tr className={totalRow}>
                  <td className={`${cell} text-lg text-white`}>{t('productionOrders.grandTotal')}</td>
                  <td className={`${cell} text-lg text-cyan-300`}>{planTotals.planned || '—'}</td>
                  <td className={`${cell} text-lg text-emerald-300`}>{planTotals.achieved || '—'}</td>
                  <td className={cell}>
                    <CompletionBar percent={planProgressPercent(planTotals.planned, planTotals.achieved)} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {!loading && planRows.length === 0 && (
            <p className="p-6 text-center text-sm text-slate-500">{t('productionOrders.noPlanYet')}</p>
          )}
        </div>
      </div>

      <div className="card-industrial p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-violet-500/15 p-2.5 text-violet-300">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{t('productionOrders.ordersSection')}</h3>
            <p className="text-sm text-slate-400">{t('productionOrders.ordersSectionHint')}</p>
          </div>
        </div>

        {canManage && !formOpen && (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="mb-5 flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-violet-500/50 bg-gradient-to-br from-violet-500/20 via-violet-500/10 to-slate-900/40 px-6 py-8 text-center transition hover:border-violet-400 hover:from-violet-500/30"
          >
            <div className="rounded-2xl bg-violet-500 p-3 text-slate-950">
              <PlusCircle className="h-8 w-8" />
            </div>
            <div className="text-start">
              <p className="text-lg font-black text-white">{t('productionOrders.addCta')}</p>
              <p className="mt-1 text-sm text-violet-100/80">{t('productionOrders.addCtaHint')}</p>
            </div>
          </button>
        )}

        {canManage && formOpen && (
          <div className="mb-5 space-y-4 rounded-2xl border border-violet-500/40 bg-slate-900/50 p-5">
            <h4 className="text-sm font-black text-violet-200">{t('productionOrders.formTitle')}</h4>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Field label={t('productionOrders.cols.orderNumber')} required>
                <input
                  className={inputCls()}
                  dir="ltr"
                  value={orderNumber}
                  onChange={e => setOrderNumber(e.target.value)}
                  placeholder="PO-2026-001"
                />
              </Field>

              <Field label={t('productionOrders.cols.carCount')}>
                <input className={`${inputCls()} font-black text-cyan-300`} readOnly value={carCount ?? '—'} />
              </Field>
            </div>

            <VehicleModelFamilyPicker
              models={models}
              familyId={familyId}
              variantId={modelId}
              loading={listsLoading}
              onFamilyChange={setFamilyId}
              onVariantChange={id => {
                setModelId(id)
                const fam = resolveFamilyIdForVariant(models, id)
                if (fam) setFamilyId(fam)
              }}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('productionOrders.cols.chassisStart')} required>
                <input
                  className={`${inputCls()} font-mono`}
                  dir="ltr"
                  value={chassisStart}
                  onChange={e => setChassisStart(e.target.value)}
                />
              </Field>
              <Field label={t('productionOrders.cols.chassisEnd')} required>
                <input
                  className={`${inputCls()} font-mono`}
                  dir="ltr"
                  value={chassisEnd}
                  onChange={e => setChassisEnd(e.target.value)}
                />
              </Field>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false)
                  resetForm()
                }}
                className="rounded-xl bg-slate-800 px-5 py-3 font-bold text-slate-200"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submit()}
                className="rounded-xl bg-violet-500 px-8 py-3 font-black text-slate-950 disabled:opacity-50"
              >
                {submitting ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-950/90">
              <tr>
                <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.cols.orderNumber')}</th>
                <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.cols.model')}</th>
                <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.cols.chassisStart')}</th>
                <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.cols.chassisEnd')}</th>
                <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.cols.carCount')}</th>
                <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.cols.assemblyEntry')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {orders.map(row => (
                <tr key={row.id} className="hover:bg-slate-800/30">
                  <td className={`${cell} font-mono font-bold text-white`} dir="ltr">
                    {row.orderNumber}
                  </td>
                  <td className={cell}>{modelLabel(row)}</td>
                  <td className={`${cell} font-mono`} dir="ltr">
                    {row.chassisStart || '—'}
                  </td>
                  <td className={`${cell} font-mono`} dir="ltr">
                    {row.chassisEnd || '—'}
                  </td>
                  <td className={`${cell} font-black text-cyan-300`}>{row.plannedQty}</td>
                  <td className={`${cell} font-black text-emerald-300`}>
                    {assemblyEntryByOrderId.get(row.id) ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && <p className="p-8 text-center text-slate-400">{t('common.loading')}</p>}
          {!loading && orders.length === 0 && (
            <p className="p-8 text-center text-slate-500">{t('common.noData')}</p>
          )}
          {!loading && error && orders.length === 0 && (
            <p className="p-4 text-center text-sm text-red-300">{error}</p>
          )}
        </div>
      </div>
    </section>
  )
}
