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
  event.waitUntil(
    (async () => {
      let payload = {}
      try {
        payload = event.data ? event.data.json() : {}
      } catch {
        payload = {}
      }
      const title = payload.title || 'نظام المتابعة'
      const body = payload.body || 'عندك إشعار جديد'
      await self.registration.showNotification(title, {
        body,
        icon: '/pwa-192x192.png',
        tag: payload.tag || undefined,
        renotify: Boolean(payload.tag),
        data: payload.data || {},
        vibrate: [120, 60, 120]
      })
      if (typeof payload.count === 'number') await applyBadge(payload.count)
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windows) client.postMessage({ type: 'INBOX_REFRESH' })
    })()
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const data = event.notification.data || {}
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = windows.find(client => {
        try {
          return new URL(client.url).origin === self.location.origin
        } catch {
          return false
        }
      })
      if (existing) {
        await existing.focus()
        existing.postMessage({ type: 'PUSH_OPEN', ...data })
        return
      }
      const url = new URL('/', self.location.origin)
      if (data.eventType) url.searchParams.set('afaPushEvent', data.eventType)
      if (data.planMonth != null && data.planMonth !== '') url.searchParams.set('afaPushMonth', String(data.planMonth))
      if (data.notificationId) url.searchParams.set('afaPushId', data.notificationId)
      await self.clients.openWindow(url.href)
    })()
  )
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
