import type { AppNotificationEventType, AppNotificationItem } from '../Types/appNotification'

type Translate = (key: string, vars?: Record<string, string | number>) => string

const ACTIVITY_LABEL_KEYS: Partial<Record<AppNotificationEventType, string>> = {
  plan_added: 'notifications.planAdded',
  plan_edited: 'notifications.planEdited',
  plan_deleted: 'notifications.planDeleted',
  order_added: 'notifications.orderAdded',
  order_edited: 'notifications.orderEdited',
  order_deleted: 'notifications.orderDeleted',
  entry_added: 'notifications.entryAdded',
  entry_edited: 'notifications.entryEdited',
  entry_deleted: 'notifications.entryDeleted',
  exit_added: 'notifications.exitAdded',
  exit_edited: 'notifications.exitEdited',
  exit_deleted: 'notifications.exitDeleted',
  stop_added: 'notifications.stopAdded',
  stop_edited: 'notifications.stopEdited',
  stop_deleted: 'notifications.stopDeleted',
  scratch_added: 'notifications.scratchAdded',
  scratch_edited: 'notifications.scratchEdited',
  scratch_deleted: 'notifications.scratchDeleted'
}

function activitySubject(item: AppNotificationItem, t: Translate): string {
  const count = Number(item.payload.count ?? 1)
  const name = item.payload.title?.trim() || ''
  const year = item.payload.plan_year
  const month = item.payload.plan_month
  if (year != null && month != null) {
    const when = month === 0 ? t('notifications.planAnnual', { year }) : `${String(month).padStart(2, '0')}/${year}`
    if (count > 1) return `${when} · ${count}`
    return name ? `${name} · ${when}` : when
  }
  const date = item.payload.work_date?.trim() || ''
  const qty = item.payload.quantity
  if (date || qty != null) {
    if (count > 1) return date ? `${date} · ${count}` : String(count)
    return [name, date, qty != null ? String(qty) : ''].filter(Boolean).join(' · ') || '—'
  }
  return name || '—'
}

export type ActivityNotificationTarget =
  | { kind: 'planning'; tab: 'plan' | 'orders'; scope: 'monthly' | 'annual' }
  | { kind: 'productivity' }
  | { kind: 'stops' }
  | { kind: 'scratches' }

export function activityNotificationTarget(item: AppNotificationItem): ActivityNotificationTarget | null {
  const eventType = item.eventType
  if (eventType.startsWith('plan_')) {
    return { kind: 'planning', tab: 'plan', scope: item.payload.plan_month === 0 ? 'annual' : 'monthly' }
  }
  if (eventType.startsWith('order_')) return { kind: 'planning', tab: 'orders', scope: 'monthly' }
  if (eventType.startsWith('entry_') || eventType.startsWith('exit_')) return { kind: 'productivity' }
  if (eventType.startsWith('stop_')) return { kind: 'stops' }
  if (eventType.startsWith('scratch_')) return { kind: 'scratches' }
  return null
}

export function appNotificationLabel(item: AppNotificationItem, t: Translate): string {
  const actor = item.actorName.trim() || t('notifications.someone')
  const vin = item.vin.trim() || '—'
  const part = item.payload.part_description?.trim() || ''
  const station = item.payload.to_station_name?.trim() || ''
  const title = activitySubject(item, t)
  const vars = { actor, vin, part, station, model: item.modelName.trim(), title }
  const activityKey = ACTIVITY_LABEL_KEYS[item.eventType]
  if (activityKey) {
    if (item.eventType.startsWith('scratch_') && item.payload.title?.trim() && item.vin.trim()) {
      const detailKey =
        item.eventType === 'scratch_added'
          ? 'notifications.scratchAddedDetail'
          : item.eventType === 'scratch_edited'
            ? 'notifications.scratchEditedDetail'
            : 'notifications.scratchDeletedDetail'
      return t(detailKey, { ...vars, title: item.payload.title.trim() })
    }
    return t(activityKey, vars)
  }

  switch (item.eventType) {
    case 'shortage_added':
      return part ? t('notifications.shortageAddedPart', vars) : t('notifications.shortageAdded', vars)
    case 'shortage_archived':
      return t('notifications.shortageArchived', vars)
    case 'shortage_deleted':
      return part ? t('notifications.shortageDeletedPart', vars) : t('notifications.shortageDeleted', vars)
    case 'transfer_requested':
      return station ? t('notifications.transferRequestedStation', vars) : t('notifications.transferRequested', vars)
    case 'mission_assigned':
      return t('notifications.missionAssigned', vars)
    case 'mission_delegated':
      return t('notifications.missionDelegated', vars)
    default:
      return title
  }
}
