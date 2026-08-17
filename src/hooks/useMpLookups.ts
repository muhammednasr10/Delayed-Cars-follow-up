import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getMpReasonOptions,
  getMpDepartmentOptions,
  createMpReasonOption
} from '../services/mpLookupService'
import { getFactoryOrgUnits } from '../services/factoryOrgService'
import type { FactoryOrgUnit } from '../Types/factoryOrg'
import type { MpLookupOption } from '../Types/mpLookup'
import { mergeDepartmentLookups } from '../Utils/factoryOrgAsMpDepartments'
import { ingestMpLookupOptions } from '../Utils/mpLookupLabel'

function sortOptions(list: MpLookupOption[]) {
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.labelAr.localeCompare(b.labelAr))
}

export function useMpLookups() {
  const [allReasons, setAllReasons] = useState<MpLookupOption[]>([])
  const [orgUnits, setOrgUnits] = useState<FactoryOrgUnit[]>([])
  const [departments, setDepartments] = useState<MpLookupOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [r, units, legacyDepts] = await Promise.all([
        getMpReasonOptions(false),
        getFactoryOrgUnits({ includeInactive: true }),
        getMpDepartmentOptions(false).catch(() => [] as MpLookupOption[])
      ])
      const deptLookups = mergeDepartmentLookups(units, legacyDepts)
      setAllReasons(r)
      setOrgUnits(units.filter(u => u.isActive))
      setDepartments(deptLookups)
      ingestMpLookupOptions(r)
      ingestMpLookupOptions(deptLookups)
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

  const reasons = useMemo(() => allReasons, [allReasons])
  const activeReasons = useMemo(() => allReasons.filter(o => o.isActive), [allReasons])

  async function addReason(labelAr: string) {
    const opt = await createMpReasonOption({ label_ar: labelAr, label_en: labelAr })
    setAllReasons(prev => sortOptions([...prev.filter(o => o.code !== opt.code), opt]))
    ingestMpLookupOptions([opt])
    return opt
  }

  return {
    /** All reason classes for labels (includes inactive used on old rows). */
    reasons,
    /** Active reason classes for create/edit pickers. */
    activeReasons,
    orgUnits,
    departments,
    loading,
    error,
    reload,
    addReason
  }
}
