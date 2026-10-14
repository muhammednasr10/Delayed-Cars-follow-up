import { createContext, useContext, type ReactNode } from 'react'
import { useAppNotificationInbox } from '../hooks/useAppNotificationInbox'
import { useNotificationBadgeSync } from '../hooks/useNotificationBadgeSync'

type InboxValue = ReturnType<typeof useAppNotificationInbox>

const NotificationInboxContext = createContext<InboxValue | null>(null)

export function NotificationInboxProvider({ children }: { children: ReactNode }) {
  const inbox = useAppNotificationInbox()
  useNotificationBadgeSync(inbox.total)

  return <NotificationInboxContext.Provider value={inbox}>{children}</NotificationInboxContext.Provider>
}

export function useNotificationInbox(): InboxValue {
  const value = useContext(NotificationInboxContext)
  if (!value) throw new Error('useNotificationInbox must be used within NotificationInboxProvider')
  return value
}
