import { useCallback, useEffect, useMemo, useState } from 'react'
import { profileIsAdmin, useAuth } from '../Context/AuthContext'
import type { Employee } from '../Types/employee'
import type { FactoryOrgUnit } from '../Types/factoryOrg'
import { getFactoryOrgUnits } from '../services/factoryOrgService'
import { orgPathFromLeaf, orgPathLabel } from '../Utils/employeeOrgPicker'
import { filterRecordsByOrgScope, recordMatchesOrgScope } from '../Utils/factoryOrgScope'

export function useFactoryOrgScope(employees: Employee[] = []) {
  const { profile, hasRole } = useAuth()
  const [orgUnits, setOrgUnits] = useState<FactoryOrgUnit[]>([])

  useEffect(() => {
    getFactoryOrgUnits({ includeInactive: true })
      .then(setOrgUnits)
      .catch(() => setOrgUnits([]))
  }, [])

  const employeeId = profile?.employee_id ?? null
  const seesAll = profileIsAdmin(profile) || hasRole('admin', 'production')
  const viewer = useMemo(
    () => (employeeId ? employees.find(e => e.id === employeeId) ?? null : null),
    [employees, employeeId]
  )
  const scopeRootId = viewer?.factoryOrgUnitId ?? null

  const scopeLabel = useMemo(() => {
    if (!scopeRootId) return null
    return orgPathLabel(orgPathFromLeaf(scopeRootId, orgUnits), orgUnits)
  }, [scopeRootId, orgUnits])

  const defaultOrgPath = useMemo(
    () => (scopeRootId ? orgPathFromLeaf(scopeRootId, orgUnits) : []),
    [scopeRootId, orgUnits]
  )

  const matchesScope = useCallback(
    (recordOrgUnitId: string | null | undefined) =>
      recordMatchesOrgScope(recordOrgUnitId, scopeRootId, seesAll, orgUnits),
    [scopeRootId, seesAll, orgUnits]
  )

  const filterRecords = useCallback(
    <T extends { factoryOrgUnitId?: string | null }>(records: T[]) =>
      filterRecordsByOrgScope(records, scopeRootId, seesAll, orgUnits),
    [scopeRootId, seesAll, orgUnits]
  )

  return {
    orgUnits,
    employeeId,
    seesAll,
    scopeRootId,
    scopeLabel,
    defaultOrgPath,
    matchesScope,
    filterRecords,
    isScopedView: !seesAll && Boolean(scopeRootId)
  }
}
