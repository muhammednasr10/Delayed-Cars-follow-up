import { useCallback, useEffect, useState } from 'react'
import { useAuth, profileIsAdmin } from '../Context/AuthContext'
import type { AppNotificationItem } from '../Types/appNotification'
import { fetchAppNotificationCounts, type AppNotificationCounts } from '../services/notificationService'
import { listAppNotifications, markAppNotificationsRead } from '../services/appNotificationService'

const POLL_MS = 30_000

const EMPTY_COUNTS: AppNotificationCounts = { pendingMissions: 0, pendingRequests: 0 }

export function useAppNotificationInbox() {
  const { profile } = useAuth()
  const employeeId = profile?.employee_id ?? null
  const isAdmin = profileIsAdmin(profile)
  const [counts, setCounts] = useState<AppNotificationCounts>(EMPTY_COUNTS)
  const [items, setItems] = useState<AppNotificationItem[]>([])

  const refresh = useCallback(async () => {
    const [nextCounts, nextItems] = await Promise.all([
      fetchAppNotificationCounts(employeeId, isAdmin),
      listAppNotifications().catch(() => [] as AppNotificationItem[])
    ])
    setCounts(nextCounts)
    setItems(nextItems)
  }, [employeeId, isAdmin])

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), POLL_MS)
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  const markItemRead = useCallback(async (id: string) => {
    await markAppNotificationsRead([id]).catch(() => undefined)
    const now = new Date().toISOString()
    setItems(prev => prev.map(row => (row.id === id && !row.readAt ? { ...row, readAt: now } : row)))
  }, [])

  const markAllRead = useCallback(async () => {
    await markAppNotificationsRead().catch(() => undefined)
    const now = new Date().toISOString()
    setItems(prev => prev.map(row => (row.readAt ? row : { ...row, readAt: now })))
  }, [])

  const unreadEvents = items.filter(i => !i.readAt).length
  const total = unreadEvents + counts.pendingMissions + counts.pendingRequests

  return { items, counts, unreadEvents, total, refresh, markItemRead, markAllRead }
}
