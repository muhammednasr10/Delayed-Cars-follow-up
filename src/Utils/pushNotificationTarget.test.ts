import { describe, expect, it } from 'vitest'
import { PUSH_LOCK_SCREEN_BODY, pushDestination } from './pushNotificationTarget'
import { deliveryDecision, isExpiredPushSubscription, pushHttpStatus } from '../../supabase/functions/_shared/pushDelivery'

describe('pushDestination', () => {
  it('opens the same pages as the in-app bell', () => {
    expect(pushDestination('shortage_added')).toEqual({ kind: 'missing', tab: 'active' })
    expect(pushDestination('shortage_archived')).toEqual({ kind: 'missing', tab: 'history' })
    expect(pushDestination('transfer_requested')).toEqual({ kind: 'missing', tab: 'approvals' })
    expect(pushDestination('mission_assigned')).toEqual({ kind: 'missions' })
    expect(pushDestination('plan_added', 0)).toEqual({ kind: 'planning', tab: 'plan', scope: 'annual' })
    expect(pushDestination('plan_edited', 10)).toEqual({ kind: 'planning', tab: 'plan', scope: 'monthly' })
    expect(pushDestination('order_added')).toEqual({ kind: 'planning', tab: 'orders', scope: 'monthly' })
    expect(pushDestination('entry_added')).toEqual({ kind: 'productivity' })
    expect(pushDestination('exit_deleted')).toEqual({ kind: 'productivity' })
    expect(pushDestination('stop_added')).toEqual({ kind: 'stops' })
    expect(pushDestination('scratch_edited')).toEqual({ kind: 'scratches' })
    expect(pushDestination('unknown')).toBeNull()
  })

  it('keeps the lock-screen text generic', () => {
    expect(PUSH_LOCK_SCREEN_BODY).not.toMatch(/VIN|شاسيه|قطعة/i)
  })
})

describe('deliveryDecision', () => {
  it('sends once and skips duplicates or dead subscriptions', () => {
    expect(deliveryDecision(null)).toBe('send')
    expect(deliveryDecision({ status: 'pending', attempts: 1 })).toBe('skip')
    expect(deliveryDecision({ status: 'pending', attempts: 1 }, true)).toBe('send')
    expect(deliveryDecision({ status: 'pending', attempts: 3 }, true)).toBe('skip')
    expect(deliveryDecision({ status: 'failed', attempts: 1 })).toBe('send')
    expect(deliveryDecision({ status: 'failed', attempts: 2 })).toBe('send')
    expect(deliveryDecision({ status: 'failed', attempts: 3 })).toBe('skip')
    expect(deliveryDecision({ status: 'sent', attempts: 1 })).toBe('skip')
    expect(deliveryDecision({ status: 'gone', attempts: 1 })).toBe('skip')
  })

  it('asks for a webhook retry only when a device still failed', () => {
    expect(pushHttpStatus(0)).toBe(200)
    expect(pushHttpStatus(2)).toBe(503)
  })

  it('treats 404 and 410 as an expired device', () => {
    expect(isExpiredPushSubscription(410)).toBe(true)
    expect(isExpiredPushSubscription(404)).toBe(true)
    expect(isExpiredPushSubscription(500)).toBe(false)
  })
})
