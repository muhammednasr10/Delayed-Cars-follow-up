import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, ClipboardList, Pencil, PlusCircle, Target, Trash2 } from 'lucide-react'
import { useCanManageProduction } from '../../hooks/useCanManageProduction'
import { useVehicles } from '../../Context/VehiclesContext'
import { useLang } from '../../i18n/LanguageContext'
import { Field, inputCls } from '../FormField'
import { ConfirmDialog } from '../ConfirmDialog'
import { VehicleModelFamilyPicker, resolveFamilyIdForVariant } from '../VehicleModelFamilyPicker'
import {
  getModelPlanTargets,
  getYearMonthlyPlanTargets,
  planTargetsMap,
  wipCarryoverMap
} from '../../services/modelProductionPlanService'
import {
  createProductionOrder,
  deleteProductionOrder,
  getProductionOrders,
  updateProductionOrder
} from '../../services/productionOrdersService'
import { getMonthProductivityDetail } from '../../services/productionPlanWorkDayDailyService'
import { getExitProductivityYear } from '../../services/exitProductivityService'
import { getVehicleModels } from '../../services/settingsService'
import { chassisRangeCount, vinInChassisRange } from '../../Utils/chassisRange'
import { getProductionPlanWorkDays } from '../../services/productionPlanWorkDaysService'
import { computeTaktMinutes, formatTaktMinutes } from '../../Utils/productionLineRate'
import {
  buildAchievedByModelIdFromExitRecords,
  buildAnnualSectionsFromMonthlyPlans,
  buildPlanSections,
  planProgressPercent,
  sumPlanSectionsAchieved,
  sumPlanSectionsPlanned,
  sumPlanSectionsWip,
  type PlanSection
} from '../../Utils/productionPlanSummary'
import type { PlanEntryMode } from './ProductionPlanEntryModal'
import { buildPlanOrdersCoverage, coverageByKey } from '../../Utils/planOrdersCoverage'
import { TableExportButtons } from '../TableExportButtons'
import { ProductionPlanEntryModal } from './ProductionPlanEntryModal'
import { PlanFamilyCard } from './PlanFamilyCard'
import { buildOrdersExportRows, buildPlanSummaryExportRows } from '../../Utils/planningExport'
import type { TableExportColumn } from '../../Utils/tableExport'
import type { ProductionOrder } from '../../Types/production'
import type { VehicleModel } from '../../Types/settings'

const cell = 'table-cell text-center align-middle'

