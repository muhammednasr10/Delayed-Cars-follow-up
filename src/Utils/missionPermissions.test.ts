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
  it('follows admin, assign permission, or having subordinates when there is someone to assign', () => {
    expect(
      canAssignTeamMissions({ isAdmin: true, hasAssignPermission: false, hasSubordinates: false, assignableCount: 2 })
    ).toBe(true)
    expect(
      canAssignTeamMissions({ isAdmin: false, hasAssignPermission: true, hasSubordinates: false, assignableCount: 2 })
    ).toBe(true)
    expect(
      canAssignTeamMissions({ isAdmin: false, hasAssignPermission: false, hasSubordinates: true, assignableCount: 1 })
    ).toBe(true)
  })

  it('is false when there is nobody to assign', () => {
    expect(
      canAssignTeamMissions({ isAdmin: false, hasAssignPermission: true, hasSubordinates: false, assignableCount: 0 })
    ).toBe(false)
  })
})
