import { useMemo } from 'react'
import { useAuth, profileIsAdmin } from '../Context/AuthContext'
import { usePermissions } from '../Context/PermissionsContext'
import type { Employee } from '../Types/employee'
import {
  collectSubordinateIds,
  filterAssignableEmployees,
  getMyManagers,
  hasSubordinates
} from '../Utils/employeeHierarchy'
import { canAssignTeamMissions, canViewAllTeamMissions } from '../Utils/missionPermissions'

export function useMyOrgScope(employees: Employee[]) {
  const { profile, hasRole } = useAuth()
  const { hasPermission } = usePermissions()
  const employeeId = profile?.employee_id ?? null
  const isAdmin = profileIsAdmin(profile) || hasRole('admin', 'production')
  const canViewAllMissions = canViewAllTeamMissions(isAdmin, hasPermission('missions', 'view_all'))
  const hasAssignPermission = hasPermission('missions', 'assign')

  return useMemo(() => {
    const subordinateIds = employeeId ? collectSubordinateIds(employees, employeeId) : new Set<string>()
    const managers = employeeId ? getMyManagers(employees, employeeId) : []
    const assignableEmployees = filterAssignableEmployees(employees, employeeId, canViewAllMissions)
    const canAssignMissions = canAssignTeamMissions({
      isAdmin,
      hasAssignPermission,
      hasSubordinates: hasSubordinates(employees, employeeId),
      assignableCount: assignableEmployees.length
    })

    return {
      employeeId,
      isAdmin,
      canViewAllMissions,
      subordinateIds,
      managers,
      assignableEmployees,
      canAssignMissions,
      isManager: subordinateIds.size > 0
    }
  }, [employees, employeeId, isAdmin, canViewAllMissions, hasAssignPermission])
}
