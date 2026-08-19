import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useAppNotificationInbox } from '../hooks/useAppNotificationInbox'
import { registerBadgeBackgroundSync, syncAppIconBadge } from '../Utils/appIconBadge'

type InboxValue = ReturnType<typeof useAppNotificationInbox>

const NotificationInboxContext = createContext<InboxValue | null>(null)

export function NotificationInboxProvider({ children }: { children: ReactNode }) {
  const inbox = useAppNotificationInbox()

  useEffect(() => {
    void syncAppIconBadge(inbox.total)
  }, [inbox.total])

  useEffect(() => {
    void registerBadgeBackgroundSync()
    const onHide = () => {
      if (document.visibilityState === 'hidden') void syncAppIconBadge(inbox.total)
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
    }
  }, [inbox.total])

  return <NotificationInboxContext.Provider value={inbox}>{children}</NotificationInboxContext.Provider>
}

export function useNotificationInbox(): InboxValue {
  const value = useContext(NotificationInboxContext)
  if (!value) throw new Error('useNotificationInbox must be used within NotificationInboxProvider')
  return value
}
