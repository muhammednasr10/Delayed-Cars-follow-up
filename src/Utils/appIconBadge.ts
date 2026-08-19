const MAX_BADGE = 99

type BadgeNavigator = Navigator & {
  setAppBadge?: (count: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

type BadgeRegistration = ServiceWorkerRegistration & {
  setAppBadge?: (count: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

function clampBadgeCount(count: number): number {
  if (!Number.isFinite(count) || count <= 0) return 0
  return Math.min(MAX_BADGE, Math.floor(count))
}

async function applyBadge(target: { setAppBadge?: (count: number) => Promise<void>; clearAppBadge?: () => Promise<void> }, count: number) {
  if (count > 0) {
    if (!target.setAppBadge) return
    await target.setAppBadge(count)
    return
  }
  if (target.clearAppBadge) await target.clearAppBadge()
}

export async function syncAppIconBadge(count: number): Promise<void> {
  const badge = clampBadgeCount(count)
  const nav = navigator as BadgeNavigator

  try {
    await applyBadge(nav, badge)
  } catch {
    /* unsupported or blocked */
  }

  if (!('serviceWorker' in navigator)) return

  try {
    const registration = (await navigator.serviceWorker.ready) as BadgeRegistration
    await applyBadge(registration, badge)
  } catch {
    /* no active service worker yet */
  }
}

export async function clearAppIconBadge(): Promise<void> {
  await syncAppIconBadge(0)
}
