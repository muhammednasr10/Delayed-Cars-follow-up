import { computeProductivityLostCars } from './productionPlanWorkDayDaily'

/** When a month plan exists, the day's gap is plan minus actual. Otherwise keep the fixed daily target. */
export function planDayDeficit(monthlyPlan: number, dailyPlan: number, actual: number): number {
  if (monthlyPlan > 0) return dailyPlan > 0 ? Math.max(0, dailyPlan - actual) : 0
  return computeProductivityLostCars(actual)
}
