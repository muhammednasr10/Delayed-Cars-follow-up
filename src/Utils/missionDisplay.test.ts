import { describe, expect, it } from 'vitest'
import type { TeamMission } from '../Types/mission'
import {
  filterActiveMissions,
  filterArchivedMissions,
  isArchivedMissionStatus,
  missionDetailsPreview,
  missionListStats,
  mapMissionActionError,
  mapMissionDelegateError,
  missionRecurrenceLabel,
  missionRowClass
} from './missionDisplay'

const now = new Date(2026, 7, 18, 15, 0, 0)

function row(overrides: Partial<Pick<TeamMission, 'status' | 'dueDate' | 'description' | 'notes'>> = {}) {
  return {
    status: 'pending' as const,
    dueDate: '2026-08-20',
    description: null as string | null,
    notes: null as string | null,
    ...overrides
  }
}

describe('missionListStats', () => {
  it('counts statuses and overdue open missions', () => {
    const stats = missionListStats(
      [
        row({ dueDate: '2026-08-10' }),
        row({ status: 'in_progress' }),
        row({ status: 'completed', dueDate: '2026-08-01' })
      ],
      now
    )
    expect(stats).toEqual({ total: 3, pending: 1, inProgress: 1, completed: 1, overdue: 1 })
  })
})

describe('mission archive helpers', () => {
  const items = [
    row({ status: 'pending' }),
    row({ status: 'completed' }),
    row({ status: 'cancelled' })
  ]

  it('splits active and archived missions', () => {
    expect(filterActiveMissions(items).map(i => i.status)).toEqual(['pending'])
    expect(filterArchivedMissions(items).map(i => i.status)).toEqual(['completed', 'cancelled'])
    expect(isArchivedMissionStatus('cancelled')).toBe(true)
    expect(isArchivedMissionStatus('pending')).toBe(false)
  })

  it('styles cancelled rows with red background', () => {
    expect(missionRowClass(false, 'cancelled')).toContain('bg-red-950')
  })
})

describe('missionDetailsPreview', () => {
  it('prefers description then notes', () => {
    expect(missionDetailsPreview(row({ description: '  desc  ' }) as TeamMission)).toBe('desc')
    expect(missionDetailsPreview(row({ notes: 'note' }) as TeamMission)).toBe('note')
    expect(missionDetailsPreview(row() as TeamMission)).toBe('—')
  })
})

describe('missionRecurrenceLabel', () => {
  const t = (key: string) => key
  it('labels spawned copies and custom text', () => {
    expect(
      missionRecurrenceLabel(
        { id: 'b', recurrenceSeriesId: 'a', recurrenceType: 'none', recurrenceCustom: null } as TeamMission,
        t
      )
    ).toBe('missions.recurrence.occurrence')
    expect(
      missionRecurrenceLabel(
        { id: 'a', recurrenceSeriesId: 'a', recurrenceType: 'custom', recurrenceCustom: 'كل 10 أيام' } as TeamMission,
        t
      )
    ).toBe('missions.recurrence.custom: كل 10 أيام')
  })
})

describe('mapMissionActionError', () => {
  const t = (key: string) => key
  it('maps respond codes and keeps unknown messages', () => {
    expect(mapMissionActionError('RESPONSE_REQUIRED', t)).toBe('missions.respond.errRequired')
    expect(mapMissionActionError('network', t)).toBe('network')
  })
  it('maps assignee errors for delegate separately', () => {
    expect(mapMissionActionError('MISSION_NOT_ASSIGNEE', t)).toBe('missions.respond.errNotAssignee')
    expect(mapMissionDelegateError('MISSION_NOT_ASSIGNEE', t)).toBe('missions.delegate.errNotAssignee')
    expect(mapMissionDelegateError('ASSIGNEE_NOT_SUBORDINATE', t)).toBe('missions.errAssigneeNotSubordinate')
  })
})
