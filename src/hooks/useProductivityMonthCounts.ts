import { useEffect, useState } from 'react'
import { localTodayIso } from '../Utils/planningDailyTracking'
import { buildMonthWorkDayRows } from '../Utils/productionPlanWorkDayDaily'
import { monthLineEfficiencies } from '../Utils/productivityEfficiency'
import { getEntryProductivityMonth } from '../services/entryProductivityService'
import { getExitProductivityMonth } from '../services/exitProductivityService'
import { getProductionPlanWorkDaysMonth, sumProductivityByDate } from '../services/productionPlanWorkDayDailyService'
import { getProductionPlanWorkDays } from '../services/productionPlanWorkDaysService'

function currentYm(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function useProductivityMonthCounts(refreshKey = 0) {
  const [entryVehicles, setEntryVehicles] = useState(0)
  const [exitVehicles, setExitVehicles] = useState(0)
  const [entryEfficiency, setEntryEfficiency] = useState<number | null>(null)
  const [exitEfficiency, setExitEfficiency] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const { year, month } = currentYm()
    setLoading(true)

    void Promise.all([
      getEntryProductivityMonth(year, month),
      getExitProductivityMonth(year, month),
      getProductionPlanWorkDaysMonth(year, month).catch(() => []),
      getProductionPlanWorkDays(year, month).catch(() => null)
    ])
      .then(([entryRows, exitRows, workDayRows, workConfig]) => {
        if (cancelled) return

        setEntryVehicles(entryRows.reduce((sum, row) => sum + row.quantity, 0))
        setExitVehicles(exitRows.reduce((sum, row) => sum + row.quantity, 0))

        const lineJph = workConfig?.lineJph ?? 0
        const calendar = buildMonthWorkDayRows(year, month, workDayRows)
        const entryByDate = sumProductivityByDate(entryRows)
        const exitByDate = sumProductivityByDate(exitRows)
        const efficiencies = monthLineEfficiencies(calendar, lineJph, entryByDate, exitByDate, year, month, localTodayIso())
        setEntryEfficiency(efficiencies.entry)
        setExitEfficiency(efficiencies.exit)
      })
      .catch(() => {
        if (!cancelled) {
          setEntryVehicles(0)
          setExitVehicles(0)
          setEntryEfficiency(null)
          setExitEfficiency(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return { entryVehicles, exitVehicles, entryEfficiency, exitEfficiency, loading }
}
