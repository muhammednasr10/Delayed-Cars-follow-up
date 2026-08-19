import type { MissionListFilter, MissionPriority } from '../Types/mission'
import { filterMissionsByListFilter, type MissionDueFields } from './missionDue'

export type MissionFilterQuery = {
  listFilter: MissionListFilter
  search: string
  priority: MissionPriority | 'all'
  assigneeId: string
}

export const EMPTY_MISSION_FILTER_QUERY: MissionFilterQuery = {
  listFilter: 'all',
  search: '',
  priority: 'all',
  assigneeId: ''
}

export type MissionFilterFields = MissionDueFields & {
  title: string
  description: string | null
  notes?: string | null
  priority: MissionPriority
  assigneeIds: string[]
  sourceVin?: string | null
  sourceModelName?: string | null
}

export function hasActiveMissionFilters(query: MissionFilterQuery): boolean {
  return (
    query.listFilter !== 'all' ||
    query.search.trim() !== '' ||
    query.priority !== 'all' ||
    query.assigneeId !== ''
  )
}

export function filterMissions<T extends MissionFilterFields>(
  items: T[],
  query: MissionFilterQuery,
  now = new Date()
): T[] {
  const needle = query.search.trim().toLowerCase()
  const narrowed = items.filter(item => {
    if (query.priority !== 'all' && item.priority !== query.priority) return false
    if (query.assigneeId && !item.assigneeIds.includes(query.assigneeId)) return false
    if (needle) {
      const hay = `${item.title} ${item.description ?? ''} ${item.notes ?? ''} ${item.sourceVin ?? ''} ${item.sourceModelName ?? ''}`.toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  })
  return filterMissionsByListFilter(narrowed, query.listFilter, now)
}

export function missionFilterEmptyKind(query: MissionFilterQuery): 'overdue' | 'filtered' | 'none' {
  const searchOrFacet = query.search.trim() !== '' || query.priority !== 'all' || query.assigneeId !== ''
  if (searchOrFacet) return 'filtered'
  if (query.listFilter === 'overdue') return 'overdue'
  if (query.listFilter !== 'all') return 'filtered'
  return 'none'
}

export function missionListEmptyI18nKey(query: MissionFilterQuery, unfilteredKey: string): string {
  const kind = missionFilterEmptyKind(query)
  if (kind === 'overdue') return 'missions.overdueEmpty'
  if (kind === 'filtered') return 'missions.filterEmpty'
  return unfilteredKey
}
