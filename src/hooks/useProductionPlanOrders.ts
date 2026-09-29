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
import { getVehicleColors, getVehicleModels } from '../services/settingsService'
import { chassisRangeCount, vinInChassisRange } from '../Utils/chassisRange'
import { getProductionPlanWorkDays } from '../services/productionPlanWorkDaysService'
import { computeTaktMinutes } from '../Utils/productionLineRate'
import {
  buildAchievedByModelIdFromExitRecords,
  buildAnnualSectionsFromMonthlyPlans,
  buildPlanSections,
  onlyActiveParentSections,
  planProgressPercent,
  sumPlanSectionsAchieved,
  sumPlanSectionsPlanned,
  sumPlanSectionsWip,
  type PlanSection
} from '../Utils/productionPlanSummary'
import { overlayPlanBundles, readPlanBundles } from '../Utils/planBundles'
import type { PlanEntryMode } from '../Components/production/ProductionPlanEntryModal'
import { buildPlanOrdersCoverage, coverageByKey } from '../Utils/planOrdersCoverage'
import { orderVisibleInPlanMonth } from '../Utils/productionOrderMonth'
import { buildOrdersExportRows, buildPlanSummaryExportRows } from '../Utils/planningExport'
import type { ProductionOrder, ProductionOrderColorInput } from '../Types/production'
import type { VehicleColor, VehicleModel } from '../Types/settings'
import type { VehicleOverview } from '../Types/vehicle'

