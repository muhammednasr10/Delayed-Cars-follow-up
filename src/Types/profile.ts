import type { WorkerProfileTab } from './navigation'

/** تبويبات صفحة حسابي الموحّدة (حساب المستخدم + بيانات العامل) */
export type ProfileTab =
  | 'account'
  | 'data'
  | 'org'
  | 'station'
  | 'equipment'
  | 'attendance'
  | 'errors'
  | 'missions'
  | 'permissions'

export const PROFILE_TABS: ProfileTab[] = [
  'account',
  'data',
  'org',
  'station',
  'equipment',
  'attendance',
  'errors',
  'missions',
  'permissions'
]

export const WORKER_PROFILE_TAB_KEYS = ['data', 'station', 'equipment', 'attendance', 'errors'] as const

export type WorkerProfileTabKey = (typeof WORKER_PROFILE_TAB_KEYS)[number]

export function isWorkerProfileTab(tab: ProfileTab): tab is WorkerProfileTabKey {
  return (WORKER_PROFILE_TAB_KEYS as readonly string[]).includes(tab)
}

export function profileTabFromWorkerTab(tab: WorkerProfileTab): ProfileTab {
  return tab
}
