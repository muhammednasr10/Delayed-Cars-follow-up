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

type MpLookupsCache = {
  reasons: MpLookupOption[]
  orgUnits: FactoryOrgUnit[]
  departments: MpLookupOption[]
  loadedAt: number
}

const CACHE_TTL_MS = 60_000
let lookupsCache: MpLookupsCache | null = null
let lookupsInflight: Promise<MpLookupsCache> | null = null

async function fetchMpLookupsBundle(force = false): Promise<MpLookupsCache> {
  if (!force && lookupsCache && Date.now() - lookupsCache.loadedAt < CACHE_TTL_MS) {
    return lookupsCache
  }
  if (!force && lookupsInflight) return lookupsInflight

  const task = (async () => {
    const [r, units, legacyDepts] = await Promise.all([
      getMpReasonOptions(false),
      getFactoryOrgUnits({ includeInactive: true }),
      getMpDepartmentOptions(false).catch(() => [] as MpLookupOption[])
    ])
    const deptLookups = mergeDepartmentLookups(units, legacyDepts)
    ingestMpLookupOptions(r)
    ingestMpLookupOptions(deptLookups)
    const next: MpLookupsCache = {
      reasons: r,
      orgUnits: units.filter(u => u.isActive),
      departments: deptLookups,
      loadedAt: Date.now()
    }
    lookupsCache = next
    return next
  })()

  lookupsInflight = task
  try {
    return await task
  } finally {
    if (lookupsInflight === task) lookupsInflight = null
  }
}

export function useMpLookups() {
  const [allReasons, setAllReasons] = useState<MpLookupOption[]>(() => lookupsCache?.reasons ?? [])
  const [orgUnits, setOrgUnits] = useState<FactoryOrgUnit[]>(() => lookupsCache?.orgUnits ?? [])
  const [departments, setDepartments] = useState<MpLookupOption[]>(() => lookupsCache?.departments ?? [])
  const [loading, setLoading] = useState(!lookupsCache)
  const [error, setError] = useState('')

  const reload = useCallback(async (force = false) => {
    if (!force && lookupsCache && Date.now() - lookupsCache.loadedAt < CACHE_TTL_MS) {
      setAllReasons(lookupsCache.reasons)
      setOrgUnits(lookupsCache.orgUnits)
      setDepartments(lookupsCache.departments)
      setLoading(false)
      setError('')
      return
    }
    setLoading(true)
    try {
      const next = await fetchMpLookupsBundle(force)
      setAllReasons(next.reasons)
      setOrgUnits(next.orgUnits)
      setDepartments(next.departments)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload(false)
  }, [reload])

  const reasons = useMemo(() => allReasons, [allReasons])
  const activeReasons = useMemo(() => allReasons.filter(o => o.isActive), [allReasons])

  async function addReason(labelAr: string) {
    const opt = await createMpReasonOption({ label_ar: labelAr, label_en: labelAr })
    setAllReasons(prev => {
      const next = sortOptions([...prev.filter(o => o.code !== opt.code), opt])
      if (lookupsCache) lookupsCache = { ...lookupsCache, reasons: next, loadedAt: Date.now() }
      return next
    })
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
    reload: () => reload(true),
    addReason
  }
}
