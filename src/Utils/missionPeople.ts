import type { MissionPerson } from '../Types/mission'

export function formatPeopleList(people: MissionPerson[], joiner = '، '): string {
  if (!people.length) return '—'
  return people.map(p => p.name).join(joiner)
}

export function missionHasAssignee(assigneeIds: string[], employeeId: string): boolean {
  return assigneeIds.includes(employeeId)
}

export function missionVisibleToManager(assigneeIds: string[], subordinateIds: Set<string>): boolean {
  return assigneeIds.some(id => subordinateIds.has(id))
}
