import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ClipboardList, Pencil, PlusCircle, Target, Trash2 } from 'lucide-react'
import { useAuth } from '../../Context/AuthContext'
import { useVehicles } from '../../Context/VehiclesContext'
import { useLang } from '../../i18n/LanguageContext'
import { Field, inputCls } from '../FormField'
import { ConfirmDialog } from '../ConfirmDialog'
import { CompletionBar } from '../VehicleBadges'
import { VehicleModelFamilyPicker, resolveFamilyIdForVariant } from '../VehicleModelFamilyPicker'
import {
  getModelPlanTargets,
  mergePlanTargets,
  saveModelPlanTargets
} from '../../services/modelProductionPlanService'
import { createProductionOrder, deleteProductionOrder, getProductionOrders, updateProductionOrder } from '../../services/productionOrdersService'
import { getVehicleModels } from '../../services/settingsService'
import { chassisRangeCount, vinInChassisRange } from '../../Utils/chassisRange'
import { getProductionPlanWorkDaysMonth } from '../../services/productionPlanWorkDayDailyService'
import { buildMonthWorkDayRows, totalPlannedHoursFromRows } from '../../Utils/productionPlanWorkDayDaily'
import {
  computeLineJph,
  computeTaktMinutes,
  formatLineRate,
  formatTaktMinutes
} from '../../Utils/productionLineRate'
import {
  buildPlanFamilyGroups,
  planProgressPercent,
  tallyAchievedByModel
} from '../../Utils/productionPlanSummary'
import type { ProductionOrder } from '../../Types/production'
import type { VehicleModel } from '../../Types/settings'

const cell = 'table-cell text-center align-middle'
const totalRow = 'bg-slate-950/95 text-base font-black'

