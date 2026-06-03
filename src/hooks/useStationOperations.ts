import { useCallback, useEffect, useState } from 'react'
import { getParentStationOperationsGroups } from '../services/stationOperationsService'
import type { ParentStationOperationsGroup } from '../Types/timeStudy'

export function useStationOperations() {
  const [parentGroups, setParentGroups] = useState<ParentStationOperationsGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setParentGroups(await getParentStationOperationsGroups())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load operations')
      setParentGroups([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  return { parentGroups, loading, error, reload: load }
}
