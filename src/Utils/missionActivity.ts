import type { MissionPriority, MissionRecurrenceType, MissionStatus } from '../Types/mission'
import { MISSION_PRIORITIES, MISSION_RECURRENCE_TYPES, MISSION_STATUSES } from '../Types/mission'
import { formatMissionDate } from './missionDisplay'

type Translate = (key: string, vars?: Record<string, string | number>) => string

function displayValue(field: string, value: string, t: Translate, lang: string): string {
  if (field === 'status' && (MISSION_STATUSES as string[]).includes(value)) {
    return t(`missions.status.${value as MissionStatus}`)
  }
  if (field === 'priority' && (MISSION_PRIORITIES as string[]).includes(value)) {
    return t(`missions.priority.${value as MissionPriority}`)
  }
  if (field === 'recurrence_type' && (MISSION_RECURRENCE_TYPES as string[]).includes(value)) {
    return t(`missions.recurrence.${value as MissionRecurrenceType}`)
  }
  if (field === 'due_date') return formatMissionDate(value, lang)
  return value
}

export function missionActivitySentence(
  field: string,
  fromValue: string | null,
  toValue: string | null,
  t: Translate,
  lang: string
): string {
  const fieldLabel = t(`missions.activity.fields.${field}`)
  const label = fieldLabel.startsWith('missions.activity.fields.') ? field : fieldLabel
  const from = fromValue?.trim() ? displayValue(field, fromValue.trim(), t, lang) : ''
  const to = toValue?.trim() ? displayValue(field, toValue.trim(), t, lang) : ''
  if (from && to) return t('missions.activity.changed', { field: label, from, to })
  if (to) return t('missions.activity.set', { field: label, to })
  return t('missions.activity.cleared', { field: label, from })
}
