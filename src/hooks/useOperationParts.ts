import { useCallback, useEffect, useState } from 'react'
import { getOperationParts } from '../services/operationPartsService'
import type { OperationPartRow } from '../Types/engineering'

export function useOperationParts(operationId: string | null) {
  const [parts, setParts] = useState<OperationPartRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!operationId) {
      setParts([])
      return
    }
    setLoading(true)
    setError('')
    try {
      setParts(await getOperationParts(operationId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
      setParts([])
    } finally {
      setLoading(false)
    }
  }, [operationId])

  useEffect(() => {
    void reload()
  }, [reload])

  return { parts, loading, error, reload }
}
