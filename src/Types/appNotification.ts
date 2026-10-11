export const APP_NOTIFICATION_EVENT_TYPES = [
  'shortage_added',
  'shortage_archived',
  'shortage_deleted',
  'transfer_requested',
  'mission_assigned',
  'mission_delegated',
  'plan_added',
  'plan_edited',
  'plan_deleted',
  'order_added',
  'order_edited',
  'order_deleted',
  'entry_added',
  'entry_edited',
  'entry_deleted',
  'exit_added',
  'exit_edited',
  'exit_deleted',
  'stop_added',
  'stop_edited',
  'stop_deleted',
  'scratch_added',
  'scratch_edited',
  'scratch_deleted'
] as const

export type AppNotificationEventType = (typeof APP_NOTIFICATION_EVENT_TYPES)[number]

export type AppNotificationPayload = {
  part_count?: number
  part_description?: string | null
  to_station_name?: string | null
  request_id?: string
  mission_id?: string
  title?: string | null
  plan_year?: number | null
  plan_month?: number | null
  work_date?: string | null
  quantity?: number | null
  count?: number | null
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

export function isMissionNotificationEvent(value: AppNotificationEventType): boolean {
  return value === 'mission_assigned' || value === 'mission_delegated'
}
