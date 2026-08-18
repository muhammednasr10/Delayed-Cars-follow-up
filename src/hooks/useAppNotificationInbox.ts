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
  const [ackedCounts, setAckedCounts] = useState({ missions: 0, requests: 0 })

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
    setAckedCounts(prev => ({
      missions: Math.max(prev.missions, counts.pendingMissions),
      requests: Math.max(prev.requests, counts.pendingRequests)
    }))
  }, [counts.pendingMissions, counts.pendingRequests])

  const unreadEvents = items.filter(i => !i.readAt).length
  const visibleMissions = Math.max(0, counts.pendingMissions - ackedCounts.missions)
  const visibleRequests = Math.max(0, counts.pendingRequests - ackedCounts.requests)
  const total = unreadEvents + visibleMissions + visibleRequests

  return {
    items,
    counts: {
      pendingMissions: visibleMissions,
      pendingRequests: visibleRequests
    },
    unreadEvents,
    total,
    refresh,
    markItemRead,
    markAllRead
  }
}
