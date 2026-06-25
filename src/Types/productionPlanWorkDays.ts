export type ProductionPlanWorkDays = {
  year: number
  month: number
  workingDays: number
  vacationDays: number
  overtimeDays: number
}

export const EMPTY_PLAN_WORK_DAYS: ProductionPlanWorkDays = {
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  workingDays: 0,
  vacationDays: 0,
  overtimeDays: 0
}
