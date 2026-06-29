import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useAuth, profileIsAdmin } from '../../Context/AuthContext'
import { useLang } from '../../i18n/LanguageContext'
import { useNavigation } from '../../Context/NavigationContext'
import { fetchAppNotificationCounts } from '../../services/notificationService'
import type { ProfileTab } from '../../Types/profile'

const POLL_MS = 60_000

export function HeaderNotificationsBell() {
  const { t } = useLang()
  const { profile } = useAuth()
  const nav = useNavigation()
  const [open, setOpen] = useState(false)
  const [counts, setCounts] = useState({ pendingMissions: 0, pendingRequests: 0 })
  const rootRef = useRef<HTMLDivElement>(null)

  const employeeId = profile?.employee_id ?? null
  const isAdmin = profileIsAdmin(profile)

  const refresh = useCallback(async () => {
    setCounts(await fetchAppNotificationCounts(employeeId, isAdmin))
  }, [employeeId, isAdmin])

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), POLL_MS)
    return () => window.clearInterval(id)
  }, [refresh])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const total = counts.pendingMissions + counts.pendingRequests

  function goMissions() {
    setOpen(false)
    nav.navigate({
      department: 'production',
      productionArea: 'assembly',
      productionPage: 'missions',
      showProfile: false,
      showGlobalHome: false,
      closeSidebar: true
    })
  }

  function goRequests() {
    setOpen(false)
    nav.navigate({
      department: 'production',
      productionArea: 'assembly',
      productionPage: 'requests',
      showProfile: false,
      showGlobalHome: false,
      closeSidebar: true
    })
  }

  function goProfile(tab: ProfileTab) {
    setOpen(false)
    nav.openProfile(tab)
  }

  const items = [
    counts.pendingMissions > 0 && {
      key: 'missions',
      label: t('notifications.missions', { n: counts.pendingMissions }),
      onClick: goMissions
    },
    counts.pendingRequests > 0 && {
      key: 'requests',
      label: t('notifications.requests', { n: counts.pendingRequests }),
      onClick: goRequests
    }
  ].filter(Boolean) as { key: string; label: string; onClick: () => void }[]

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
      >
        <Bell className="h-5 w-5" />
        {total > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/40">
          <div className="border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-black text-white">{t('notifications.title')}</p>
            <p className="text-xs text-slate-500">{t('notifications.subtitle')}</p>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">{t('notifications.empty')}</p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {items.map(item => (
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
          <div className="border-t border-slate-800 p-2">
            <button
              type="button"
              onClick={() => goProfile('account')}
              className="w-full rounded-lg px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-slate-900"
            >
              {t('notifications.openProfile')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