function currentYm(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocalValue(v: string): string | null {
  if (!v.trim()) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export type OrderColorDraft = { colorId: string; qty: string }
export type AssemblyEntrySort = 'desc' | 'asc'

export function useProductionPlanOrders(view: 'plan' | 'orders') {
  const { t } = useLang()
  const canManage = useCanManageProduction()
  const { vehicles, refresh: refreshVehicles } = useVehicles()

  const initYm = currentYm()
  const [planYear, setPlanYear] = useState(initYm.year)
  const [planMonth, setPlanMonth] = useState(initYm.month)
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])
  const [vehicleColors, setVehicleColors] = useState<VehicleColor[]>([])
  const [planTargets, setPlanTargets] = useState<Map<string, number>>(new Map())
  const [planGroupByModel, setPlanGroupByModel] = useState<Map<string, string>>(new Map())
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
  const [assemblyEntrySort, setAssemblyEntrySort] = useState<AssemblyEntrySort>('desc')

  const [orderNumber, setOrderNumber] = useState('')
  const [familyId, setFamilyId] = useState('')
  const [modelId, setModelId] = useState('')
  const [chassisStart, setChassisStart] = useState('')
  const [chassisEnd, setChassisEnd] = useState('')
  const [openedAtLocal, setOpenedAtLocal] = useState('')
  const [colorDrafts, setColorDrafts] = useState<OrderColorDraft[]>([])

  const [expandedMonthlyFamilies, setExpandedMonthlyFamilies] = useState<Set<string>>(new Set())
  const [expandedAnnualFamilies, setExpandedAnnualFamilies] = useState<Set<string>>(new Set())
  const [availableDays, setAvailableDays] = useState(0)
  const [availableHours, setAvailableHours] = useState(0)
  const [lineJph, setLineJph] = useState(0)

  const carCount = useMemo(() => chassisRangeCount(chassisStart, chassisEnd), [chassisStart, chassisEnd])

  const colorQtyTotal = useMemo(
    () => colorDrafts.reduce((sum, row) => sum + (Number(row.qty) > 0 ? Math.floor(Number(row.qty)) : 0), 0),
    [colorDrafts]
  )

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

  const shortageVehiclesByOrderId = useMemo(() => {
    const map = new Map<string, VehicleOverview[]>()
    for (const order of orders) {
      const start = order.chassisStart ?? ''
      const end = order.chassisEnd ?? ''
      const list = vehicles.filter(v => {
        const inRange = Boolean(start && end && vinInChassisRange(v.vin, start, end))
        const linked = v.productionOrderId === order.id
        return (inRange || linked) && v.openMissingCount > 0
      })
      map.set(order.id, list)
    }
    return map
  }, [orders, vehicles])

  const visibleOrders = useMemo(() => {
    const filtered = orders.filter(order =>
      orderVisibleInPlanMonth(order, planYear, planMonth, assemblyEntryByOrderId.get(order.id) ?? 0)
    )
    return [...filtered].sort((a, b) => {
      const ea = assemblyEntryByOrderId.get(a.id) ?? 0
      const eb = assemblyEntryByOrderId.get(b.id) ?? 0
      if (ea !== eb) return assemblyEntrySort === 'desc' ? eb - ea : ea - eb
      const oa = a.openedAt ?? a.createdAt ?? ''
      const ob = b.openedAt ?? b.createdAt ?? ''
      return ob.localeCompare(oa)
    })
  }, [orders, planYear, planMonth, assemblyEntryByOrderId, assemblyEntrySort])

  const planSections = useMemo(
    () =>
      onlyActiveParentSections(
        buildPlanSections(models, planTargets, achievedByModelId, wipCarryover, planGroupByModel),
        models
      ),
    [models, planTargets, achievedByModelId, wipCarryover, planGroupByModel]
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
      const [orderRows, modelRows, colorRows, dbTargets, yearMonthlyTargets, yearExitRows, workConfig, productivity] =
        await Promise.all([
          getProductionOrders(),
          getVehicleModels(),
          view === 'orders' ? getVehicleColors().catch(() => []) : Promise.resolve([] as VehicleColor[]),
          getModelPlanTargets(planYear, planMonth).catch(() => []),
          view === 'plan' ? getYearMonthlyPlanTargets(planYear).catch(() => []) : Promise.resolve([]),
          view === 'plan' ? getExitProductivityYear(planYear).catch(() => []) : Promise.resolve([]),
          getProductionPlanWorkDays(planYear, planMonth).catch(() => null),
          view === 'plan' ? getMonthProductivityDetail(planYear, planMonth).catch(() => null) : Promise.resolve(null)
        ])
      setOrders(orderRows)
      setModels(modelRows)
      setVehicleColors(colorRows)
      const painted = overlayPlanBundles(
        planTargetsMap(dbTargets),
        wipCarryoverMap(dbTargets),
        readPlanBundles(planYear, planMonth)
      )
      setPlanTargets(painted.targets)
      setPlanGroupByModel(painted.groups)
      setWipCarryover(painted.wip)
      setAvailableDays(workConfig?.availableDays ?? 0)
      setAvailableHours(workConfig?.availableHours ?? 0)
      setLineJph(workConfig?.lineJph ?? 0)
      if (productivity) {
        setAchievedByModelId(buildAchievedByModelIdFromExitRecords(productivity.exitRecords))
      } else {
        setAchievedByModelId(new Map())
      }
      setAnnualSections(
        onlyActiveParentSections(
          buildAnnualSectionsFromMonthlyPlans(modelRows, yearMonthlyTargets, yearExitRows),
          modelRows
        )
      )
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
    Promise.all([getVehicleModels(), getVehicleColors()])
      .then(([m, c]) => {
        setModels(m)
        setVehicleColors(c)
      })
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
    setOpenedAtLocal(toDatetimeLocalValue(new Date().toISOString()))
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
    setOpenedAtLocal(toDatetimeLocalValue(row.openedAt ?? row.createdAt))
    setColorDrafts(
      (row.colors ?? []).map(c => ({
        colorId: c.colorId,
        qty: String(c.qty)
      }))
    )
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
    setOpenedAtLocal('')
    setColorDrafts([])
    setEditingOrder(null)
    setError('')
  }

  function addColorDraft() {
    setColorDrafts(prev => [...prev, { colorId: '', qty: '' }])
  }

  function patchColorDraft(index: number, patch: Partial<OrderColorDraft>) {
    setColorDrafts(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function removeColorDraft(index: number) {
    setColorDrafts(prev => prev.filter((_, i) => i !== index))
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
    if (colorDrafts.some(c => c.colorId && !(Number(c.qty) > 0))) {
      setError(t('productionOrders.colorQtyRequired'))
      return
    }
    if (colorQtyTotal > 0 && colorQtyTotal !== qty) {
      setError(t('productionOrders.colorQtyMismatch', { colors: colorQtyTotal, cars: qty }))
      return
    }

    const colors: ProductionOrderColorInput[] = colorDrafts
      .filter(c => c.colorId && Number(c.qty) > 0)
      .map(c => ({ colorId: c.colorId, qty: Math.floor(Number(c.qty)) }))

    setSubmitting(true)
    try {
      const payload = {
        orderNumber: orderNumber.trim(),
        modelId,
        plannedQty: qty,
        chassisStart: chassisStart.trim(),
        chassisEnd: chassisEnd.trim(),
        openedAt: fromDatetimeLocalValue(openedAtLocal) ?? new Date().toISOString(),
        colors
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

  function formatOpenedAt(row: ProductionOrder): string {
    const raw = row.openedAt ?? row.createdAt
    if (!raw) return '—'
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString()
  }

  const planExportRows = useMemo(
    () => buildPlanSummaryExportRows(planSections, ordersCoverageMap),
    [planSections, ordersCoverageMap]
  )

  const ordersExportRows = useMemo(
    () => buildOrdersExportRows(visibleOrders, assemblyEntryByOrderId, modelLabel),
    [visibleOrders, assemblyEntryByOrderId]
  )

  return {
    t,
    canManage,
    planYear,
    setPlanYear,
    planMonth,
    setPlanMonth,
    orders: visibleOrders,
    allOrders: orders,
    models,
    vehicleColors,
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
    openedAtLocal,
    setOpenedAtLocal,
    colorDrafts,
    addColorDraft,
    patchColorDraft,
    removeColorDraft,
    colorQtyTotal,
    assemblyEntrySort,
    setAssemblyEntrySort,
    expandedMonthlyFamilies,
    expandedAnnualFamilies,
    availableDays,
    availableHours,
    lineJph,
    carCount,
    assemblyEntryByOrderId,
    shortageVehiclesByOrderId,
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
    formatOpenedAt,
    planExportRows,
    ordersExportRows
  }
}

export type ProductionPlanOrdersState = ReturnType<typeof useProductionPlanOrders>
