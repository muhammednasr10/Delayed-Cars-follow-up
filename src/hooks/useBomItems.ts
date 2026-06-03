import { useCallback, useEffect, useState } from 'react'
import { getBomItems, getBomFilterOptions, type BomListFilters, type BomListResult } from '../services/bomService'

export function useBomItems(initialFilters: BomListFilters = {}) {
  const [filters, setFilters] = useState<BomListFilters>(initialFilters)
  const [result, setResult] = useState<BomListResult>({ items: [], total: 0, page: 1, pageSize: 50 })
  const [options, setOptions] = useState<Awaited<ReturnType<typeof getBomFilterOptions>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [list, opts] = await Promise.all([getBomItems(filters), getBomFilterOptions()])
      setResult(list)
      setOptions(opts)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void reload()
  }, [reload])

  return { filters, setFilters, result, options, loading, error, reload }
}
