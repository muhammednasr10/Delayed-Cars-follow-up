import { useEffect, useState } from 'react'
import { getMissingParts } from '../services/missingPartsService'

export function useMissingPartsVehicleCounts(refreshKey = 0) {
  const [activeVehicles, setActiveVehicles] = useState(0)
  const [archiveVehicles, setArchiveVehicles] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void getMissingParts()
      .then(items => {
        if (cancelled) return
        const activeItems = items.filter(i => !i.shortageResolvedAt)
        const historyItems = items.filter(i => !!i.shortageResolvedAt)
        setActiveVehicles(new Set(activeItems.map(i => i.vehicleId)).size)
        setArchiveVehicles(new Set(historyItems.map(i => i.vehicleId)).size)
      })
      .catch(() => {
        if (!cancelled) {
          setActiveVehicles(0)
          setArchiveVehicles(0)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return { activeVehicles, archiveVehicles, loading }
}
