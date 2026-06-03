import { useEffect, useState } from 'react'
import { getMpDepartmentOptions, getMpReasonOptions } from '../services/mpLookupService'
import type { MpLookupOption } from '../Types/mpLookup'

export function useMpLookups() {
  const [reasons, setReasons] = useState<MpLookupOption[]>([])
  const [departments, setDepartments] = useState<MpLookupOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([getMpReasonOptions(true), getMpDepartmentOptions(true)])
      .then(([r, d]) => {
        if (cancelled) return
        setReasons(r)
        setDepartments(d)
        setError('')
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { reasons, departments, loading, error }
}
