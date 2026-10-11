import type { ProductionPlanWorkDayEdit } from '../Types/productionPlanWorkDayDaily'
import { allocateDailyPlan } from './planningDailyTracking'
import { planDayDeficit } from './planDayDeficit'
import { assemblyDeficitForCompletedDays } from './productivityEfficiency'
import { completedWorkThroughDate, elapsedWorkTotals, resolveLaborAttendanceEfficiency } from './productionPlanWorkDayDaily'

export type WorkDayDisplayRow = ProductionPlanWorkDayEdit & {
  dailyPlan: number
  entryDeficit: number
  exitDeficit: number
}

export type WorkDaysTotals = {
  plannedHours: number
  actualHours: number
  laborAttendanceEfficiency: number | null
  entryProductivity: number
  entryDeficit: number
  stopMinutes: number
  stopLostVehicles: number
  exitProductivity: number
  exitDeficit: number
  assemblyDeficit: number
  repairProductivity: number
  elapsedDays: number
  elapsedHours: number
}

export function withDailyDeficits(rows: ProductionPlanWorkDayEdit[], monthlyPlan: number): WorkDayDisplayRow[] {
  const dailyPlan = allocateDailyPlan(
    monthlyPlan,
    rows.map(row => ({ workDate: row.workDate, dayType: row.dayType, plannedHours: row.plannedHours }))
  )
  return rows.map(row => {
    const planned = dailyPlan.get(row.workDate) ?? 0
    return {
      ...row,
      dailyPlan: planned,
      entryDeficit: planDayDeficit(monthlyPlan, planned, row.entryProductivity),
      exitDeficit: planDayDeficit(monthlyPlan, planned, row.exitProductivity)
    }
  })
}

function sumRows(rows: WorkDayDisplayRow[], pick: (row: WorkDayDisplayRow) => number): number {
  return rows.reduce((sum, row) => sum + pick(row), 0)
}

/** مجاميع الشهر، مع أيام وساعات وعجز التجميع حتى آخر يوم خلص. */
export function summarizeWorkDays(
  rows: WorkDayDisplayRow[],
  lineJph: number,
  year: number,
  month: number,
  today: string
): WorkDaysTotals {
  const efficiencyValues = rows
    .map(row => resolveLaborAttendanceEfficiency(row))
    .filter((value): value is number => value != null)
  const entryProductivity = sumRows(rows, row => row.entryProductivity)
  const stopLostVehicles = sumRows(rows, row => row.stopLostVehicles)
  const throughDate = completedWorkThroughDate(year, month, today)
  const elapsed = elapsedWorkTotals(rows, throughDate)
  return {
    plannedHours: sumRows(rows, row => row.plannedHours),
    actualHours: sumRows(rows, row => row.actualHours),
    laborAttendanceEfficiency:
      efficiencyValues.length > 0
        ? Math.round(efficiencyValues.reduce((sum, value) => sum + value, 0) / efficiencyValues.length)
        : null,
    entryProductivity,
    entryDeficit: sumRows(rows, row => row.entryDeficit),
    stopMinutes: sumRows(rows, row => row.stopMinutes),
    stopLostVehicles,
    exitProductivity: sumRows(rows, row => row.exitProductivity),
    exitDeficit: sumRows(rows, row => row.exitDeficit),
    assemblyDeficit: assemblyDeficitForCompletedDays(rows, lineJph, entryProductivity, stopLostVehicles, throughDate),
    repairProductivity: sumRows(rows, row => row.repairProductivity),
    elapsedDays: elapsed.days,
    elapsedHours: elapsed.hours
  }
}
