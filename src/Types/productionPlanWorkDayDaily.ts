export const PLAN_DAY_TYPES = [
  'work',
  'overtime',
  'vacation',
  'factory_vacation',
  'substitute'
] as const

export type PlanDayType = (typeof PLAN_DAY_TYPES)[number]

export type ProductionPlanWorkDayRow = {
  workDate: string
  dayType: PlanDayType
  plannedHours: number
  actualHours: number
  totalStops: number
  notes?: string | null
}

export type ProductionPlanWorkDayEdit = ProductionPlanWorkDayRow & {
  entryProductivity: number
  exitProductivity: number
}

export function defaultWorkDayRow(workDate: string): ProductionPlanWorkDayRow {
  return {
    workDate,
    dayType: 'work',
    plannedHours: 0,
    actualHours: 0,
    totalStops: 0,
    notes: null
  }
}
