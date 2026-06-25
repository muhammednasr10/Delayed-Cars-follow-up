import type { PlanDayType, ProductionPlanWorkDayEdit, ProductionPlanWorkDayRow } from '../Types/productionPlanWorkDayDaily'
import { defaultWorkDayRow } from '../Types/productionPlanWorkDayDaily'
import { listDatesInMonth } from '../services/entryProductivityService'

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

export function buildMonthWorkDayRows(
  year: number,
  month: number,
  saved: ProductionPlanWorkDayRow[]
): ProductionPlanWorkDayRow[] {
  const byDate = new Map(saved.map(row => [row.workDate, row]))
  return listDatesInMonth(year, month).map(workDate => byDate.get(workDate) ?? defaultWorkDayRow(workDate))
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
  exitByDate: Map<string, number>
): ProductionPlanWorkDayEdit[] {
  return rows.map(row => ({
    ...row,
    entryProductivity: entryByDate.get(row.workDate) ?? 0,
    exitProductivity: exitByDate.get(row.workDate) ?? 0
  }))
}
