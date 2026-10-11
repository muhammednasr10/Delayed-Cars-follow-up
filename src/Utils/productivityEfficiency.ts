import type { ProductionPlanWorkDayRow } from '../Types/productionPlanWorkDayDaily'
import {
  completedWorkThroughDate,
  hoursCountedForDay,
  isElapsedWorkingDay,
  monthThroughDate
} from './productionPlanWorkDayDaily'
import { achievementPercent, planDueThroughDate, type DailyTrackingSourceRow } from './planningDailyTracking'
import { planProgressPercent } from './productionPlanSummary'

type EfficiencyRow = Pick<
  ProductionPlanWorkDayRow,
  'workDate' | 'dayType' | 'plannedHours' | 'actualHours' | 'workDespiteVacation'
>

/** السيارات المتوقعة حتى تاريخ = ساعات أيام العمل المنقضية × معدل الخط. */
export function expectedVehiclesThroughDate(rows: EfficiencyRow[], lineJph: number, throughDate: string): number {
  if (lineJph <= 0 || !throughDate) return 0
  let expected = 0
  for (const row of rows) {
    if (row.workDate > throughDate || !isElapsedWorkingDay(row)) continue
    const hours = hoursCountedForDay(row)
    if (hours <= 0) continue
    expected += hours * lineJph
  }
  return expected
}

function vehiclesThroughDate(productivityByDate: Map<string, number>, throughDate: string): number {
  let actual = 0
  for (const [date, qty] of productivityByDate) {
    if (date > throughDate) continue
    actual += qty
  }
  return actual
}

/**
 * كفاءة الدخول أو الخروج.
 * السيارات المسجّلة حتى النهاردة ÷ (ساعات أيام العمل التي خلصت × JPH).
 * النهاردة مش في المقام لأن يومها لسه ما خلصش.
 */
export function lineProductivityEfficiency(
  rows: EfficiencyRow[],
  lineJph: number,
  productivityByDate: Map<string, number>,
  actualThrough: string,
  expectedThrough = actualThrough
): number | null {
  const expected = expectedVehiclesThroughDate(rows, lineJph, expectedThrough)
  if (expected <= 0) return null
  return achievementPercent(expected, vehiclesThroughDate(productivityByDate, actualThrough))
}

/** الخروج ÷ خطة الشهر كلها. */
export function planEfficiencyAgainstFullMonth(monthlyPlan: number, exitAchieved: number): number {
  return achievementPercent(monthlyPlan, exitAchieved) ?? planProgressPercent(monthlyPlan, exitAchieved)
}

/**
 * عجز التجميع = (هدف الأيام المنقضية − إنتاجية الدخول) − سيارات التوقف.
 * الهدف = ساعات الأيام التي خلصت × معدل الخط. النهاردة مش في الهدف.
 */
export function assemblyDeficitFromEntry(
  expectedVehicles: number,
  entryProductivity: number,
  stopLostVehicles: number
): number {
  return Math.max(0, Math.round(expectedVehicles) - entryProductivity - stopLostVehicles)
}

export function assemblyDeficitForCompletedDays(
  rows: EfficiencyRow[],
  lineJph: number,
  entryProductivity: number,
  stopLostVehicles: number,
  throughDate: string
): number {
  return assemblyDeficitFromEntry(
    expectedVehiclesThroughDate(rows, lineJph, throughDate),
    entryProductivity,
    stopLostVehicles
  )
}

/** كفاءة الدخول والخروج لنفس الشهر: السيارات حتى النهاردة، والهدف حتى آخر يوم خلص. */
export function monthLineEfficiencies(
  rows: EfficiencyRow[],
  lineJph: number,
  entryByDate: Map<string, number>,
  exitByDate: Map<string, number>,
  year: number,
  month: number,
  today: string
): { entry: number | null; exit: number | null } {
  const actualThrough = monthThroughDate(year, month, today)
  const expectedThrough = completedWorkThroughDate(year, month, today)
  return {
    entry: lineProductivityEfficiency(rows, lineJph, entryByDate, actualThrough, expectedThrough),
    exit: lineProductivityEfficiency(rows, lineJph, exitByDate, actualThrough, expectedThrough)
  }
}

/** الخروج ÷ حصة الخطة المستحقة لأيام العمل حتى التاريخ، موزعة حسب الساعات. */
export function planEfficiencyAgainstElapsedDays(
  monthlyPlan: number,
  exitAchieved: number,
  rows: DailyTrackingSourceRow[],
  throughDate: string
): number | null {
  return achievementPercent(planDueThroughDate(monthlyPlan, rows, throughDate), exitAchieved)
}
