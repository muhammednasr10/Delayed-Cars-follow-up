import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCanManageProduction } from './useCanManageProduction'
import { useLang } from '../i18n/LanguageContext'
import {
  type PlanDayType,
  type ProductionPlanWorkDayEdit,
  type ProductionPlanWorkDayRow
} from '../Types/productionPlanWorkDayDaily'
import {
  availableDaysFromRows,
  buildMonthWorkDayRows,
  computeProductivityLostCars,
  defaultPlannedHoursForDayType,
  isVacationOrFactoryHoliday,
  isActualHoursLocked,
  resolveLaborAttendanceEfficiency,
  mergeProductivityIntoRows,
  mergeStopsIntoRows
} from '../Utils/productionPlanWorkDayDaily'
import {
  bulkUpsertProductionPlanWorkDays,
  getMonthProductivityDetail,
  getProductionPlanWorkDaysMonth
} from '../services/productionPlanWorkDayDailyService'
import { formatAuthApiError } from '../services/authService'
import { getProductionLineStops, aggregateStopsByDate } from '../services/productionStopService'
import { computeDailyAttendanceEfficiency, getAttendanceDaysForMonth } from '../services/attendanceService'
import { getEmployees } from '../services/employeesService'
import { getProductivityDelayReasonsMonth } from '../services/productivityDelayReasonsService'
import type { ProductivityDelayKind } from '../Types/productivityDelayReason'
import { buildModelProductivityBreakdown } from '../Utils/productivityBreakdown'
import { buildWorkDaysExportRows } from '../Utils/planningExport'
import type { EntryProductivityDay } from '../Types/entryProductivity'
import type { VehicleModel } from '../Types/settings'
import type { ProductionLineStop } from '../Types/productionStop'

function currentYm(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function delayReasonKey(workDate: string, kind: ProductivityDelayKind): string {
  return `${workDate}|${kind}`
}

export function useWorkDaysData(
  onAvailableDaysChange: ((count: number) => void) | undefined,
  variant: 'workDays' | 'summary'
) {
  const isWorkDaysOnly = variant === 'workDays'
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
  } | null>(null)
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
      const [saved, productivity, stops, employees, attendanceDays] = await Promise.all([
        getProductionPlanWorkDaysMonth(year, month),
        getMonthProductivityDetail(year, month),
        getProductionLineStops(year, month).catch(() => []),
        getEmployees().catch(() => []),
        getAttendanceDaysForMonth(year, month).catch(() => [])
      ])
      const activeEmployeeIds = employees.filter(e => e.isActive).map(e => e.id)
      const attendanceEfficiencyByDate = computeDailyAttendanceEfficiency(
        activeEmployeeIds,
        year,
        month,
        attendanceDays.map(d => ({ employeeId: d.employeeId, workDate: d.workDate, status: d.status })),
        undefined,
        new Map(saved.map(r => [r.workDate, r.dayType]))
      )
      const { minutesByDate, lostVehiclesByDate } = aggregateStopsByDate(stops)
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
        getProductivityDelayReasonsMonth(year, month, 'entry').catch(() => []),
        getProductivityDelayReasonsMonth(year, month, 'exit').catch(() => []),
        getProductivityDelayReasonsMonth(year, month, 'repair').catch(() => [])
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
  }, [year, month, t, onAvailableDaysChange])

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
      const next = prev.map((row, i) => {
        if (i !== index) return row
        const updated = { ...row, ...patch }
        if (patch.dayType && patch.plannedHours === undefined) {
          updated.plannedHours = defaultPlannedHoursForDayType(patch.dayType)
          if (isVacationOrFactoryHoliday(patch.dayType)) {
            updated.workDespiteVacation = false
            updated.actualHours = 0
          } else {
            updated.workDespiteVacation = false
          }
        }
        if (patch.workDespiteVacation === false) {
          updated.actualHours = 0
        }
        return updated
      })
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

  const displayRows = useMemo(
    () =>
      rows.map(row => ({
        ...row,
        entryDeficit: computeProductivityLostCars(row.entryProductivity),
        exitDeficit: computeProductivityLostCars(row.exitProductivity)
      })),
    [rows]
  )

  const totals = useMemo(() => {
    const efficiencyValues = displayRows
      .map(r => resolveLaborAttendanceEfficiency(r))
      .filter((v): v is number => v != null)
    const laborAttendanceEfficiency =
      efficiencyValues.length > 0
        ? Math.round(efficiencyValues.reduce((sum, v) => sum + v, 0) / efficiencyValues.length)
        : null
    return {
      plannedHours: displayRows.reduce((sum, row) => sum + row.plannedHours, 0),
      actualHours: displayRows.reduce((sum, row) => sum + row.actualHours, 0),
      laborAttendanceEfficiency,
      entryProductivity: displayRows.reduce((sum, row) => sum + row.entryProductivity, 0),
      entryDeficit: displayRows.reduce((sum, row) => sum + row.entryDeficit, 0),
      stopMinutes: displayRows.reduce((sum, row) => sum + row.stopMinutes, 0),
      stopLostVehicles: displayRows.reduce((sum, row) => sum + row.stopLostVehicles, 0),
      exitProductivity: displayRows.reduce((sum, row) => sum + row.exitProductivity, 0),
      exitDeficit: displayRows.reduce((sum, row) => sum + row.exitDeficit, 0),
      repairProductivity: displayRows.reduce((sum, row) => sum + row.repairProductivity, 0)
    }
  }, [displayRows])

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

function formatDayLabel(workDate: string, lang: string): string {
  const d = new Date(workDate + 'T12:00:00')
  const weekday = d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long' })
  return `${weekday} ${d.getDate()}`
}

function formatEfficiency(value: number | null): string {
  return value == null ? '—' : `${value}%`
}

export { formatDayLabel, formatEfficiency, delayReasonKey }
