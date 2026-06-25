import type { ProductionPlanWorkDays } from '../Types/productionPlanWorkDays'

/** عدد أيام العمل المتاحة = أيام العمل + الإضافي */
export function availableWorkingDays(config: Pick<ProductionPlanWorkDays, 'workingDays' | 'overtimeDays'>): number {
  return Math.max(0, config.workingDays + config.overtimeDays)
}
