import type { MissionStatus, TeamMission } from '../Types/mission'
import { isMissionOverdue } from './missionDue'
import { isSpawnedRecurrenceCopy } from './missionRecurrence'

export function isMissionSchemaMissing(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('schema cache') || m.includes('could not find the table') || m.includes('does not exist')
}

export function formatMissionDate(iso: string | null, lang: string): string {
  if (!iso) return '—'
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium' })
}

export function formatMissionDateTime(iso: string | null, lang: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

export function missionRecurrenceLabel(row: TeamMission, t: (key: string) => string): string {
  if (isSpawnedRecurrenceCopy(row)) return t('missions.recurrence.occurrence')
  if (row.recurrenceType === 'custom') {
    const extra = row.recurrenceCustom?.trim()
    return extra ? `${t(`missions.recurrence.${row.recurrenceType}`)}: ${extra}` : t(`missions.recurrence.${row.recurrenceType}`)
  }
  return t(`missions.recurrence.${row.recurrenceType}`)
}

export function missionDetailsPreview(row: TeamMission): string {
  const description = row.description?.trim()
  if (description) return description
  const notes = row.notes?.trim()
  if (notes) return notes
  return '—'
}

export type MissionListStats = {
  total: number
  pending: number
  inProgress: number
  completed: number
  overdue: number
}

export function missionListStats(
  items: Pick<TeamMission, 'status' | 'dueDate'>[],
  now = new Date()
): MissionListStats {
  return {
    total: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    inProgress: items.filter(i => i.status === 'in_progress').length,
    completed: items.filter(i => i.status === 'completed').length,
    overdue: items.filter(i => isMissionOverdue(i, now)).length
  }
}

export function isOpenMissionStatus(status: MissionStatus): boolean {
  return status === 'pending' || status === 'in_progress'
}

export function isArchivedMissionStatus(status: MissionStatus): boolean {
  return status === 'completed' || status === 'cancelled'
}

export function filterActiveMissions<T extends { status: MissionStatus }>(items: T[]): T[] {
  return items.filter(i => !isArchivedMissionStatus(i.status))
}

export function filterArchivedMissions<T extends { status: MissionStatus }>(items: T[]): T[] {
  return items.filter(i => isArchivedMissionStatus(i.status))
}

export function missionRowClass(overdue: boolean, status?: MissionStatus): string {
  if (status === 'cancelled') {
    return 'cursor-pointer bg-red-950/55 hover:bg-red-950/70'
  }
  if (overdue) {
    return 'cursor-pointer bg-red-950/40 hover:bg-red-950/55'
  }
  return 'cursor-pointer bg-slate-900/30 hover:bg-slate-800/50'
}

export function mapMissionActionError(code: string, t: (key: string) => string): string {
  if (code === 'RESPONSE_REQUIRED') return t('missions.respond.errRequired')
  if (code === 'MISSION_NOT_ASSIGNEE') return t('missions.respond.errNotAssignee')
  if (code === 'NO_EMPLOYEE_LINK') return t('missions.my.noEmployeeLink')
  if (code === 'IMAGE_TOO_LARGE') return t('missions.respond.errTooLarge')
  if (code === 'IMAGE_INVALID_TYPE') return t('missions.respond.errInvalidType')
  if (code === 'FILE_TOO_MANY') return t('missions.respond.errTooMany')
  if (code === 'ASSIGNEE_NOT_SUBORDINATE') return t('missions.errAssigneeNotSubordinate')
  if (code === 'MISSION_NOT_FOUND') return t('common.error')
  return code
}

export function mapMissionDelegateError(code: string, t: (key: string) => string): string {
  if (code === 'MISSION_NOT_ASSIGNEE') return t('missions.delegate.errNotAssignee')
  return mapMissionActionError(code, t)
}
