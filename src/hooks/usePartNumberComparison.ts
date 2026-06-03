import { useCallback, useEffect, useState } from 'react'
import { getPartComparisons, type ComparisonFilters } from '../services/partComparisonService'
import type { PartNumberComparison } from '../Types/bom'

export function usePartNumberComparison(initial: ComparisonFilters = {}) {
  const [filters, setFilters] = useState<ComparisonFilters>(initial)
  const [items, setItems] = useState<PartNumberComparison[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getPartComparisons(filters)
      setItems(res.items)
      setTotal(res.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void reload()
  }, [reload])

  return { filters, setFilters, items, total, loading, error, reload }
}
