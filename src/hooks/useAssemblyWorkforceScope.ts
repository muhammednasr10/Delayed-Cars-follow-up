import { useEffect, useMemo, useState } from 'react'
import { profileIsAdmin, useAuth } from '../Context/AuthContext'
import type { Employee } from '../Types/employee'
import type { FactoryOrgUnit } from '../Types/factoryOrg'
import { getFactoryOrgUnits } from '../services/factoryOrgService'
import { orgPathFromLeaf, orgPathLabel } from '../Utils/employeeOrgPicker'
import { filterAssemblyWorkforceForViewer } from '../Utils/assemblySupervisorScope'

export function useAssemblyWorkforceScope(employees: Employee[]) {
  const { profile, hasRole } = useAuth()
  const [orgUnits, setOrgUnits] = useState<FactoryOrgUnit[]>([])
  const employeeId = profile?.employee_id ?? null
  const seesAll = profileIsAdmin(profile) || hasRole('admin', 'production')

  useEffect(() => {
    getFactoryOrgUnits({ includeInactive: true })
      .then(setOrgUnits)
      .catch(() => setOrgUnits([]))
  }, [])

  const scopedEmployees = useMemo(
    () => filterAssemblyWorkforceForViewer(employees, employeeId, seesAll, orgUnits),
    [employees, employeeId, seesAll, orgUnits]
  )

  const viewer = useMemo(
    () => (employeeId ? employees.find(e => e.id === employeeId) ?? null : null),
    [employees, employeeId]
  )

  const scopeLabel = useMemo(() => {
    if (!viewer?.factoryOrgUnitId) return null
    return orgPathLabel(orgPathFromLeaf(viewer.factoryOrgUnitId, orgUnits), orgUnits)
  }, [viewer, orgUnits])

  return {
    employeeId,
    seesAll,
    orgUnits,
    viewer,
    scopeLabel,
    scopedEmployees,
    isScopedView: !seesAll && Boolean(viewer?.factoryOrgUnitId ?? employeeId)
  }
}
