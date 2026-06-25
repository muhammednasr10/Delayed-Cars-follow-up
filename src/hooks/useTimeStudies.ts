import { useCallback, useEffect, useState } from 'react'
import { listTimeStudies, type TimeStudyListFilters } from '../services/timeStudyService'
import type { TimeStudy } from '../Types/engineering'

export function useTimeStudies(filters: TimeStudyListFilters = {}) {
  const [studies, setStudies] = useState<TimeStudy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setStudies(await listTimeStudies(filters))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
      setStudies([])
    } finally {
      setLoading(false)
    }
  }, [filters.status, filters.operationId, filters.vehicleModelId, filters.stationId])

  useEffect(() => {
    void reload()
  }, [reload])

  return { studies, loading, error, reload }
}
