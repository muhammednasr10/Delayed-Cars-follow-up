import { useCallback, useEffect, useState } from 'react'
import { getEngineeringDashboardStats } from '../services/engineeringDashboardService'
import type { EngineeringDashboardStats } from '../Types/engineering'

export function useEngineeringDashboard() {
  const [stats, setStats] = useState<EngineeringDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setStats(await getEngineeringDashboardStats())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { stats, loading, error, reload }
}
