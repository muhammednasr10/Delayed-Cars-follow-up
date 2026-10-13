export type PushDestination =
  | { kind: 'missing'; tab: 'active' | 'history' | 'approvals' }
  | { kind: 'missions' }
  | { kind: 'planning'; tab: 'plan' | 'orders'; scope: 'monthly' | 'annual' }
  | { kind: 'productivity' }
  | { kind: 'stops' }
  | { kind: 'scratches' }

/** Where a push tap should open. Same pages as the in-app bell. */
export function pushDestination(eventType: string, planMonth?: number | null): PushDestination | null {
  if (eventType === 'transfer_requested') return { kind: 'missing', tab: 'approvals' }
  if (eventType === 'shortage_archived') return { kind: 'missing', tab: 'history' }
  if (eventType === 'shortage_added' || eventType === 'shortage_deleted') return { kind: 'missing', tab: 'active' }
  if (eventType === 'mission_assigned' || eventType === 'mission_delegated') return { kind: 'missions' }
  if (eventType.startsWith('plan_')) {
    return { kind: 'planning', tab: 'plan', scope: planMonth === 0 ? 'annual' : 'monthly' }
  }
  if (eventType.startsWith('order_')) return { kind: 'planning', tab: 'orders', scope: 'monthly' }
  if (eventType.startsWith('entry_') || eventType.startsWith('exit_')) return { kind: 'productivity' }
  if (eventType.startsWith('stop_')) return { kind: 'stops' }
  if (eventType.startsWith('scratch_')) return { kind: 'scratches' }
  return null
}

export const PUSH_LOCK_SCREEN_TITLE = 'نظام المتابعة'
export const PUSH_LOCK_SCREEN_BODY = 'عندك إشعار جديد'
