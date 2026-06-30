import { useEffect, useState } from 'react'
import { getEntryProductivityMonth } from '../services/entryProductivityService'
import { getExitProductivityMonth } from '../services/exitProductivityService'

function currentYm(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function useProductivityMonthCounts(refreshKey = 0) {
  const [entryVehicles, setEntryVehicles] = useState(0)
  const [exitVehicles, setExitVehicles] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const { year, month } = currentYm()
    setLoading(true)
    void Promise.all([getEntryProductivityMonth(year, month), getExitProductivityMonth(year, month)])
      .then(([entryRows, exitRows]) => {
        if (cancelled) return
        setEntryVehicles(entryRows.reduce((sum, row) => sum + row.quantity, 0))
        setExitVehicles(exitRows.reduce((sum, row) => sum + row.quantity, 0))
      })
      .catch(() => {
        if (!cancelled) {
          setEntryVehicles(0)
          setExitVehicles(0)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return { entryVehicles, exitVehicles, loading }
}
