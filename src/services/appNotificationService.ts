import { supabase } from '../lib/supabase'
import type { AppNotificationItem, AppNotificationPayload } from '../Types/appNotification'
import { parseAppNotificationEventType } from '../Types/appNotification'

type NotificationRow = {
  id: string
  event_type: string
  vehicle_id: string | null
  vin: string | null
  model_name: string | null
  actor_id: string | null
  actor_name: string | null
  payload: AppNotificationPayload | null
  created_at: string
  read_at: string | null
}

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

function isMissingRpc(message: string) {
  return message.includes('Could not find the function') || message.includes('schema cache')
}

function mapNotification(row: NotificationRow): AppNotificationItem | null {
  const eventType = parseAppNotificationEventType(row.event_type)
  if (!eventType) return null
  return {
    id: row.id,
    eventType,
    vehicleId: row.vehicle_id,
    vin: row.vin?.trim() || '',
    modelName: row.model_name?.trim() || '',
    actorId: row.actor_id,
    actorName: row.actor_name?.trim() || '',
    payload: row.payload ?? {},
    createdAt: row.created_at,
    readAt: row.read_at
  }
}

export async function listAppNotifications(): Promise<AppNotificationItem[]> {
  const { data, error } = await requireClient().rpc('list_app_notifications', { p_limit: 40 })
  if (error) {
    if (isMissingRpc(error.message)) return []
    throw new Error(error.message)
  }
  return ((data ?? []) as NotificationRow[])
    .map(mapNotification)
    .filter((row): row is AppNotificationItem => row != null)
}

export async function markAppNotificationsRead(ids?: string[]): Promise<void> {
  const { error } = await requireClient().rpc('mark_app_notifications_read', {
    p_ids: ids && ids.length > 0 ? ids : null
  })
  if (!error) return
  if (isMissingRpc(error.message)) return
  throw new Error(error.message)
}
