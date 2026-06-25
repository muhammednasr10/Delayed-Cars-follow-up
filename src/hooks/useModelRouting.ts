import { useCallback, useEffect, useState } from 'react'
import { getModelRouting } from '../services/routingService'
import type { ModelRoutingRow } from '../Types/engineering'

export function useModelRouting(vehicleModelId: string | null) {
  const [rows, setRows] = useState<ModelRoutingRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!vehicleModelId) {
      setRows([])
      return
    }
    setLoading(true)
    setError('')
    try {
      setRows(await getModelRouting(vehicleModelId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [vehicleModelId])

  useEffect(() => {
    void reload()
  }, [reload])

  return { rows, loading, error, reload }
}
