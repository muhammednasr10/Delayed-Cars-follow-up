import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useNavigation } from '../../Context/NavigationContext'
import { useNotificationInbox } from '../../Context/NotificationInboxProvider'
import { isMissionNotificationEvent, type AppNotificationItem } from '../../Types/appNotification'
import {
  dispatchOpenMissingPartsTab,
  missingPartsTabForNotification,
  productionNavigatePatch
} from '../../Utils/openMissingPartsTab'
import { NotificationPanel } from './notifications/NotificationPanel'

const MOBILE_MQ = '(max-width: 639px)'

export function HeaderNotificationsBell() {
  const { t } = useLang()
  const nav = useNavigation()
  const { items, counts, total, refresh, markItemRead, markAllRead } = useNotificationInbox()
  const [open, setOpen] = useState(false)
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_MQ).matches : false
  )
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    const onChange = () => setMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!open || mobile) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, mobile])

  function closeAndNavigate(page: 'missing' | 'missions' | 'requests') {
    setOpen(false)
    nav.navigate(productionNavigatePatch(page))
  }

  function goMissing(item: AppNotificationItem) {
    closeAndNavigate('missing')
    queueMicrotask(() => dispatchOpenMissingPartsTab(missingPartsTabForNotification(item)))
  }

  async function openItem(item: AppNotificationItem) {
    if (!item.readAt) await markItemRead(item.id)
    if (isMissionNotificationEvent(item.eventType)) {
      closeAndNavigate('missions')
      return
    }
    goMissing(item)
  }

  const summaryItems = [
    counts.pendingMissions > 0 && {
      key: 'missions',
      label: t('notifications.missions', { n: counts.pendingMissions }),
      onClick: () => closeAndNavigate('missions')
    },
    counts.pendingRequests > 0 && {
      key: 'requests',
      label: t('notifications.requests', { n: counts.pendingRequests }),
      onClick: () => closeAndNavigate('requests')
    }
  ].filter(Boolean) as { key: string; label: string; onClick: () => void }[]

  const panel = open ? (
    <NotificationPanel
      layout={mobile ? 'sheet' : 'dropdown'}
      empty={summaryItems.length === 0 && items.length === 0}
      showMarkAll={total > 0}
      summaryItems={summaryItems}
      items={items}
      onClose={() => setOpen(false)}
      onMarkAllRead={() => void markAllRead()}
      onOpenItem={item => void openItem(item)}
      onOpenProfile={() => {
        setOpen(false)
        nav.openProfile('account')
      }}
    />
  ) : null

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(v => !v)
          void refresh()
        }}
        className="relative touch-target rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-slate-200 hover:border-slate-600 hover:bg-slate-800"
        title={t('notifications.title')}
        aria-label={t('notifications.title')}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {total > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>
      {panel}
    </div>
  )
}
