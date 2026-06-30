import { useEffect, useState } from 'react'
import { getProductionLineStops, stopDurationMinutes } from '../services/productionStopService'

function currentYm(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function formatStopHoursForCard(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0'
  const hours = totalMinutes / 60
  if (hours < 10) return hours.toFixed(1)
  return String(Math.round(hours))
}

export function useProductionStopMonthCounts(refreshKey = 0) {
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [lostVehicles, setLostVehicles] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const { year, month } = currentYm()
    setLoading(true)
    void getProductionLineStops(year, month)
      .then(stops => {
        if (cancelled) return
        setTotalMinutes(stops.reduce((sum, stop) => sum + stopDurationMinutes(stop.startedAt, stop.endedAt), 0))
        setLostVehicles(stops.reduce((sum, stop) => sum + stop.lostVehicles, 0))
      })
      .catch(() => {
        if (!cancelled) {
          setTotalMinutes(0)
          setLostVehicles(0)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return { totalMinutes, lostVehicles, loading }
}
