import type { PlanDayType, ProductionPlanWorkDayEdit, ProductionPlanWorkDayRow } from '../Types/productionPlanWorkDayDaily'
import { defaultWorkDayRow } from '../Types/productionPlanWorkDayDaily'
import { listDatesInMonth } from '../services/entryProductivityService'
import { DEFAULT_PLANNED_WORK_HOURS } from './workScheduleDefaults'

export function countDayTypes(rows: Pick<ProductionPlanWorkDayRow, 'dayType'>[]): {
  workingDays: number
  vacationDays: number
  overtimeDays: number
} {
  let workingDays = 0
  let vacationDays = 0
  let overtimeDays = 0
  for (const row of rows) {
    if (row.dayType === 'work') workingDays += 1
    else if (row.dayType === 'overtime') overtimeDays += 1
    else if (row.dayType === 'vacation' || row.dayType === 'factory_vacation' || row.dayType === 'substitute') {
      vacationDays += 1
    }
  }
  return { workingDays, vacationDays, overtimeDays }
}

export function availableDaysFromRows(rows: Pick<ProductionPlanWorkDayRow, 'dayType'>[]): number {
  const { workingDays, overtimeDays } = countDayTypes(rows)
  return workingDays + overtimeDays
}

export function totalPlannedHoursFromRows(rows: Pick<ProductionPlanWorkDayRow, 'plannedHours'>[]): number {
  return rows.reduce((sum, row) => sum + row.plannedHours, 0)
}

export function buildMonthWorkDayRows(
  year: number,
  month: number,
  saved: ProductionPlanWorkDayRow[]
): ProductionPlanWorkDayRow[] {
  const byDate = new Map(saved.map(row => [row.workDate, row]))
  return listDatesInMonth(year, month).map(workDate => {
    const row = byDate.get(workDate) ?? defaultWorkDayRow(workDate)
    if (row.dayType === 'vacation' || row.dayType === 'factory_vacation') {
      const workDespiteVacation = row.workDespiteVacation || row.actualHours > 0
      return { ...row, plannedHours: 0, workDespiteVacation }
    }
    if ((row.dayType === 'work' || row.dayType === 'overtime') && row.plannedHours === 0) {
      return { ...row, plannedHours: defaultPlannedHoursForDayType(row.dayType) }
    }
    return row
  })
}

export function dayTypeBadgeClass(dayType: PlanDayType): string {
  switch (dayType) {
    case 'work':
      return 'text-emerald-300 bg-emerald-500/15'
    case 'overtime':
      return 'text-amber-300 bg-amber-500/15'
    case 'vacation':
      return 'text-sky-300 bg-sky-500/15'
    case 'factory_vacation':
      return 'text-violet-300 bg-violet-500/15'
    case 'substitute':
      return 'text-rose-300 bg-rose-500/15'
  }
}

export function mergeProductivityIntoRows(
  rows: ProductionPlanWorkDayRow[],
  entryByDate: Map<string, number>,
  exitByDate: Map<string, number>,
  repairByDate: Map<string, number> = new Map()
): ProductionPlanWorkDayEdit[] {
  return rows.map(row => ({
    ...row,
    entryProductivity: entryByDate.get(row.workDate) ?? 0,
    exitProductivity: exitByDate.get(row.workDate) ?? 0,
    repairProductivity: repairByDate.get(row.workDate) ?? 0,
    stopMinutes: 0,
    stopLostVehicles: 0,
    laborAttendanceEfficiency: null,
    totalLostVehicles: 0
  }))
}

export function computeProductivityDeficit(
  actualHours: number,
  lineJph: number,
  productivity: number
): number {
  if (lineJph <= 0) return 0
  return Math.round(actualHours * lineJph - productivity)
}

/** @deprecated use computeProductivityDeficit */
export function computeTotalLostVehicles(
  actualHours: number,
  lineJph: number,
  entryProductivity: number
): number {
  return computeProductivityDeficit(actualHours, lineJph, entryProductivity)
}

export function mergeStopsIntoRows(
  rows: ProductionPlanWorkDayEdit[],
  minutesByDate: Map<string, number>,
  lostVehiclesByDate: Map<string, number>,
  attendanceEfficiencyByDate: Map<string, number | null> = new Map()
): ProductionPlanWorkDayEdit[] {
  return rows.map(row => {
    const stopMinutes = minutesByDate.get(row.workDate) ?? 0
    const stopLostVehicles = lostVehiclesByDate.get(row.workDate) ?? 0
    return {
      ...row,
      stopMinutes,
      stopLostVehicles,
      totalStops: stopMinutes / 60,
      laborAttendanceEfficiency: attendanceEfficiencyByDate.get(row.workDate) ?? null,
      totalLostVehicles: 0
    }
  })
}

export function defaultPlannedHoursForDayType(dayType: PlanDayType): number {
  return dayType === 'work' || dayType === 'overtime' ? DEFAULT_PLANNED_WORK_HOURS : 0
}

export function isVacationOrFactoryHoliday(dayType: PlanDayType): boolean {
  return dayType === 'vacation' || dayType === 'factory_vacation'
}

export function resolveWorkDespiteVacation(
  row: Pick<ProductionPlanWorkDayRow, 'dayType' | 'actualHours' | 'workDespiteVacation'>
): boolean {
  if (!isVacationOrFactoryHoliday(row.dayType)) return false
  return row.workDespiteVacation || row.actualHours > 0
}

export function isActualHoursLocked(
  row: Pick<ProductionPlanWorkDayRow, 'dayType' | 'actualHours' | 'workDespiteVacation'>
): boolean {
  return isVacationOrFactoryHoliday(row.dayType) && !resolveWorkDespiteVacation(row)
}

export function resolveLaborAttendanceEfficiency(
  row: Pick<ProductionPlanWorkDayEdit, 'dayType' | 'actualHours' | 'laborAttendanceEfficiency'>
): number | null {
  if (isVacationOrFactoryHoliday(row.dayType) && row.actualHours <= 0) return null
  return row.laborAttendanceEfficiency
}
