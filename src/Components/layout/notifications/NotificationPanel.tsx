import { Bell } from 'lucide-react'
import { useLang } from '../../../i18n/LanguageContext'
import type { AppNotificationItem } from '../../../Types/appNotification'
import { appNotificationLabel } from '../../../Utils/appNotificationCopy'
import { formatDateTime } from '../../../Utils/missingPartPageUtils'

type SummaryItem = { key: string; label: string; onClick: () => void }

type Props = {
  unreadEvents: number
  empty: boolean
  summaryItems: SummaryItem[]
  items: AppNotificationItem[]
  onMarkAllRead: () => void
  onOpenItem: (item: AppNotificationItem) => void
  onOpenProfile: () => void
}

export function NotificationPanel({
  unreadEvents,
  empty,
  summaryItems,
  items,
  onMarkAllRead,
  onOpenItem,
  onOpenProfile
}: Props) {
  const { t, lang } = useLang()

  return (
    <div className="absolute end-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/40">
      <div className="flex items-start justify-between gap-2 border-b border-slate-800 px-4 py-3">
        <div>
          <p className="text-sm font-black text-white">{t('notifications.title')}</p>
          <p className="text-xs text-slate-500">{t('notifications.subtitle')}</p>
        </div>
        {unreadEvents > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="shrink-0 text-[11px] font-bold text-cyan-300 hover:text-cyan-200"
          >
            {t('notifications.markAllRead')}
          </button>
        )}
      </div>
      {empty ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">{t('notifications.empty')}</p>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          {summaryItems.length > 0 && (
            <ul className="divide-y divide-slate-800 border-b border-slate-800">
              {summaryItems.map(item => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="w-full px-4 py-3 text-start text-sm text-slate-200 hover:bg-slate-900"
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
                      className={`w-full px-4 py-3 text-start hover:bg-slate-900 ${unread ? 'bg-cyan-500/5' : ''}`}
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
          className="w-full rounded-lg px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-slate-900"
        >
          {t('notifications.openProfile')}
        </button>
      </div>
    </div>
  )
}
