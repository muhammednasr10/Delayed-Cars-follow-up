import type { AppNotificationItem } from '../Types/appNotification'

type Translate = (key: string, vars?: Record<string, string | number>) => string

export function appNotificationLabel(item: AppNotificationItem, t: Translate): string {
  const actor = item.actorName.trim() || t('notifications.someone')
  const vin = item.vin.trim() || '—'
  const part = item.payload.part_description?.trim() || ''
  const station = item.payload.to_station_name?.trim() || ''
  const vars = { actor, vin, part, station, model: item.modelName.trim() }

  switch (item.eventType) {
    case 'shortage_added':
      return part ? t('notifications.shortageAddedPart', vars) : t('notifications.shortageAdded', vars)
    case 'shortage_archived':
      return t('notifications.shortageArchived', vars)
    case 'shortage_deleted':
      return part ? t('notifications.shortageDeletedPart', vars) : t('notifications.shortageDeleted', vars)
    case 'transfer_requested':
      return station ? t('notifications.transferRequestedStation', vars) : t('notifications.transferRequested', vars)
  }
}
