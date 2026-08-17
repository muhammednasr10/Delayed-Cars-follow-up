export const APP_NOTIFICATION_EVENT_TYPES = [
  'shortage_added',
  'shortage_archived',
  'shortage_deleted',
  'transfer_requested'
] as const

export type AppNotificationEventType = (typeof APP_NOTIFICATION_EVENT_TYPES)[number]

export type AppNotificationPayload = {
  part_count?: number
  part_description?: string | null
  to_station_name?: string | null
  request_id?: string
}

export type AppNotificationItem = {
  id: string
  eventType: AppNotificationEventType
  vehicleId: string | null
  vin: string
  modelName: string
  actorId: string | null
  actorName: string
  payload: AppNotificationPayload
  createdAt: string
  readAt: string | null
}

export const OPEN_MISSING_PARTS_EVENT = 'afa:open-missing-parts'

export function parseAppNotificationEventType(value: string | null | undefined): AppNotificationEventType | null {
  if (!value) return null
  return (APP_NOTIFICATION_EVENT_TYPES as readonly string[]).includes(value)
    ? (value as AppNotificationEventType)
    : null
}
