import { useMemo } from 'react'
import { profileIsAdmin, useAuth } from '../Context/AuthContext'
import type { Employee } from '../Types/employee'
import { filterAssemblyWorkforceForViewer } from '../Utils/assemblySupervisorScope'

export function useAssemblyWorkforceScope(employees: Employee[]) {
  const { profile, hasRole } = useAuth()
  const employeeId = profile?.employee_id ?? null
  const seesAll = profileIsAdmin(profile) || hasRole('admin', 'production')

  const scopedEmployees = useMemo(
    () => filterAssemblyWorkforceForViewer(employees, employeeId, seesAll),
    [employees, employeeId, seesAll]
  )

  return {
    employeeId,
    seesAll,
    scopedEmployees,
    isScopedView: !seesAll && Boolean(employeeId)
  }
}
