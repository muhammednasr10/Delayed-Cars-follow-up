import { useCallback, useEffect, useRef } from 'react'

const POLL_MS = 30_000
const REFRESH_COALESCE_MS = 400

export function isInboxRefreshMessage(data: unknown): boolean {
  return Boolean(data && typeof data === 'object' && (data as { type?: unknown }).type === 'INBOX_REFRESH')
}

export function useInboxRefreshSignals(refresh: () => Promise<void> | void) {
  const refreshTimer = useRef<number | null>(null)
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current != null) window.clearTimeout(refreshTimer.current)
    refreshTimer.current = window.setTimeout(() => {
      refreshTimer.current = null
      void refresh()
    }, REFRESH_COALESCE_MS)
  }, [refresh])

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return
      void refresh()
    }, POLL_MS)
    const onFocus = () => scheduleRefresh()
    const onVisible = () => {
      if (document.visibilityState === 'visible') scheduleRefresh()
    }
    const onMessage = (event: MessageEvent) => {
      if (isInboxRefreshMessage(event.data)) scheduleRefresh()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    navigator.serviceWorker?.addEventListener('message', onMessage)
    return () => {
      window.clearInterval(id)
      if (refreshTimer.current != null) window.clearTimeout(refreshTimer.current)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
      navigator.serviceWorker?.removeEventListener('message', onMessage)
    }
  }, [refresh, scheduleRefresh])
}
