import { useCallback, useEffect, useState } from 'react'
import { getBomDashboardStats } from '../services/bomDashboardService'
import { getIplDashboardSummary } from '../services/iplDashboardService'
import type { BomDashboardStats } from '../Types/bom'
import type { IplDashboardSummary } from '../Utils/iplDashboardSummary'

export function useBomDashboard() {
  const [stats, setStats] = useState<BomDashboardStats | null>(null)
  const [iplSummary, setIplSummary] = useState<IplDashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [bomStats, ipl] = await Promise.all([getBomDashboardStats(), getIplDashboardSummary()])
      setStats(bomStats)
      setIplSummary(ipl)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { stats, iplSummary, loading, error, reload }
}
