import { useCallback, useEffect, useState } from 'react'
import {
  createDpDecisionOption,
  createDpReasonOption,
  getDpDecisionOptions,
  getDpReasonOptions
} from '../services/damagedPartsLookupService'
import type { MpLookupOption } from '../Types/mpLookup'

function sortOptions(list: MpLookupOption[]) {
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.labelAr.localeCompare(b.labelAr))
}

export function useDamagedPartsLookups() {
  const [reasons, setReasons] = useState<MpLookupOption[]>([])
  const [decisions, setDecisions] = useState<MpLookupOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [r, d] = await Promise.all([getDpReasonOptions(true), getDpDecisionOptions(true)])
      setReasons(r)
      setDecisions(d)
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
    const opt = await createDpReasonOption({ label_ar: labelAr, label_en: labelAr })
    setReasons(prev => sortOptions([...prev.filter(o => o.code !== opt.code), opt]))
    return opt
  }

  async function addDecision(labelAr: string) {
    const opt = await createDpDecisionOption({ label_ar: labelAr, label_en: labelAr })
    setDecisions(prev => sortOptions([...prev.filter(o => o.code !== opt.code), opt]))
    return opt
  }

  return { reasons, decisions, loading, error, reload, addReason, addDecision }
}
