import { useCallback, useEffect, useState } from 'react'
import { Circle, RefreshCw, Users } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import {
  PRESENCE_ONLINE_MINUTES,
  formatLastSeen,
  getActiveUserSessions,
  type ActiveUserSession
} from '../../services/presenceService'

const REFRESH_MS = 30_000

type Props = {
  notify: (m: string, err?: boolean) => void
}

export function ActiveUsersTab({ notify }: Props) {
  const { t, lang } = useLang()
  const [rows, setRows] = useState<ActiveUserSession[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await getActiveUserSessions())
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setLoading(false)
    }
  }, [notify, t])

  useEffect(() => {
    void load()
    const id = window.setInterval(() => void load(), REFRESH_MS)
    return () => window.clearInterval(id)
  }, [load])

  return (
    <div className="space-y-4">
      <div className="card-industrial flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/15 p-2.5 text-emerald-300">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{t('permissions.activeUsers.title')}</h3>
            <p className="text-sm text-slate-400">{t('permissions.activeUsers.subtitle', { minutes: PRESENCE_ONLINE_MINUTES })}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </button>
      </div>

      <div className="card-industrial overflow-hidden">
        {loading && rows.length === 0 ? (
          <p className="p-8 text-center text-slate-500">{t('common.loading')}</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-slate-500">{t('permissions.activeUsers.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-500">
                  <th className="table-cell">{t('permissions.status')}</th>
                  <th className="table-cell">{t('permissions.userEmail')}</th>
                  <th className="table-cell">{t('permissions.linkedEmployee')}</th>
                  <th className="table-cell">{t('permissions.systemRole')}</th>
                  <th className="table-cell">{t('permissions.activeUsers.lastSeen')}</th>
                  <th className="table-cell">{t('permissions.activeUsers.currentPage')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(u => (
                  <tr key={u.id} className="border-b border-slate-800/80">
                    <td className="table-cell">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                        <Circle className="h-2.5 w-2.5 fill-emerald-400 text-emerald-400" />
                        {t('permissions.activeUsers.online')}
                      </span>
                    </td>
                    <td className="table-cell font-medium text-white">{u.email ?? '—'}</td>
                    <td className="table-cell">
                      {u.employee_full_name ? `${u.employee_code} — ${u.employee_full_name}` : '—'}
                    </td>
                    <td className="table-cell">{u.system_role_name_ar || '—'}</td>
                    <td className="table-cell text-slate-300">{formatLastSeen(u.last_seen_at, lang)}</td>
                    <td className="table-cell font-mono text-xs text-slate-400" dir="ltr">
                      {u.last_seen_path || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500">
        {t('permissions.activeUsers.count', { n: rows.length })}
      </p>
    </div>
  )
}
