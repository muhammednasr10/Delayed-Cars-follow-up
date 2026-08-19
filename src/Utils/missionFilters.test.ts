import { describe, expect, it } from 'vitest'
import type { MissionPriority, MissionStatus } from '../Types/mission'
import {
  EMPTY_MISSION_FILTER_QUERY,
  filterMissions,
  hasActiveMissionFilters,
  missionFilterEmptyKind,
  missionListEmptyI18nKey
} from './missionFilters'

const now = new Date(2026, 7, 18, 15, 0, 0)

function row(
  overrides: Partial<{
    title: string
    description: string | null
    notes: string | null
    priority: MissionPriority
    assigneeIds: string[]
    dueDate: string | null
    status: MissionStatus
    sourceVin: string | null
    sourceModelName: string | null
  }> = {}
) {
  return {
    title: 'Fix station',
    description: 'Check torque',
    notes: null as string | null,
    priority: 'normal' as MissionPriority,
    assigneeIds: ['e1'],
    dueDate: '2026-08-20' as string | null,
    status: 'pending' as MissionStatus,
    sourceVin: null as string | null,
    sourceModelName: null as string | null,
    ...overrides
  }
}

describe('filterMissions', () => {
  const items = [
    row({ title: 'Paint booth', description: 'Clean filters', assigneeIds: ['a'] }),
    row({ title: 'Torque audit', description: 'Station 12', priority: 'high', assigneeIds: ['b'] }),
    row({ title: 'Late kit', description: 'Missing clip', dueDate: '2026-08-10', assigneeIds: ['a', 'b'] }),
    row({ title: 'Clip follow-up', description: null, sourceVin: 'LSJA1234', sourceModelName: 'Tigo' })
  ]

  it('searches title and description', () => {
    expect(filterMissions(items, { ...EMPTY_MISSION_FILTER_QUERY, search: 'torque' }, now).map(i => i.title)).toEqual([
      'Torque audit'
    ])
    expect(filterMissions(items, { ...EMPTY_MISSION_FILTER_QUERY, search: 'clip' }, now).map(i => i.title)).toEqual([
      'Late kit',
      'Clip follow-up'
    ])
    expect(filterMissions(items, { ...EMPTY_MISSION_FILTER_QUERY, search: 'lsja1234' }, now).map(i => i.title)).toEqual([
      'Clip follow-up'
    ])
  })

  it('filters by priority and assignee', () => {
    expect(
      filterMissions(items, { ...EMPTY_MISSION_FILTER_QUERY, priority: 'high' }, now).map(i => i.title)
    ).toEqual(['Torque audit'])
    expect(
      filterMissions(items, { ...EMPTY_MISSION_FILTER_QUERY, assigneeId: 'a' }, now).map(i => i.title)
    ).toEqual(['Paint booth', 'Late kit'])
  })

  it('combines search with overdue', () => {
    expect(
      filterMissions(items, { ...EMPTY_MISSION_FILTER_QUERY, search: 'kit', listFilter: 'overdue' }, now).map(
        i => i.title
      )
    ).toEqual(['Late kit'])
  })
})

describe('hasActiveMissionFilters', () => {
  it('is false for the empty query and true when any facet is set', () => {
    expect(hasActiveMissionFilters(EMPTY_MISSION_FILTER_QUERY)).toBe(false)
    expect(hasActiveMissionFilters({ ...EMPTY_MISSION_FILTER_QUERY, search: 'x' })).toBe(true)
    expect(hasActiveMissionFilters({ ...EMPTY_MISSION_FILTER_QUERY, listFilter: 'pending' })).toBe(true)
  })
})

describe('missionListEmptyI18nKey', () => {
  it('maps empty kind to copy keys', () => {
    expect(missionListEmptyI18nKey(EMPTY_MISSION_FILTER_QUERY, 'missions.empty')).toBe('missions.empty')
    expect(missionListEmptyI18nKey({ ...EMPTY_MISSION_FILTER_QUERY, listFilter: 'overdue' }, 'missions.empty')).toBe(
      'missions.overdueEmpty'
    )
    expect(missionListEmptyI18nKey({ ...EMPTY_MISSION_FILTER_QUERY, search: 'x' }, 'missions.my.empty')).toBe(
      'missions.filterEmpty'
    )
  })
})
