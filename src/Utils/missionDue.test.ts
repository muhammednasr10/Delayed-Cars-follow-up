import { describe, expect, it } from 'vitest'
import type { MissionStatus } from '../Types/mission'
import { filterMissionsByListFilter, isMissionOverdue } from './missionDue'

const now = new Date(2026, 7, 18, 15, 0, 0)

function mission(dueDate: string | null, status: MissionStatus = 'pending') {
  return { dueDate, status }
}

describe('isMissionOverdue', () => {
  it('marks open missions with a past due date as overdue', () => {
    expect(isMissionOverdue(mission('2026-08-17'), now)).toBe(true)
    expect(isMissionOverdue(mission('2026-08-17', 'in_progress'), now)).toBe(true)
  })

  it('does not treat same-day due dates as overdue', () => {
    expect(isMissionOverdue(mission('2026-08-18'), now)).toBe(false)
  })

  it('does not mark future, missing, completed, or cancelled missions', () => {
    expect(isMissionOverdue(mission('2026-08-19'), now)).toBe(false)
    expect(isMissionOverdue(mission(null), now)).toBe(false)
    expect(isMissionOverdue(mission('2026-08-17', 'completed'), now)).toBe(false)
    expect(isMissionOverdue(mission('2026-08-17', 'cancelled'), now)).toBe(false)
  })
})

describe('filterMissionsByListFilter', () => {
  const items = [
    mission('2026-08-17', 'pending'),
    mission('2026-08-18', 'in_progress'),
    mission('2026-08-10', 'completed')
  ]

  it('returns overdue open missions only', () => {
    expect(filterMissionsByListFilter(items, 'overdue', now)).toEqual([items[0]])
  })

  it('filters by status', () => {
    expect(filterMissionsByListFilter(items, 'completed', now)).toEqual([items[2]])
  })
})
