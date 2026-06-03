import { useCallback, useEffect, useState } from 'react'
import { getBomDashboardStats } from '../services/bomService'
import type { BomDashboardStats } from '../Types/bom'

export function useBomDashboard() {
  const [stats, setStats] = useState<BomDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setStats(await getBomDashboardStats())
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
