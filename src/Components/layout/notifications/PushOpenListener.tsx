import { useEffect, useRef } from 'react'
import { useNavigation } from '../../../Context/NavigationContext'
import { useNotificationInbox } from '../../../Context/NotificationInboxProvider'
import { markAppNotificationsRead } from '../../../services/appNotificationService'
import { dispatchOpenMissingPartsTab, productionNavigatePatch } from '../../../Utils/openMissingPartsTab'
import { pushDestination } from '../../../Utils/pushNotificationTarget'

type PushMessage = {
  type?: string
  eventType?: string
  planMonth?: number | null
  notificationId?: string
}

function readLaunchHint(): PushMessage | null {
  const params = new URLSearchParams(window.location.search)
  const eventType = params.get('afaPushEvent')
  if (!eventType) return null
  const month = params.get('afaPushMonth')
  return {
    eventType,
    planMonth: month == null || month === '' ? null : Number(month),
    notificationId: params.get('afaPushId') ?? undefined
  }
}

function clearLaunchHint() {
  const url = new URL(window.location.href)
  url.searchParams.delete('afaPushEvent')
  url.searchParams.delete('afaPushMonth')
  url.searchParams.delete('afaPushId')
  window.history.replaceState({}, '', url.pathname + url.search + url.hash)
}

export function PushOpenListener() {
  const nav = useNavigation()
  const inbox = useNotificationInbox()
  const navRef = useRef(nav)
  const refreshRef = useRef(inbox.refresh)
  navRef.current = nav
  refreshRef.current = inbox.refresh

  useEffect(() => {
    async function openFromPush(message: PushMessage) {
      if (!message.eventType) return
      if (message.notificationId) {
        await markAppNotificationsRead([message.notificationId]).catch(() => undefined)
        void refreshRef.current()
      }
      const destination = pushDestination(message.eventType, message.planMonth)
      if (!destination) return
      const go = navRef.current
      if (destination.kind === 'missing') {
        go.navigate(productionNavigatePatch('missing'))
        queueMicrotask(() => dispatchOpenMissingPartsTab(destination.tab))
        return
      }
      if (destination.kind === 'missions') {
        go.navigate(productionNavigatePatch('missions'))
        return
      }
      if (destination.kind === 'planning') {
        go.navigate({
          department: 'planning',
          planningTab: destination.tab,
          planScope: destination.scope,
          showProfile: false,
          showGlobalHome: false,
          closeSidebar: true
        })
        return
      }
      if (destination.kind === 'scratches') {
        go.navigate({
          department: 'production',
          productionArea: 'assembly',
          productionPage: 'scratches',
          showProfile: false,
          showGlobalHome: false,
          closeSidebar: true
        })
        return
      }
      go.navigate({
        department: 'production',
        productionArea: 'assembly',
        productionPage: 'vehicles',
        productivityTab: destination.kind === 'stops' ? 'stops' : 'productivity',
        showProfile: false,
        showGlobalHome: false,
        closeSidebar: true
      })
    }

    const launch = readLaunchHint()
    if (launch) {
      clearLaunchHint()
      void openFromPush(launch)
    }

    if (!('serviceWorker' in navigator)) return
    const onMessage = (event: MessageEvent<PushMessage>) => {
      if (event.data?.type !== 'PUSH_OPEN') return
      void openFromPush(event.data)
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
    // Mount once. Navigation and refresh are read from refs so a new inbox object cannot loop this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
