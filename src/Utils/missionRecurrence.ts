import type { MissionRecurrenceType } from '../Types/mission'

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseYmd(value: string): Date | null {
  const ymd = value.match(/^(\d{4}-\d{2}-\d{2})/)
  if (!ymd) return null
  const d = new Date(`${ymd[1]}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function isAutoRecurringType(type: MissionRecurrenceType): boolean {
  return type === 'daily' || type === 'weekly' || type === 'monthly'
}

export function addMissionRecurrencePeriod(dueYmd: string, type: MissionRecurrenceType): string | null {
  if (!isAutoRecurringType(type)) return null
  const d = parseYmd(dueYmd)
  if (!d) return null
  if (type === 'daily') d.setDate(d.getDate() + 1)
  else if (type === 'weekly') d.setDate(d.getDate() + 7)
  else {
    const day = d.getDate()
    d.setDate(1)
    d.setMonth(d.getMonth() + 1)
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    d.setDate(Math.min(day, last))
  }
  return toYmd(d)
}

export function isSpawnedRecurrenceCopy(mission: { id: string; recurrenceSeriesId: string | null }): boolean {
  return Boolean(mission.recurrenceSeriesId && mission.recurrenceSeriesId !== mission.id)
}

export function nextAutoRecurrenceDueDate(
  dueDate: string | null,
  type: MissionRecurrenceType,
  now = new Date()
): string | null {
  const start = dueDate?.match(/^(\d{4}-\d{2}-\d{2})/)?.[1]
  if (!start) return null
  let current = addMissionRecurrencePeriod(start, type)
  if (!current) return null
  const today = toYmd(now)
  let guard = 0
  while (current <= today && guard < 36) {
    const next = addMissionRecurrencePeriod(current, type)
    if (!next) return current
    current = next
    guard += 1
  }
  return current
}

export function isRecurrenceSeriesRoot(mission: {
  id: string
  recurrenceSeriesId: string | null
  recurrenceType: MissionRecurrenceType
}): boolean {
  if (!isAutoRecurringType(mission.recurrenceType)) return false
  return !mission.recurrenceSeriesId || mission.recurrenceSeriesId === mission.id
}
