import { useCallback, useEffect, useState } from 'react'
import { handleAuthApiError, ensureFreshSession, isJwtExpiredMessage } from '../services/authService'
import { getStations } from '../services/settingsService'
import {
  getParentStationOperationsGroups,
  syncAllWorkerHeadcountsFromGroups
} from '../services/stationOperationsService'
import type { ParentStationOperationsGroup } from '../Types/timeStudy'

export function useStationOperations() {
  const [parentGroups, setParentGroups] = useState<ParentStationOperationsGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      await ensureFreshSession()
      let groups = await getParentStationOperationsGroups()
      try {
        const stations = await getStations()
        const changed = await syncAllWorkerHeadcountsFromGroups(groups, stations)
        if (changed) groups = await getParentStationOperationsGroups()
      } catch {
        // قد يفشل بدون صلاحية تعديل — نعرض البيانات الحالية
      }
      setParentGroups(groups)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load operations'
      if (isJwtExpiredMessage(msg)) {
        const refreshed = await handleAuthApiError(msg)
        if (refreshed) {
          try {
            let groups = await getParentStationOperationsGroups()
            try {
              const stations = await getStations()
              const changed = await syncAllWorkerHeadcountsFromGroups(groups, stations)
              if (changed) groups = await getParentStationOperationsGroups()
            } catch {
              // ignore sync errors on retry
            }
            setParentGroups(groups)
            return
          } catch (retryErr) {
            setError(retryErr instanceof Error ? retryErr.message : msg)
            setParentGroups([])
            return
          }
        }
      }
      setError(msg)
      setParentGroups([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])
  return { parentGroups, loading, error, reload: load }
}
