import { useEffect, useMemo, useState } from 'react'
import { profileIsAdmin, useAuth } from '../Context/AuthContext'
import type { FactoryOrgUnit } from '../Types/factoryOrg'
import { getFactoryOrgUnits } from '../services/factoryOrgService'
import { useEmployees } from './useEmployees'
import { isProductivityRecorder, productivityWriteScope } from '../Utils/assemblyAreas'

export function useProductivityWriteScope() {
  const { profile } = useAuth()
  const { employees } = useEmployees()
  const [orgUnits, setOrgUnits] = useState<FactoryOrgUnit[]>([])

  useEffect(() => {
    getFactoryOrgUnits({ includeInactive: true })
      .then(setOrgUnits)
      .catch(() => setOrgUnits([]))
  }, [])

  const employeeId = profile?.employee_id ?? null
  const viewer = useMemo(
    () => (employeeId ? (employees.find(employee => employee.id === employeeId) ?? null) : null),
    [employees, employeeId]
  )

  const recordBoth = isProductivityRecorder(
    profile?.system_role_code,
    profile?.system_role_name_ar,
    viewer?.jobRole
  )

  return useMemo(
    () => productivityWriteScope(viewer, orgUnits, profileIsAdmin(profile), recordBoth),
    [viewer, orgUnits, profile, recordBoth]
  )
}
