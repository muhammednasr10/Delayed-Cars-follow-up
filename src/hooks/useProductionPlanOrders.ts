import { useEffect, useMemo, useState } from 'react'
import { useCanManageProduction } from './useCanManageProduction'
import { useVehicles } from '../Context/VehiclesContext'
import { useLang } from '../i18n/LanguageContext'
import { resolveFamilyIdForVariant } from '../Components/VehicleModelFamilyPicker'
import {
  getModelPlanTargets,
  getYearMonthlyPlanTargets,
  planTargetsMap,
  wipCarryoverMap
} from '../services/modelProductionPlanService'
import {
  createProductionOrder,
  deleteProductionOrder,
  getProductionOrders,
  updateProductionOrder
} from '../services/productionOrdersService'
import { getMonthProductivityDetail } from '../services/productionPlanWorkDayDailyService'
import { getExitProductivityYear } from '../services/exitProductivityService'
import { getVehicleModels } from '../services/settingsService'
import { chassisRangeCount, vinInChassisRange } from '../Utils/chassisRange'
import { getProductionPlanWorkDays } from '../services/productionPlanWorkDaysService'
import { computeTaktMinutes } from '../Utils/productionLineRate'
import {
  buildAchievedByModelIdFromExitRecords,
  buildAnnualSectionsFromMonthlyPlans,
  buildPlanSections,
  planProgressPercent,
  sumPlanSectionsAchieved,
  sumPlanSectionsPlanned,
  sumPlanSectionsWip,
  type PlanSection
} from '../Utils/productionPlanSummary'
import type { PlanEntryMode } from '../Components/production/ProductionPlanEntryModal'
import { buildPlanOrdersCoverage, coverageByKey } from '../Utils/planOrdersCoverage'
import { buildOrdersExportRows, buildPlanSummaryExportRows } from '../Utils/planningExport'
import type { ProductionOrder } from '../Types/production'
import type { VehicleModel } from '../Types/settings'

function currentYm(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function useProductionPlanOrders(view: 'plan' | 'orders') {
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

  const planExportRows = useMemo(
    () => buildPlanSummaryExportRows(planSections, ordersCoverageMap),
    [planSections, ordersCoverageMap]
  )

  const ordersExportRows = useMemo(
    () => buildOrdersExportRows(orders, assemblyEntryByOrderId, modelLabel),
    [orders, assemblyEntryByOrderId]
  )

  return {
    t,
    canManage,
    planYear,
    setPlanYear,
    planMonth,
    setPlanMonth,
    orders,
    models,
    planTargets,
    annualSections,
    wipCarryover,
    achievedByModelId,
    loading,
    listsLoading,
    formOpen,
    setFormOpen,
    editingOrder,
    deleteTarget,
    setDeleteTarget,
    submitting,
    error,
    planSuccess,
    planModalOpen,
    setPlanModalOpen,
    planEntryMode,
    orderNumber,
    setOrderNumber,
    familyId,
    setFamilyId,
    modelId,
    setModelId,
    chassisStart,
    setChassisStart,
    chassisEnd,
    setChassisEnd,
    expandedMonthlyFamilies,
    expandedAnnualFamilies,
    availableDays,
    availableHours,
    lineJph,
    carCount,
    assemblyEntryByOrderId,
    planSections,
    planMonthValue,
    planTotals,
    planProgress,
    annualProgress,
    ordersCoverageMap,
    lineTaktMinutes,
    toggleMonthlyFamily,
    toggleAnnualFamily,
    openPlanModal,
    handlePlanSaved,
    openCreateOrder,
    openEditOrder,
    confirmDeleteOrder,
    resetForm,
    submit,
    modelLabel,
    planExportRows,
    ordersExportRows
  }
}
