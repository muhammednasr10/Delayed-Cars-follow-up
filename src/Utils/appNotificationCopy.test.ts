import { describe, expect, it } from 'vitest'
import type { AppNotificationItem } from '../Types/appNotification'
import { appNotificationLabel } from './appNotificationCopy'
import { missingPartsTabForNotification } from './openMissingPartsTab'

const t = (key: string, vars?: Record<string, string | number>) => {
  const map: Record<string, string> = {
    'notifications.someone': 'مستخدم',
    'notifications.shortageAdded': '{actor} أضاف نقص على الشاسيه {vin}',
    'notifications.shortageAddedPart': '{actor} أضاف نقص «{part}» على الشاسيه {vin}',
    'notifications.shortageArchived': '{actor} أرشف سيارة {vin}',
    'notifications.shortageDeleted': '{actor} حذف نقصاً على الشاسيه {vin}',
    'notifications.shortageDeletedPart': '{actor} حذف نقص «{part}» على الشاسيه {vin}',
    'notifications.transferRequested': '{actor} طلب ترحيل الشاسيه {vin}',
    'notifications.transferRequestedStation': '{actor} طلب ترحيل الشاسيه {vin} إلى {station}',
    'notifications.missionAssigned': '{actor} عيّن لك مهمة «{title}»',
    'notifications.missionDelegated': '{actor} حوّل إليك مهمة «{title}»'
  }
  let out = map[key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v))
  }
  return out
}

function item(overrides: Partial<AppNotificationItem>): AppNotificationItem {
  return {
    id: '1',
    eventType: 'shortage_added',
    vehicleId: 'v1',
    vin: '7306',
    modelName: 'T7',
    actorId: 'u1',
    actorName: 'أحمد',
    payload: {},
    createdAt: '2026-08-16T10:00:00Z',
    readAt: null,
    ...overrides
  }
}

describe('appNotificationLabel', () => {
  it('describes add, archive, delete, and transfer', () => {
    expect(appNotificationLabel(item({ payload: { part_description: 'مرآة' } }), t)).toContain('مرآة')
    expect(appNotificationLabel(item({ eventType: 'shortage_archived' }), t)).toContain('أرشف')
    expect(
      appNotificationLabel(item({ eventType: 'shortage_deleted', payload: { part_description: 'باب' } }), t)
    ).toContain('حذف')
    expect(
      appNotificationLabel(item({ eventType: 'transfer_requested', payload: { to_station_name: 'QP1' } }), t)
    ).toContain('QP1')
    expect(
      appNotificationLabel(item({ eventType: 'mission_assigned', payload: { title: 'إصلاح المحطة' } }), t)
    ).toContain('إصلاح المحطة')
    expect(
      appNotificationLabel(item({ eventType: 'mission_delegated', payload: { title: 'متابعة النقص' } }), t)
    ).toContain('حوّل')
  })
})

describe('missingPartsTabForNotification', () => {
  it('opens approvals for transfer and history for archive', () => {
    expect(missingPartsTabForNotification(item({ eventType: 'transfer_requested' }))).toBe('approvals')
    expect(missingPartsTabForNotification(item({ eventType: 'shortage_archived' }))).toBe('history')
    expect(missingPartsTabForNotification(item({ eventType: 'shortage_added' }))).toBe('active')
  })
})
