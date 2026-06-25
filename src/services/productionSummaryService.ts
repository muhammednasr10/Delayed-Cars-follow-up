import { listDatesInMonth } from './entryProductivityService'
import { getMonthProductivityTotals } from './productionPlanWorkDayDailyService'
import { getProductionLineStops } from './productionStopService'

export type ProductionSummaryDayRow = {
  workDate: string
  entryProductivity: number
  exitProductivity: number
  stopLostVehicles: number
  totalDeficit: number
}

export function sumStopLostByDate(stops: { startedAt: string; lostVehicles: number }[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const stop of stops) {
    const date = stop.startedAt.slice(0, 10)
    map.set(date, (map.get(date) ?? 0) + stop.lostVehicles)
  }
  return map
}

export async function getProductionSummaryMonth(year: number, month: number): Promise<ProductionSummaryDayRow[]> {
  const [productivity, stops] = await Promise.all([
    getMonthProductivityTotals(year, month),
    getProductionLineStops(year, month).catch(() => [])
  ])
  const stopByDate = sumStopLostByDate(stops)

  return listDatesInMonth(year, month).map(workDate => {
    const entryProductivity = productivity.entryByDate.get(workDate) ?? 0
    const exitProductivity = productivity.exitByDate.get(workDate) ?? 0
    const stopLostVehicles = stopByDate.get(workDate) ?? 0
    const totalDeficit = entryProductivity - exitProductivity - stopLostVehicles
    return { workDate, entryProductivity, exitProductivity, stopLostVehicles, totalDeficit }
  })
}
