import { describe, expect, it } from 'vitest'
import type { AppNotificationItem } from '../Types/appNotification'
import { activityNotificationTarget, appNotificationLabel } from './appNotificationCopy'
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
    'notifications.missionDelegated': '{actor} حوّل إليك مهمة «{title}»',
    'notifications.planAnnual': 'الخطة السنوية {year}',
    'notifications.planAdded': '{actor} أضاف خطة إنتاج {title}',
    'notifications.orderEdited': '{actor} عدّل أمر إنتاج {title}',
    'notifications.entryAdded': '{actor} أضاف إنتاجية دخول {title}',
    'notifications.stopDeleted': '{actor} حذف توقف {title}',
    'notifications.scratchAddedDetail': '{actor} أضاف خدش «{title}» على الشاسيه {vin}'
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
    expect(
      appNotificationLabel(
        item({ eventType: 'plan_added', payload: { title: 'T7', plan_year: 2026, plan_month: 10, count: 1 } }),
        t
      )
    ).toBe('أحمد أضاف خطة إنتاج T7 · 10/2026')
    expect(
      appNotificationLabel(item({ eventType: 'order_edited', vin: '', payload: { title: 'PO-12 · T7', count: 1 } }), t)
    ).toBe('أحمد عدّل أمر إنتاج PO-12 · T7')
    expect(
      appNotificationLabel(
        item({
          eventType: 'entry_added',
          vin: '',
          payload: { title: 'T7', work_date: '2026-10-11', quantity: 40, count: 1 }
        }),
        t
      )
    ).toBe('أحمد أضاف إنتاجية دخول T7 · 2026-10-11 · 40')
    expect(appNotificationLabel(item({ eventType: 'stop_deleted', vin: '', payload: { title: 'نقص خامات' } }), t)).toBe(
      'أحمد حذف توقف نقص خامات'
    )
    expect(
      appNotificationLabel(item({ eventType: 'scratch_added', vin: '7306', payload: { title: 'كسيل دهان' } }), t)
    ).toBe('أحمد أضاف خدش «كسيل دهان» على الشاسيه 7306')
  })
})

describe('activityNotificationTarget', () => {
  it('opens the page that matches the change', () => {
    expect(activityNotificationTarget(item({ eventType: 'plan_added', payload: { plan_month: 0 } }))?.kind).toBe(
      'planning'
    )
    expect(activityNotificationTarget(item({ eventType: 'plan_added', payload: { plan_month: 0 } }))).toMatchObject({
      scope: 'annual'
    })
    expect(activityNotificationTarget(item({ eventType: 'order_deleted' }))).toMatchObject({ tab: 'orders' })
    expect(activityNotificationTarget(item({ eventType: 'entry_edited' }))).toEqual({ kind: 'productivity' })
    expect(activityNotificationTarget(item({ eventType: 'exit_added' }))).toEqual({ kind: 'productivity' })
    expect(activityNotificationTarget(item({ eventType: 'stop_added' }))).toEqual({ kind: 'stops' })
    expect(activityNotificationTarget(item({ eventType: 'scratch_deleted' }))).toEqual({ kind: 'scratches' })
    expect(activityNotificationTarget(item({ eventType: 'shortage_added' }))).toBeNull()
  })
})

describe('missingPartsTabForNotification', () => {
  it('opens approvals for transfer and history for archive', () => {
    expect(missingPartsTabForNotification(item({ eventType: 'transfer_requested' }))).toBe('approvals')
    expect(missingPartsTabForNotification(item({ eventType: 'shortage_archived' }))).toBe('history')
    expect(missingPartsTabForNotification(item({ eventType: 'shortage_added' }))).toBe('active')
  })
})