function currentYm(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

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
  const [editingOrder, setEditingOrder] = useState<ProductionOrder | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductionOrder | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [savingPlan, setSavingPlan] = useState(false)
  const [error, setError] = useState('')
  const [planSuccess, setPlanSuccess] = useState('')
  const planSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [orderNumber, setOrderNumber] = useState('')
  const [familyId, setFamilyId] = useState('')
  const [modelId, setModelId] = useState('')
  const [chassisStart, setChassisStart] = useState('')
  const [chassisEnd, setChassisEnd] = useState('')

  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set())
  const [monthPlannedHours, setMonthPlannedHours] = useState(0)

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

  const planFamilyGroups = useMemo(
    () => buildPlanFamilyGroups(models, planTargets, achievedByModelId),
    [models, planTargets, achievedByModelId]
  )

  const planTotals = useMemo(() => {
    return {
      planned: planFamilyGroups.reduce((sum, g) => sum + g.planned, 0),
      achieved: planFamilyGroups.reduce((sum, g) => sum + g.achieved, 0)
    }
  }, [planFamilyGroups])

  const lineJph = useMemo(
    () => computeLineJph(monthPlannedHours, planTotals.planned),
    [monthPlannedHours, planTotals.planned]
  )
  const lineTaktMinutes = useMemo(() => computeTaktMinutes(lineJph), [lineJph])

  async function loadMonthPlannedHours() {
    const { year, month } = currentYm()
    try {
      const saved = await getProductionPlanWorkDaysMonth(year, month)
      const rows = buildMonthWorkDayRows(year, month, saved)
      setMonthPlannedHours(totalPlannedHoursFromRows(rows))
    } catch {
      setMonthPlannedHours(0)
    }
  }

  function toggleFamily(key: string) {
    setExpandedFamilies(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function isFamilyExpanded(key: string) {
    return expandedFamilies.has(key)
  }

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
      await loadMonthPlannedHours()
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
    if (!formOpen) return
    setListsLoading(true)
    getVehicleModels()
      .then(setModels)
      .catch(e => setError(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setListsLoading(false))
  }, [formOpen, t])

  useEffect(() => {
    return () => {
      if (planSaveTimerRef.current) clearTimeout(planSaveTimerRef.current)
    }
  }, [])

  async function persistPlanTarget(modelId: string, targetQty: number) {
    setSavingPlan(true)
    setError('')
    try {
      await saveModelPlanTargets([{ modelId, targetQty: Math.max(0, targetQty) }])
      setPlanSuccess(t('productionOrders.planSaved'))
      window.setTimeout(() => setPlanSuccess(''), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSavingPlan(false)
    }
  }

  function setPlanTarget(modelId: string, quantity: number) {
    const qty = Math.max(0, quantity)
    setPlanTargets(prev => {
      const next = new Map(prev)
      next.set(modelId, qty)
      return next
    })
    if (!canManage) return
    if (planSaveTimerRef.current) clearTimeout(planSaveTimerRef.current)
    planSaveTimerRef.current = setTimeout(() => {
      void persistPlanTarget(modelId, qty)
    }, 600)
  }

  function flushPlanTarget(modelId: string, quantity: number) {
    if (!canManage) return
    if (planSaveTimerRef.current) {
      clearTimeout(planSaveTimerRef.current)
      planSaveTimerRef.current = null
    }
    void persistPlanTarget(modelId, quantity)
  }

  function openCreateOrder() {
    setEditingOrder(null)
    resetForm()
    setFormOpen(true)
  }

  function openEditOrder(row: ProductionOrder) {
    setEditingOrder(row)
    setOrderNumber(row.orderNumber)
    setModelId(row.modelId ?? '')
    const fam = row.modelId ? resolveFamilyIdForVariant(models, row.modelId) : ''
    setFamilyId(fam ?? '')
    setChassisStart(row.chassisStart ?? '')
    setChassisEnd(row.chassisEnd ?? '')
    setError('')
    setFormOpen(true)
  }

  async function confirmDeleteOrder() {
    if (!deleteTarget) return
    setSubmitting(true)
    setError('')
    try {
      await deleteProductionOrder(deleteTarget.id)
      setDeleteTarget(null)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setOrderNumber('')
    setFamilyId('')
    setModelId('')
    setChassisStart('')
    setChassisEnd('')
    setEditingOrder(null)
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
      const payload = {
        orderNumber: orderNumber.trim(),
        modelId,
        plannedQty: qty,
        chassisStart: chassisStart.trim(),
        chassisEnd: chassisEnd.trim()
      }
      if (editingOrder) await updateProductionOrder(editingOrder.id, payload)
      else await createProductionOrder(payload)
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
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">{t('productionOrders.title')}</h2>
              <p className="text-sm text-slate-400">{t('productionOrders.subtitle')}</p>
            </div>
          </div>
        </div>

        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-black text-violet-200">{t('productionOrders.planSummary')}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <MetricPill
              label={t('productionOrders.workDays.available')}
              value={String(availableDays)}
              tone="violet"
            />
            <MetricPill
              label={t('productionOrders.jph')}
              value={lineJph != null ? formatLineRate(lineJph) : '—'}
              tone="cyan"
            />
            <MetricPill
              label={t('productionOrders.taktTime')}
              value={lineTaktMinutes != null ? formatTaktMinutes(lineTaktMinutes) : '—'}
              tone="amber"
            />
            {savingPlan && (
              <span className="text-xs font-bold text-cyan-300">{t('common.saving')}</span>
            )}
          </div>
        </div>

        {planSuccess && (
          <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            {planSuccess}
          </div>
        )}
        {error && !formOpen && (
          <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
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
              {planFamilyGroups.map(group => {
                const open = isFamilyExpanded(group.key)
                return (
                  <Fragment key={group.key}>
                    <tr className="bg-violet-500/10">
                      <td className={`${cell} text-start font-bold text-violet-200`}>
                        <button
                          type="button"
                          onClick={() => toggleFamily(group.key)}
                          className="inline-flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-start hover:bg-violet-500/15"
                          aria-expanded={open}
                        >
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 text-violet-300 transition-transform ${open ? '' : '-rotate-90'}`}
                          />
                          {group.label}
                          <span className="text-xs font-semibold text-violet-300/70">
                            ({group.variants.length})
                          </span>
                        </button>
                      </td>
                      <td className={`${cell} font-black text-cyan-300`}>{group.planned || '—'}</td>
                      <td className={`${cell} font-black text-emerald-300`}>{group.achieved || '—'}</td>
                      <td className={cell}>
                        <CompletionBar percent={planProgressPercent(group.planned, group.achieved)} />
                      </td>
                    </tr>
                    {open &&
                      group.variants.map(variant => (
                        <tr key={variant.modelId} className="bg-slate-900/30 hover:bg-slate-800/40">
                          <td className={`${cell} ps-10 text-start font-bold text-slate-200`}>
                            <span className="text-slate-500">— </span>
                            {variant.label}
                          </td>
                          <td className={cell}>
                            {canManage ? (
                              <input
                                type="number"
                                min={0}
                                className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-center text-sm font-black text-cyan-300"
                                value={variant.planned || ''}
                                onChange={e => setPlanTarget(variant.modelId, Number(e.target.value) || 0)}
                                onBlur={e => flushPlanTarget(variant.modelId, Number(e.target.value) || 0)}
                              />
                            ) : (
                              <span className="font-black text-cyan-300">{variant.planned || '—'}</span>
                            )}
                          </td>
                          <td className={`${cell} font-black text-emerald-300`}>{variant.achieved || '—'}</td>
                          <td className={cell}>
                            <CompletionBar percent={planProgressPercent(variant.planned, variant.achieved)} />
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                )
              })}
              {planFamilyGroups.length > 0 && (
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
          {!loading && planFamilyGroups.length === 0 && (
            <p className="p-6 text-center text-sm text-slate-500">{t('productivity.monthly.noModels')}</p>
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
            onClick={openCreateOrder}
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
            <h4 className="text-sm font-black text-violet-200">
              {editingOrder ? t('productionOrders.editTitle') : t('productionOrders.formTitle')}
            </h4>

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
                {canManage && (
                  <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('common.actions')}</th>
                )}
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
                  {canManage && (
                    <td className={cell}>
                      <div className="flex justify-center gap-1">
                        <button
                          type="button"
                          title={t('common.edit')}
                          onClick={() => openEditOrder(row)}
                          className="rounded-lg bg-orange-500/15 p-2 text-orange-200 hover:bg-orange-500/25"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title={t('common.delete')}
                          onClick={() => setDeleteTarget(row)}
                          className="rounded-lg bg-red-500/15 p-2 text-red-200 hover:bg-red-500/25"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
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

        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title={t('common.delete')}
          message={deleteTarget ? t('productionOrders.deleteConfirm', { n: deleteTarget.orderNumber }) : ''}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          busy={submitting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDeleteOrder()}
        />
      </div>
    </section>
  )
}

function MetricPill({
  label,
  value,
  tone = 'violet'
}: {
  label: string
  value: string
  tone?: 'violet' | 'cyan' | 'amber'
}) {
  const borderCls =
    tone === 'cyan'
      ? 'border-cyan-500/30 bg-cyan-500/10'
      : tone === 'amber'
        ? 'border-amber-500/30 bg-amber-500/10'
        : 'border-violet-500/30 bg-violet-500/10'
  const labelCls =
    tone === 'cyan' ? 'text-cyan-200' : tone === 'amber' ? 'text-amber-200' : 'text-violet-200'
  const valueCls =
    tone === 'cyan' ? 'text-cyan-300' : tone === 'amber' ? 'text-amber-300' : 'text-white'

  return (
    <div className={`rounded-xl border px-3 py-2 ${borderCls}`}>
      <p className={`text-xs font-bold ${labelCls}`}>{label}</p>
      <p className={`text-lg font-black ${valueCls}`}>{value}</p>
    </div>
  )
}
