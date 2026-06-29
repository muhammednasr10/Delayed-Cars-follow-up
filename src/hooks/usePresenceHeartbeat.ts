import { useEffect } from 'react'
import { touchMyPresence } from '../services/presenceService'

const HEARTBEAT_MS = 60_000

/** يحدّث last_seen للمستخدم الحالي طالما التطبيق مفتوح */
export function usePresenceHeartbeat(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    function ping() {
      if (document.visibilityState === 'hidden') return
      void touchMyPresence(window.location.pathname).catch(() => {})
    }

    ping()
    const id = window.setInterval(ping, HEARTBEAT_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') ping()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', ping)

    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', ping)
    }
  }, [enabled])
}
