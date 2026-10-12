import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCanManageProduction } from './useCanManageProduction'
import { useLang } from '../i18n/LanguageContext'
import type { ProductionPlanWorkDayEdit, ProductionPlanWorkDayRow } from '../Types/productionPlanWorkDayDaily'
import {
  availableDaysFromRows,
  buildMonthWorkDayRows,
  mergeProductivityIntoRows,
  mergeStopsIntoRows
} from '../Utils/productionPlanWorkDayDaily'
import {
  bulkUpsertProductionPlanWorkDays,
  getMonthProductivityDetail,
  getProductionPlanWorkDaysMonth
} from '../services/productionPlanWorkDayDailyService'
import { formatAuthApiError } from '../services/authService'
import { aggregateStopsByDate, countsInStopTotals, getProductionLineStops } from '../services/productionStopService'
import { computeDailyAttendanceEfficiency, getAttendanceDaysForMonth } from '../services/attendanceService'
import { getEmployees } from '../services/employeesService'
import { getProductivityDelayReasonsMonth } from '../services/productivityDelayReasonsService'
import { getModelPlanTargets } from '../services/modelProductionPlanService'
import { expandPlanTargetsWithBundles, sumPlanTargetsOnce } from '../Utils/planBundles'
import { localTodayIso } from '../Utils/planningDailyTracking'
import { applyWorkDayPatch } from '../Utils/patchWorkDayRow'
import { summarizeWorkDays, withDailyDeficits } from '../Utils/workDaysSummary'
import { delayReasonKey, formatDayLabel, formatEfficiency } from '../Utils/workDayLabels'
import { getProductionPlanWorkDays } from '../services/productionPlanWorkDaysService'
import type { ProductivityDelayKind } from '../Types/productivityDelayReason'
import { useLineSection } from './useLineSection'
import { buildModelProductivityBreakdown } from '../Utils/productivityBreakdown'
import { buildWorkDaysExportRows } from '../Utils/planningExport'
import type { EntryProductivityDay } from '../Types/entryProductivity'
import type { VehicleModel } from '../Types/settings'
import type { ProductionLineStop } from '../Types/productionStop'

