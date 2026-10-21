import { useCallback, useEffect, useRef, useState } from 'react'
import { handleAuthApiError, ensureFreshSession, formatAuthApiError, isJwtExpiredMessage } from '../services/authService'
import { getStations } from '../services/settingsService'
import {
  getParentStationOperationsGroups,
  syncAllWorkerHeadcountsFromGroups
} from '../services/stationOperationsService'
import type { ParentStationOperationsGroup } from '../Types/timeStudy'

async function loadGroupsWithOptionalHeadcountSync(): Promise<ParentStationOperationsGroup[]> {
  let groups = await getParentStationOperationsGroups()
  try {
    const stations = await getStations()
    const changed = await syncAllWorkerHeadcountsFromGroups(groups, stations)
    if (changed) groups = await getParentStationOperationsGroups()
  } catch {
    // قد يفشل بدون صلاحية تعديل — نعرض البيانات الحالية
  }
  return groups
}

export function useStationOperations() {
  const [parentGroups, setParentGroups] = useState<ParentStationOperationsGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestId = useRef(0)

  const patchWorkerOperationsSummary = useCallback((stationId: string, summary: string) => {
    const next = summary.trim() || null
    setParentGroups(groups =>
      groups.map(group => ({
        ...group,
        workers: group.workers.map(worker =>
          worker.stationId === stationId ? { ...worker, worker1OperationsSummary: next } : worker
        )
      }))
    )
  }, [])

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const id = ++requestId.current
    if (!options?.silent) {
      setLoading(true)
      setError('')
    }
    try {
      await ensureFreshSession()
      const groups = await loadGroupsWithOptionalHeadcountSync()
      if (id !== requestId.current) return
      setParentGroups(groups)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load operations'
      if (isJwtExpiredMessage(msg)) {
        const refreshed = await handleAuthApiError(msg)
        if (refreshed) {
          try {
            const groups = await loadGroupsWithOptionalHeadcountSync()
            if (id !== requestId.current) return
            setParentGroups(groups)
            return
          } catch (retryErr) {
            if (id !== requestId.current) return
            const retryMsg = retryErr instanceof Error ? retryErr.message : msg
            setError(formatAuthApiError(retryMsg))
            setParentGroups([])
            return
          }
        }
      }
      if (id !== requestId.current) return
      setError(formatAuthApiError(msg))
      setParentGroups([])
    } finally {
      if (!options?.silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])
  return { parentGroups, loading, error, reload: load, patchWorkerOperationsSummary }
}
