import { useCallback, useEffect, useState } from 'react'
import { getPartCategoriesWithCounts } from '../services/partCategoriesService'
import type { PartCategory } from '../Types/bom'

export function usePartCategories() {
  const [categories, setCategories] = useState<PartCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setCategories(await getPartCategoriesWithCounts())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { categories, loading, error, reload }
}
