import type {
  PlanDayType,
  ProductionPlanWorkDayEdit,
  ProductionPlanWorkDayRow
} from '../Types/productionPlanWorkDayDaily'
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

export function monthThroughDate(year: number, month: number, today: string): string {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0)
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
  if (today < start) return ''
  if (today > end) return end
  return today
}

export function previousIsoDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() - 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** آخر يوم خلص. النهاردة لسه شغالة فما تتحسبش ضمن الأيام المنقضية. */
export function completedWorkThroughDate(year: number, month: number, today: string): string {
  const throughToday = monthThroughDate(year, month, today)
  if (!throughToday || throughToday !== today) return throughToday
  const yesterday = previousIsoDate(today)
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  return yesterday < start ? '' : yesterday
}

export function isElapsedWorkingDay(
  row: Pick<ProductionPlanWorkDayRow, 'dayType' | 'actualHours' | 'workDespiteVacation'>
): boolean {
  if (row.dayType === 'work' || row.dayType === 'overtime') return true
  return row.workDespiteVacation || (isVacationOrFactoryHoliday(row.dayType) && row.actualHours > 0)
}

/** ساعة اليوم المحسوبة: الفعلية إن وُجدت، وإلا ساعة الخطة. */
export function hoursCountedForDay(row: Pick<ProductionPlanWorkDayRow, 'plannedHours' | 'actualHours'>): number {
  return row.actualHours > 0 ? row.actualHours : row.plannedHours
}

/** أيام وساعات العمل التي مرّت حتى التاريخ، من جدول أيام الشهر. */
export function elapsedWorkTotals(
  rows: Pick<
    ProductionPlanWorkDayRow,
    'workDate' | 'dayType' | 'plannedHours' | 'actualHours' | 'workDespiteVacation'
  >[],
  throughDate: string
): { days: number; hours: number } {
  let days = 0
  let hours = 0
  if (!throughDate) return { days, hours }
  for (const row of rows) {
    if (row.workDate > throughDate || !isElapsedWorkingDay(row)) continue
    days += 1
    hours += hoursCountedForDay(row)
  }
  return { days, hours: Math.round(hours * 10) / 10 }
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
    if (row.dayType === 'work' || row.dayType === 'overtime') {
      const plannedHours = row.plannedHours > 0 ? row.plannedHours : defaultPlannedHoursForDayType(row.dayType)
      const actualHours = row.actualHours > 0 ? row.actualHours : plannedHours
      return { ...row, plannedHours, actualHours }
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

/** الهدف اليومي لإنتاجية الدخول/الخروج — السيارات الضائعة = الهدف − الإنتاجية */
export const DAILY_PRODUCTIVITY_TARGET = 75

export function computeProductivityLostCars(productivity: number, target = DAILY_PRODUCTIVITY_TARGET): number {
  if (productivity <= 0) return target === DAILY_PRODUCTIVITY_TARGET ? 0 : Math.max(0, target)
  return Math.max(0, target - productivity)
}

/** الباقي من الضائع بعد خصم سيارات التوقفات */
export function computeProductivityLossRemainder(productivity: number, stopLostVehicles: number): number {
  return Math.max(0, computeProductivityLostCars(productivity) - stopLostVehicles)
}

export function computeProductivityDeficit(actualHours: number, lineJph: number, productivity: number): number {
  if (lineJph <= 0) return 0
  return Math.round(actualHours * lineJph - productivity)
}

/** @deprecated use computeProductivityDeficit */
export function computeTotalLostVehicles(actualHours: number, lineJph: number, entryProductivity: number): number {
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
