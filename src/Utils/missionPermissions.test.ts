import { describe, expect, it } from 'vitest'
import { canAssignTeamMissions, canViewAllTeamMissions } from './missionPermissions'

describe('canViewAllTeamMissions', () => {
  it('is true for admins or an explicit view_all grant', () => {
    expect(canViewAllTeamMissions(true, false)).toBe(true)
    expect(canViewAllTeamMissions(false, true)).toBe(true)
    expect(canViewAllTeamMissions(false, false)).toBe(false)
  })
})

describe('canAssignTeamMissions', () => {
  it('allows admin or engineer to assign missions', () => {
    expect(
      canAssignTeamMissions({ isAdmin: true, isEngineer: false, hasAssignPermission: false, hasSubordinates: false, assignableCount: 2 })
    ).toBe(true)
    expect(
      canAssignTeamMissions({ isAdmin: false, isEngineer: true, hasAssignPermission: false, hasSubordinates: false, assignableCount: 2 })
    ).toBe(true)
    expect(
      canAssignTeamMissions({ isAdmin: false, isEngineer: false, hasAssignPermission: true, hasSubordinates: false, assignableCount: 2 })
    ).toBe(true)
  })

  it('does not allow subordinates-only users to assign', () => {
    expect(
      canAssignTeamMissions({ isAdmin: false, isEngineer: false, hasAssignPermission: false, hasSubordinates: true, assignableCount: 1 })
    ).toBe(false)
  })

  it('is false when there is nobody to assign', () => {
    expect(
      canAssignTeamMissions({ isAdmin: false, isEngineer: true, hasAssignPermission: false, hasSubordinates: false, assignableCount: 0 })
    ).toBe(false)
  })
})
