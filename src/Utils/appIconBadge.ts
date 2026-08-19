const MAX_BADGE = 99
export const APP_BADGE_STORAGE_KEY = 'alts-app-badge'

type BadgeNavigator = Navigator & {
  setAppBadge?: (count: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

type BadgeRegistration = ServiceWorkerRegistration & {
  setAppBadge?: (count: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
  periodicSync?: {
    register: (tag: string, options?: { minInterval?: number }) => Promise<void>
  }
}

function clampBadgeCount(count: number): number {
  if (!Number.isFinite(count) || count <= 0) return 0
  return Math.min(MAX_BADGE, Math.floor(count))
}

function persistBadgeCount(count: number): void {
  try {
    localStorage.setItem(APP_BADGE_STORAGE_KEY, String(count))
  } catch {
    /* private mode / quota */
  }
}

function readPersistedBadgeCount(): number {
  try {
    return clampBadgeCount(Number(localStorage.getItem(APP_BADGE_STORAGE_KEY) ?? 0))
  } catch {
    return 0
  }
}

async function applyBadge(
  target: { setAppBadge?: (count: number) => Promise<void>; clearAppBadge?: () => Promise<void> },
  count: number
) {
  if (count > 0) {
    if (!target.setAppBadge) return
    await target.setAppBadge(count)
    return
  }
  if (target.clearAppBadge) await target.clearAppBadge()
}

async function postBadgeToServiceWorker(count: number): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const payload = { type: 'SET_BADGE', count }
  try {
    const registration = await navigator.serviceWorker.ready
    // Try all channels to reach the SW
    navigator.serviceWorker.controller?.postMessage(payload)
    registration.active?.postMessage(payload)
    // Also set via registration directly (works even when controller is null)
    await applyBadge(registration as BadgeRegistration, count)
  } catch {
    /* no active service worker yet */
  }
}

export async function registerBadgeBackgroundSync(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  try {
    const registration = (await navigator.serviceWorker.ready) as BadgeRegistration
    if (!registration.periodicSync) return
    await registration.periodicSync.register('badge-sync', { minInterval: 15 * 60 * 1000 })
  } catch {
    /* permission denied or unsupported */
  }
}

export async function syncAppIconBadge(count: number): Promise<void> {
  const badge = clampBadgeCount(count)
  persistBadgeCount(badge)
  const nav = navigator as BadgeNavigator

  // Try navigator-level badge first (works in standalone PWA)
  try {
    await applyBadge(nav, badge)
  } catch {
    /* unsupported or blocked */
  }

  // Also push to SW so badge persists when app is closed
  await postBadgeToServiceWorker(badge)
}

export async function restoreAppIconBadge(): Promise<void> {
  const badge = readPersistedBadgeCount()
  if (badge <= 0) return
  await syncAppIconBadge(badge)
}

export async function clearAppIconBadge(): Promise<void> {
  persistBadgeCount(0)
  await syncAppIconBadge(0)
}