function currentYm(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function useWorkDaysData(
  onAvailableDaysChange: ((count: number) => void) | undefined,
  variant: 'workDays' | 'summary'
) {
  const isWorkDaysOnly = variant === 'workDays'
  const section = useLineSection()
  const area = isWorkDaysOnly ? 'assembly' : section
  const { t, lang } = useLang()
  const canManageProduction = useCanManageProduction()
  const canEditRows = canManageProduction && isWorkDaysOnly

  const init = currentYm()
  const [year, setYear] = useState(init.year)
  const [month, setMonth] = useState(init.month)
  const [rows, setRows] = useState<ProductionPlanWorkDayEdit[]>([])
  const [entryRecords, setEntryRecords] = useState<EntryProductivityDay[]>([])
  const [exitRecords, setExitRecords] = useState<EntryProductivityDay[]>([])
  const [repairRecords, setRepairRecords] = useState<EntryProductivityDay[]>([])
  const [delayReasonsByKey, setDelayReasonsByKey] = useState<Map<string, string>>(new Map())
  const [lossReasonsModal, setLossReasonsModal] = useState<{
    workDate: string
    kind: ProductivityDelayKind
    deficit: number
    productivity: number
    stopLostVehicles: number
    dailyPlan: number
  } | null>(null)
  const [monthlyPlan, setMonthlyPlan] = useState(0)
  const [lineJph, setLineJph] = useState(0)
  const [monthStops, setMonthStops] = useState<ProductionLineStop[]>([])
  const [productivityModels, setProductivityModels] = useState<VehicleModel[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const saveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const monthValue = `${year}-${String(month).padStart(2, '0')}`
  const availableDays = useMemo(() => availableDaysFromRows(rows), [rows])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const [saved, productivity, stops, employees, attendanceDays, planTargets, workConfig] = await Promise.all([
        getProductionPlanWorkDaysMonth(year, month),
        getMonthProductivityDetail(year, month, area),
        getProductionLineStops(year, month, area).catch(() => []),
        getEmployees().catch(() => []),
        getAttendanceDaysForMonth(year, month).catch(() => []),
        getModelPlanTargets(year, month).catch(() => []),
        getProductionPlanWorkDays(year, month).catch(() => null)
      ])
      const useLinePlan = area === 'assembly'
      setMonthlyPlan(useLinePlan ? sumPlanTargetsOnce(expandPlanTargetsWithBundles(planTargets)) : 0)
      setLineJph(useLinePlan ? (workConfig?.lineJph ?? 0) : 0)
      const activeEmployeeIds = employees.filter(e => e.isActive).map(e => e.id)
      const attendanceEfficiencyByDate = computeDailyAttendanceEfficiency(
        activeEmployeeIds,
        year,
        month,
        attendanceDays.map(d => ({ employeeId: d.employeeId, workDate: d.workDate, status: d.status })),
        undefined,
        new Map(saved.map(r => [r.workDate, r.dayType]))
      )
      const { minutesByDate, lostVehiclesByDate } = aggregateStopsByDate(stops.filter(countsInStopTotals))
      const base = buildMonthWorkDayRows(year, month, saved)
      const merged = mergeStopsIntoRows(
        mergeProductivityIntoRows(base, productivity.entryByDate, productivity.exitByDate, productivity.repairByDate),
        minutesByDate,
        lostVehiclesByDate,
        attendanceEfficiencyByDate
      )
      setEntryRecords(productivity.entryRecords)
      setExitRecords(productivity.exitRecords)
      setRepairRecords(productivity.repairRecords)
      const [entryReasons, exitReasons, repairReasons] = await Promise.all([
        getProductivityDelayReasonsMonth(year, month, 'entry', area).catch(() => []),
        getProductivityDelayReasonsMonth(year, month, 'exit', area).catch(() => []),
        getProductivityDelayReasonsMonth(year, month, 'repair', area).catch(() => [])
      ])
      const reasonsMap = new Map<string, string>()
      for (const record of [...entryReasons, ...exitReasons, ...repairReasons]) {
        reasonsMap.set(delayReasonKey(record.workDate, record.kind), record.reasons)
      }
      setDelayReasonsByKey(reasonsMap)
      setMonthStops(stops)
      setProductivityModels(productivity.models)
      setRows(merged)
      onAvailableDaysChange?.(availableDaysFromRows(merged))
    } catch (e) {
      setError(formatAuthApiError(e instanceof Error ? e.message : t('common.error')))
    } finally {
      setLoading(false)
    }
  }, [year, month, area, t, onAvailableDaysChange])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    return () => {
      for (const timer of saveTimersRef.current.values()) clearTimeout(timer)
      saveTimersRef.current.clear()
    }
  }, [])

  const persistRow = useCallback(
    async (row: ProductionPlanWorkDayRow) => {
      if (!canEditRows) return
      setSaving(true)
      setError('')
      try {
        await bulkUpsertProductionPlanWorkDays([
          {
            workDate: row.workDate,
            dayType: row.dayType,
            plannedHours: row.plannedHours,
            actualHours: row.actualHours,
            totalStops: row.totalStops,
            workDespiteVacation: row.workDespiteVacation,
            notes: row.notes
          }
        ])
        setSuccess(t('productionOrders.workDaysTab.saved'))
        window.setTimeout(() => setSuccess(''), 2000)
      } catch (e) {
        setError(formatAuthApiError(e instanceof Error ? e.message : t('common.error')))
      } finally {
        setSaving(false)
      }
    },
    [canEditRows, t]
  )

  function scheduleSaveRow(row: ProductionPlanWorkDayEdit) {
    if (!canEditRows) return
    const existing = saveTimersRef.current.get(row.workDate)
    if (existing) clearTimeout(existing)
    saveTimersRef.current.set(
      row.workDate,
      setTimeout(() => {
        saveTimersRef.current.delete(row.workDate)
        void persistRow(row)
      }, 600)
    )
  }

  function flushSaveRow(row: ProductionPlanWorkDayEdit) {
    if (!canEditRows) return
    const existing = saveTimersRef.current.get(row.workDate)
    if (existing) {
      clearTimeout(existing)
      saveTimersRef.current.delete(row.workDate)
    }
    void persistRow(row)
  }

  function patchRow(index: number, patch: Partial<ProductionPlanWorkDayEdit>) {
    setRows(prev => {
      const next = prev.map((row, i) => (i === index ? applyWorkDayPatch(row, patch) : row))
      const updatedRow = next[index]
      if (updatedRow) scheduleSaveRow(updatedRow)
      onAvailableDaysChange?.(availableDaysFromRows(next))
      return next
    })
  }

  const monthBreakdown = useMemo(
    () => buildModelProductivityBreakdown(entryRecords, exitRecords, productivityModels, undefined, repairRecords),
    [entryRecords, exitRecords, repairRecords, productivityModels]
  )

  function dayBreakdown(workDate: string) {
    return buildModelProductivityBreakdown(entryRecords, exitRecords, productivityModels, workDate, repairRecords)
  }

  const displayRows = useMemo(() => withDailyDeficits(rows, monthlyPlan), [rows, monthlyPlan])

  const totals = useMemo(
    () => summarizeWorkDays(displayRows, lineJph, year, month, localTodayIso()),
    [displayRows, lineJph, year, month]
  )

  const workDaysExportRows = useMemo(
    () =>
      buildWorkDaysExportRows(
        rows,
        d => formatDayLabel(d, lang),
        dayType => t(`productionOrders.workDaysTab.dayTypes.${dayType}`),
        formatEfficiency
      ),
    [rows, lang, t]
  )

  return {
    t,
    lang,
    isWorkDaysOnly,
    canEditRows,
    canManageProduction,
    year,
    setYear,
    month,
    setMonth,
    rows,
    monthValue,
    availableDays,
    loading,
    saving,
    error,
    success,
    lossReasonsModal,
    setLossReasonsModal,
    monthStops,
    delayReasonsByKey,
    delayReasonKey,
    monthBreakdown,
    dayBreakdown,
    displayRows,
    totals,
    patchRow,
    flushSaveRow,
    workDaysExportRows
  }
}

export { delayReasonKey, formatDayLabel, formatEfficiency }
