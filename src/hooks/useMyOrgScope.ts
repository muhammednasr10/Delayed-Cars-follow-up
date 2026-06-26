import { useMemo } from 'react'
import { useAuth, profileIsAdmin } from '../Context/AuthContext'
import type { Employee } from '../Types/employee'
import {
  collectSubordinateIds,
  filterAssignableEmployees,
  getMyManagers,
  hasSubordinates
} from '../Utils/employeeHierarchy'

export function useMyOrgScope(employees: Employee[]) {
  const { profile, hasRole } = useAuth()
  const employeeId = profile?.employee_id ?? null
  const isAdmin = profileIsAdmin(profile) || hasRole('admin', 'production')

  return useMemo(() => {
    const subordinateIds = employeeId ? collectSubordinateIds(employees, employeeId) : new Set<string>()
    const managers = employeeId ? getMyManagers(employees, employeeId) : []
    const assignableEmployees = filterAssignableEmployees(employees, employeeId, isAdmin)
    const canAssignMissions = isAdmin || hasSubordinates(employees, employeeId)

    return {
      employeeId,
      isAdmin,
      subordinateIds,
      managers,
      assignableEmployees,
      canAssignMissions,
      isManager: subordinateIds.size > 0
    }
  }, [employees, employeeId, isAdmin])
}
