export function canViewAllTeamMissions(isAdmin: boolean, hasViewAllPermission: boolean): boolean {
  return isAdmin || hasViewAllPermission
}

export function canAssignTeamMissions(input: {
  isAdmin: boolean
  isEngineer: boolean
  hasAssignPermission: boolean
  hasSubordinates: boolean
  assignableCount: number
}): boolean {
  if (input.assignableCount <= 0) return false
  return input.isAdmin || input.isEngineer || input.hasAssignPermission
}
