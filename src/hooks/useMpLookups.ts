import { useCallback, useEffect, useState } from 'react'
import { getMpDepartmentOptions, getMpReasonOptions, createMpDepartmentOption, createMpReasonOption } from '../services/mpLookupService'
import type { MpLookupOption } from '../Types/mpLookup'

function sortOptions(list: MpLookupOption[]) {
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.labelAr.localeCompare(b.labelAr))
}

export function useMpLookups() {
  const [reasons, setReasons] = useState<MpLookupOption[]>([])
  const [departments, setDepartments] = useState<MpLookupOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [r, d] = await Promise.all([getMpReasonOptions(true), getMpDepartmentOptions(true)])
      setReasons(r)
      setDepartments(d)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function addReason(labelAr: string) {
    const opt = await createMpReasonOption({ label_ar: labelAr, label_en: labelAr })
    setReasons(prev => sortOptions([...prev.filter(o => o.code !== opt.code), opt]))
    return opt
  }

  async function addDepartment(labelAr: string) {
    const opt = await createMpDepartmentOption({ label_ar: labelAr, label_en: labelAr })
    setDepartments(prev => sortOptions([...prev.filter(o => o.code !== opt.code), opt]))
    return opt
  }

  return { reasons, departments, loading, error, reload, addReason, addDepartment }
}
