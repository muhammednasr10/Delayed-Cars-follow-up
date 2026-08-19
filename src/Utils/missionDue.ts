import type { MissionListFilter, MissionStatus } from '../Types/mission'

export type MissionDueFields = {
  dueDate: string | null
  status: MissionStatus
}

function dateKey(value: string): string | null {
  const ymd = value.match(/^(\d{4}-\d{2}-\d{2})/)
  if (ymd) return ymd[1]
  const d = new Date(value.includes('T') ? value : `${value}T12:00:00`)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayKey(now: Date): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isMissionOverdue(mission: MissionDueFields, now = new Date()): boolean {
  if (!mission.dueDate) return false
  if (mission.status === 'completed' || mission.status === 'cancelled') return false
  const due = dateKey(mission.dueDate)
  if (!due) return false
  return due < todayKey(now)
}

export function filterMissionsByListFilter<T extends MissionDueFields>(
  items: T[],
  filter: MissionListFilter,
  now = new Date()
): T[] {
  if (filter === 'all') return items
  if (filter === 'overdue') return items.filter(item => isMissionOverdue(item, now))
  return items.filter(item => item.status === filter)
}