function currentYm(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

type Props = {
  /** plan = ملخص الخطة فقط، orders = أوامر الإنتاج فقط */
  view: 'plan' | 'orders'
  /** عرض عمود شهري أو سنوي فقط — الافتراضي both للتوافق */
  planScope?: 'monthly' | 'annual' | 'both'
  onBack?: () => void
}

export function ProductionPlanOrdersTab({ view, planScope = 'both', onBack }: Props) {
  const { t } = useLang()
  const canManage = useCanManageProduction()
  const { vehicles, refresh: refreshVehicles } = useVehicles()

  const initYm = currentYm()
  const [planYear, setPlanYear] = useState(initYm.year)
  const [planMonth, setPlanMonth] = useState(initYm.month)
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])
  const [planTargets, setPlanTargets] = useState<Map<string, number>>(new Map())
  const [annualSections, setAnnualSections] = useState<PlanSection[]>([])
  const [wipCarryover, setWipCarryover] = useState<Map<string, number>>(new Map())
  const [achievedByModelId, setAchievedByModelId] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [listsLoading, setListsLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<ProductionOrder | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductionOrder | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [planSuccess, setPlanSuccess] = useState('')
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [planEntryMode, setPlanEntryMode] = useState<PlanEntryMode>('monthly')

  const [orderNumber, setOrderNumber] = useState('')
  const [familyId, setFamilyId] = useState('')
  const [modelId, setModelId] = useState('')
  const [chassisStart, setChassisStart] = useState('')
  const [chassisEnd, setChassisEnd] = useState('')

  const [expandedMonthlyFamilies, setExpandedMonthlyFamilies] = useState<Set<string>>(new Set())
  const [expandedAnnualFamilies, setExpandedAnnualFamilies] = useState<Set<string>>(new Set())
  const [availableDays, setAvailableDays] = useState(0)
  const [availableHours, setAvailableHours] = useState(0)
  const [lineJph, setLineJph] = useState(0)

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

  const planSections = useMemo(
    () => buildPlanSections(models, planTargets, achievedByModelId, wipCarryover),
    [models, planTargets, achievedByModelId, wipCarryover]
  )

  const planMonthValue = `${planYear}-${String(planMonth).padStart(2, '0')}`

  const planTotals = useMemo(() => {
    return {
      planned: sumPlanSectionsPlanned(planSections),
      achieved: sumPlanSectionsAchieved(planSections),
      wip: sumPlanSectionsWip(planSections),
      annual: sumPlanSectionsPlanned(annualSections)
    }
  }, [planSections, annualSections])

  const showMonthly = planScope === 'both' || planScope === 'monthly'
  const showAnnual = planScope === 'both' || planScope === 'annual'

  const planProgress = useMemo(
    () => planProgressPercent(planTotals.planned, planTotals.achieved),
    [planTotals.planned, planTotals.achieved]
  )

  const annualProgress = useMemo(
    () => planProgressPercent(planTotals.annual, sumPlanSectionsAchieved(annualSections)),
    [planTotals.annual, annualSections]
  )

  const ordersCoverage = useMemo(
    () => buildPlanOrdersCoverage(planSections, orders, models, planYear, planMonth),
    [planSections, orders, models, planYear, planMonth]
  )

  const ordersCoverageMap = useMemo(() => coverageByKey(ordersCoverage), [ordersCoverage])

  const lineTaktMinutes = useMemo(() => computeTaktMinutes(lineJph > 0 ? lineJph : null), [lineJph])

  function toggleMonthlyFamily(key: string) {
    setExpandedMonthlyFamilies(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleAnnualFamily(key: string) {
    setExpandedAnnualFamilies(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function reload() {
    setLoading(true)
    setPlanSuccess('')
    try {
      if (view === 'orders') await refreshVehicles()
      const [orderRows, modelRows, dbTargets, yearMonthlyTargets, yearExitRows, workConfig, productivity] =
        await Promise.all([
          getProductionOrders(),
          getVehicleModels(),
          getModelPlanTargets(planYear, planMonth).catch(() => []),
          view === 'plan' ? getYearMonthlyPlanTargets(planYear).catch(() => []) : Promise.resolve([]),
          view === 'plan' ? getExitProductivityYear(planYear).catch(() => []) : Promise.resolve([]),
          getProductionPlanWorkDays(planYear, planMonth).catch(() => null),
          view === 'plan' ? getMonthProductivityDetail(planYear, planMonth).catch(() => null) : Promise.resolve(null)
        ])
      setOrders(orderRows)
      setModels(modelRows)
      setPlanTargets(planTargetsMap(dbTargets))
      setWipCarryover(wipCarryoverMap(dbTargets))
      setAvailableDays(workConfig?.availableDays ?? 0)
      setAvailableHours(workConfig?.availableHours ?? 0)
      setLineJph(workConfig?.lineJph ?? 0)
      if (productivity) {
        setAchievedByModelId(buildAchievedByModelIdFromExitRecords(productivity.exitRecords))
      } else {
        setAchievedByModelId(new Map())
      }
      setAnnualSections(buildAnnualSectionsFromMonthlyPlans(modelRows, yearMonthlyTargets, yearExitRows))
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [planYear, planMonth, view])

  useEffect(() => {
    if (!formOpen) return
    setListsLoading(true)
    getVehicleModels()
      .then(setModels)
      .catch(e => setError(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setListsLoading(false))
  }, [formOpen, t])

  function openPlanModal(mode: PlanEntryMode) {
    setPlanEntryMode(mode)
    setPlanModalOpen(true)
  }

  async function handlePlanSaved() {
    setPlanSuccess(t('productionOrders.planSaved'))
    window.setTimeout(() => setPlanSuccess(''), 2500)
    await reload()
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

  const planExportColumns = useMemo<TableExportColumn<ReturnType<typeof buildPlanSummaryExportRows>[number]>[]>(
    () => [
      { label: t('productionOrders.cols.model'), value: r => r.model },
      { label: t('productionOrders.plannedQty'), value: r => r.planned },
      { label: t('productionOrders.ordersQty'), value: r => r.ordersQty },
      { label: t('productionOrders.ordersGap'), value: r => r.gap },
      { label: t('productionOrders.achievedQty'), value: r => r.achieved },
      { label: t('productionOrders.progress'), value: r => r.progress }
    ],
    [t]
  )

  const planExportRows = useMemo(
    () => buildPlanSummaryExportRows(planSections, ordersCoverageMap),
    [planSections, ordersCoverageMap]
  )

  const ordersExportColumns = useMemo<TableExportColumn<ReturnType<typeof buildOrdersExportRows>[number]>[]>(
    () => [
      { label: t('productionOrders.cols.orderNumber'), value: r => r.orderNumber },
      { label: t('productionOrders.cols.model'), value: r => r.model },
      { label: t('productionOrders.cols.chassisStart'), value: r => r.chassisStart },
      { label: t('productionOrders.cols.chassisEnd'), value: r => r.chassisEnd },
      { label: t('productionOrders.cols.carCount'), value: r => r.carCount },
      { label: t('productionOrders.cols.assemblyEntry'), value: r => r.assemblyEntry }
    ],
    [t]
  )

  const ordersExportRows = useMemo(
    () => buildOrdersExportRows(orders, assemblyEntryByOrderId, modelLabel),
    [orders, assemblyEntryByOrderId]
  )

  return (
    <section className="space-y-6">
      {view === 'plan' && (
        <div className="card-industrial p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="mt-1 rounded-xl border border-slate-700 bg-slate-800/80 p-2 text-slate-300 hover:bg-slate-700"
                  title={t('productionOrders.planHub.backToHub')}
                >
                  <ChevronRight className="h-5 w-5 rtl:rotate-180" />
                </button>
              )}
              <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  {planScope === 'monthly'
                    ? t('productionOrders.monthlyPlanSection')
                    : planScope === 'annual'
                      ? t('productionOrders.annualPlanSection')
                      : t('productionOrders.planSummary')}
                </h3>
              </div>
            </div>
            {!loading && planExportRows.length > 0 && (
              <TableExportButtons
                filename={`plan-summary-${planMonthValue}`}
                title={t('planning.export.planTitle', { month: planMonthValue })}
                columns={planExportColumns}
                rows={planExportRows}
              />
            )}
          </div>

          {planSuccess && (
            <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              {planSuccess}
            </div>
          )}
          {error && !formOpen && (
            <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className={`grid grid-cols-1 gap-6 ${showMonthly && showAnnual ? 'xl:grid-cols-2 xl:items-start' : ''}`}>
            {/* Monthly plan column */}
            {showMonthly && (
              <div className="space-y-4 rounded-2xl border border-violet-500/20 bg-slate-950/20 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-base font-black text-violet-200">{t('productionOrders.monthlyPlanSection')}</h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="month"
                      className={`${inputCls()} w-full py-2 text-sm sm:w-auto`}
                      value={planMonthValue}
                      onChange={e => {
                        const [y, m] = e.target.value.split('-').map(Number)
                        if (y && m) {
                          setPlanYear(y)
                          setPlanMonth(m)
                        }
                      }}
                      title={t('productionOrders.planMonth')}
                    />
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => openPlanModal('monthly')}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 px-4 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-violet-500/20 hover:from-violet-400 hover:to-violet-500"
                      >
                        <ClipboardList className="h-4 w-4" />
                        {t('productionOrders.planEntry.openButton')}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <PlanStatCard
                    label={t('productionOrders.plannedQty')}
                    value={String(planTotals.planned || '—')}
                    tone="cyan"
                  />
                  <PlanStatCard
                    label={t('productionOrders.achievedQty')}
                    value={String(planTotals.achieved || '—')}
                    tone="emerald"
                  />
                  <PlanStatCard label={t('productionOrders.progress')} value={`${planProgress}%`} tone="violet" />
                  <PlanStatCard
                    label={t('productionOrders.wipCarryoverShort')}
                    value={String(planTotals.wip || '—')}
                    tone="rose"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <MetricPill
                    label={t('productionOrders.workDays.available')}
                    value={availableDays > 0 ? String(availableDays) : '—'}
                    tone="violet"
                  />
                  <MetricPill
                    label={t('productionOrders.workDays.availableHours')}
                    value={availableHours > 0 ? String(availableHours) : '—'}
                    tone="cyan"
                  />
                  <MetricPill
                    label={t('productionOrders.jph')}
                    value={lineJph > 0 ? String(lineJph) : '—'}
                    tone="cyan"
                  />
                  <MetricPill
                    label={t('productionOrders.taktTime')}
                    value={lineTaktMinutes != null ? formatTaktMinutes(lineTaktMinutes) : '—'}
                    tone="amber"
                  />
                </div>

                <div className="space-y-3">
                  {planSections.map(section => (
                    <PlanFamilyCard
                      key={section.group.key}
                      group={section.group}
                      scope="monthly"
                      isExpanded={expandedMonthlyFamilies.has(section.group.key)}
                      onToggle={() => toggleMonthlyFamily(section.group.key)}
                      t={t}
                    />
                  ))}
                  {loading && <p className="py-8 text-center text-slate-400">{t('common.loading')}</p>}
                  {!loading && planSections.length === 0 && (
                    <p className="py-6 text-center text-sm text-slate-500">{t('productivity.monthly.noModels')}</p>
                  )}
                </div>
              </div>
            )}

            {/* Annual plan column */}
            {showAnnual && (
              <div className="space-y-4 rounded-2xl border border-cyan-500/20 bg-slate-950/20 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-base font-black text-cyan-200">{t('productionOrders.annualPlanSection')}</h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-black text-cyan-200"
                      dir="ltr"
                    >
                      {planYear}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-cyan-200/80">{t('productionOrders.planHub.annualFromMonthlyHint')}</p>

                <PlanStatCard
                  label={t('productionOrders.annualPlan')}
                  value={String(planTotals.annual || '—')}
                  tone="cyan"
                  wide
                />
                <PlanStatCard
                  label={t('productionOrders.achievedQty')}
                  value={String(sumPlanSectionsAchieved(annualSections) || '—')}
                  tone="emerald"
                  wide
                />
                <PlanStatCard label={t('productionOrders.progress')} value={`${annualProgress}%`} tone="violet" wide />

                <div className="space-y-3">
                  {annualSections.map(section => (
                    <PlanFamilyCard
                      key={section.group.key}
                      group={section.group}
                      scope="annual"
                      isExpanded={expandedAnnualFamilies.has(section.group.key)}
                      onToggle={() => toggleAnnualFamily(section.group.key)}
                      t={t}
                    />
                  ))}
                  {loading && <p className="py-8 text-center text-slate-400">{t('common.loading')}</p>}
                  {!loading && annualSections.length === 0 && (
                    <p className="py-6 text-center text-sm text-slate-500">{t('productivity.monthly.noModels')}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <ProductionPlanEntryModal
            open={planModalOpen}
            onClose={() => setPlanModalOpen(false)}
            entryMode={planEntryMode}
            monthLabel={planMonthValue}
            planYear={planYear}
            planMonth={planMonth}
            models={models}
            planTargets={planTargets}
            wipCarryover={wipCarryover}
            achievedByModelId={achievedByModelId}
            availableDays={availableDays}
            availableHours={availableHours}
            lineJph={lineJph}
            canManage={canManage}
            onSaved={() => void handlePlanSaved()}
          />
        </div>
      )}

      {view === 'orders' && (
        <div className="card-industrial p-5 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">{t('productionOrders.ordersSectionHint')}</p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="month"
                className={`${inputCls()} w-full py-2 text-sm sm:w-auto`}
                value={planMonthValue}
                onChange={e => {
                  const [y, m] = e.target.value.split('-').map(Number)
                  if (y && m) {
                    setPlanYear(y)
                    setPlanMonth(m)
                  }
                }}
                title={t('productionOrders.planMonth')}
              />
              {!loading && ordersExportRows.length > 0 && (
                <TableExportButtons
                  filename={`production-orders-${planMonthValue}`}
                  title={t('planning.export.ordersTitle', { month: planMonthValue })}
                  columns={ordersExportColumns}
                  rows={ordersExportRows}
                />
              )}
            </div>
          </div>

          {error && !formOpen && (
            <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

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
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {error}
                </div>
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
                  <th className={`${cell} text-xs font-black uppercase text-slate-400`}>
                    {t('productionOrders.cols.orderNumber')}
                  </th>
                  <th className={`${cell} text-xs font-black uppercase text-slate-400`}>
                    {t('productionOrders.cols.model')}
                  </th>
                  <th className={`${cell} text-xs font-black uppercase text-slate-400`}>
                    {t('productionOrders.cols.chassisStart')}
                  </th>
                  <th className={`${cell} text-xs font-black uppercase text-slate-400`}>
                    {t('productionOrders.cols.chassisEnd')}
                  </th>
                  <th className={`${cell} text-xs font-black uppercase text-slate-400`}>
                    {t('productionOrders.cols.carCount')}
                  </th>
                  <th className={`${cell} text-xs font-black uppercase text-slate-400`}>
                    {t('productionOrders.cols.assemblyEntry')}
                  </th>
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
                    <td className={`${cell} font-black text-emerald-300`}>{assemblyEntryByOrderId.get(row.id) ?? 0}</td>
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
            {!loading && orders.length === 0 && <p className="p-8 text-center text-slate-500">{t('common.noData')}</p>}
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
      )}
    </section>
  )
}

function PlanStatCard({
  label,
  value,
  tone,
  wide
}: {
  label: string
  value: string
  tone: 'cyan' | 'violet' | 'amber' | 'red' | 'slate' | 'emerald' | 'rose'
  wide?: boolean
}) {
  const border =
    tone === 'cyan'
      ? 'border-cyan-500/30 bg-cyan-500/10'
      : tone === 'violet'
        ? 'border-violet-500/30 bg-violet-500/10'
        : tone === 'amber'
          ? 'border-amber-500/30 bg-amber-500/10'
          : tone === 'red'
            ? 'border-red-500/30 bg-red-500/10'
            : tone === 'emerald'
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : tone === 'rose'
                ? 'border-rose-500/30 bg-rose-500/10'
                : 'border-slate-600/40 bg-slate-800/40'
  const valueCls =
    tone === 'cyan'
      ? 'text-cyan-300'
      : tone === 'violet'
        ? 'text-violet-300'
        : tone === 'amber'
          ? 'text-amber-300'
          : tone === 'red'
            ? 'text-red-300'
            : tone === 'emerald'
              ? 'text-emerald-300'
              : tone === 'rose'
                ? 'text-rose-300'
                : 'text-slate-200'

  return (
    <div className={`rounded-xl border px-3 py-3 ${border} ${wide ? 'col-span-2' : ''}`}>
      <p className="text-[10px] font-bold text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-black tabular-nums ${valueCls}`}>{value}</p>
    </div>
  )
}

function MetricPill({
  label,
  value,
  tone = 'violet'
}: {
  label: string
  value: string
  tone?: 'violet' | 'cyan' | 'amber' | 'rose'
}) {
  const borderCls =
    tone === 'cyan'
      ? 'border-cyan-500/30 bg-cyan-500/10'
      : tone === 'amber'
        ? 'border-amber-500/30 bg-amber-500/10'
        : tone === 'rose'
          ? 'border-rose-500/30 bg-rose-500/10'
          : 'border-violet-500/30 bg-violet-500/10'
  const labelCls =
    tone === 'cyan'
      ? 'text-cyan-200'
      : tone === 'amber'
        ? 'text-amber-200'
        : tone === 'rose'
          ? 'text-rose-200'
          : 'text-violet-200'
  const valueCls =
    tone === 'cyan'
      ? 'text-cyan-300'
      : tone === 'amber'
        ? 'text-amber-300'
        : tone === 'rose'
          ? 'text-rose-300'
          : 'text-white'

  return (
    <div className={`rounded-xl border px-3 py-2 ${borderCls}`}>
      <p className={`text-xs font-bold ${labelCls}`}>{label}</p>
      <p className={`text-lg font-black ${valueCls}`}>{value}</p>
    </div>
  )
}
