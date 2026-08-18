import { Bell, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useLang } from '../../../i18n/LanguageContext'
import type { AppNotificationItem } from '../../../Types/appNotification'
import { appNotificationLabel } from '../../../Utils/appNotificationCopy'
import { formatDateTime } from '../../../Utils/missingPartPageUtils'

type SummaryItem = { key: string; label: string; onClick: () => void }

type Props = {
  layout: 'dropdown' | 'sheet'
  unreadEvents: number
  empty: boolean
  summaryItems: SummaryItem[]
  items: AppNotificationItem[]
  onClose: () => void
  onMarkAllRead: () => void
  onOpenItem: (item: AppNotificationItem) => void
  onOpenProfile: () => void
}

function NotificationPanelBody({
  layout,
  unreadEvents,
  empty,
  summaryItems,
  items,
  onClose,
  onMarkAllRead,
  onOpenItem,
  onOpenProfile
}: Props) {
  const { t, lang } = useLang()
  const sheet = layout === 'sheet'

  return (
    <div
      className={
        sheet
          ? 'flex max-h-[min(80dvh,36rem)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/40'
          : 'absolute end-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/40'
      }
      onClick={sheet ? e => e.stopPropagation() : undefined}
    >
      <div className="flex items-start justify-between gap-2 border-b border-slate-800 px-4 py-3">
        <div className={`min-w-0 ${sheet ? 'flex items-center gap-2' : ''}`}>
          {sheet && (
            <div className="rounded-xl bg-cyan-500/15 p-2 text-cyan-300">
              <Bell className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-black text-white">{t('notifications.title')}</p>
            <p className="text-xs text-slate-500">{t('notifications.subtitle')}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {unreadEvents > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="rounded-lg px-2 py-1.5 text-[11px] font-bold text-cyan-300 hover:bg-slate-900 hover:text-cyan-200"
            >
              {t('notifications.markAllRead')}
            </button>
          )}
          {sheet && (
            <button
              type="button"
              onClick={onClose}
              className="touch-target rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
              aria-label={t('common.close')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {empty ? (
        <p className={`px-4 text-center text-sm text-slate-500 ${sheet ? 'py-8' : 'py-6'}`}>
          {t('notifications.empty')}
        </p>
      ) : (
        <div className={sheet ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain' : 'max-h-80 overflow-y-auto'}>
          {summaryItems.length > 0 && (
            <ul className="divide-y divide-slate-800 border-b border-slate-800">
              {summaryItems.map(item => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={item.onClick}
                    className={`w-full px-4 text-start text-sm text-slate-200 hover:bg-slate-900 ${sheet ? 'py-3.5' : 'py-3'}`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {items.length > 0 && (
            <ul className="divide-y divide-slate-800">
              {items.map(item => {
                const { date, time } = formatDateTime(item.createdAt, lang)
                const unread = !item.readAt
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onOpenItem(item)}
                      className={`w-full px-4 text-start hover:bg-slate-900 ${sheet ? 'py-3.5' : 'py-3'} ${
                        unread ? 'bg-cyan-500/5' : ''
                      }`}
                    >
                      <p className={`text-sm ${unread ? 'font-bold text-white' : 'text-slate-300'}`}>
                        {appNotificationLabel(item, t)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {date} · {time}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
      <div className="border-t border-slate-800 p-2">
        <button
          type="button"
          onClick={onOpenProfile}
          className={`w-full rounded-lg px-3 text-xs font-bold text-cyan-300 hover:bg-slate-900 ${
            sheet ? 'py-2.5' : 'py-2'
          }`}
        >
          {t('notifications.openProfile')}
        </button>
      </div>
    </div>
  )
}

export function NotificationPanel(props: Props) {
  if (props.layout === 'dropdown') return <NotificationPanelBody {...props} />

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center overflow-hidden bg-black/60 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm"
      onClick={props.onClose}
    >
      <NotificationPanelBody {...props} />
    </div>,
    document.body
  )
}
