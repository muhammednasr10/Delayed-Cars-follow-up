import { useEffect } from 'react'
import { registerBadgeBackgroundSync, syncAppIconBadge } from '../Utils/appIconBadge'

export function useNotificationBadgeSync(unreadCount: number) {
  useEffect(() => {
    void syncAppIconBadge(unreadCount)
  }, [unreadCount])

  useEffect(() => {
    void registerBadgeBackgroundSync()
    const onHide = () => {
      if (document.visibilityState === 'hidden') void syncAppIconBadge(unreadCount)
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
    }
  }, [unreadCount])
}
