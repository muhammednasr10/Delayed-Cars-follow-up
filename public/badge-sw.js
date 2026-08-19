/* eslint-disable no-undef */
const BADGE_CACHE = 'alts-badge-v1'
const BADGE_KEY = 'count'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    self.clients.claim().then(() => restoreBadge())
  )
})

self.addEventListener('message', event => {
  const data = event.data
  if (!data || data.type !== 'SET_BADGE') return
  event.waitUntil(applyBadge(data.count))
})

self.addEventListener('periodicsync', event => {
  if (event.tag === 'badge-sync') event.waitUntil(restoreBadge())
})

self.addEventListener('push', event => {
  if (!event.data) return
  try {
    const payload = event.data.json()
    if (payload && typeof payload.badge === 'number') {
      event.waitUntil(applyBadge(payload.badge))
    }
  } catch {
    /* not JSON or no badge field */
  }
})

async function applyBadge(count) {
  const n = Math.max(0, Math.min(99, Math.floor(Number(count) || 0)))
  try {
    const cache = await caches.open(BADGE_CACHE)
    await cache.put(BADGE_KEY, new Response(String(n)))
  } catch {
    /* cache unavailable */
  }

  try {
    if (n > 0 && self.registration.setAppBadge) {
      await self.registration.setAppBadge(n)
      return
    }
    if (self.registration.clearAppBadge) await self.registration.clearAppBadge()
  } catch {
    /* unsupported */
  }
}

async function restoreBadge() {
  try {
    const cache = await caches.open(BADGE_CACHE)
    const res = await cache.match(BADGE_KEY)
    if (!res) return
    const n = Number(await res.text())
    if (n > 0) await applyBadge(n)
  } catch {
    /* ignore */
  }
}
