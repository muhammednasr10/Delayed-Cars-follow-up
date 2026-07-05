import { useCallback, useEffect, useMemo, useState } from 'react'
import { History, RefreshCcw } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import {
  getPermissionAuditEvents,
  type PermissionAuditEvent
} from '../../services/securityAuditService'
import { permissionActionLabel, permissionModuleLabel } from '../../Utils/permissionLabels'
import type { SystemRole, UserAccountDetail } from '../../Types/permissions'

type Props = {
  users: UserAccountDetail[]
  roles: SystemRole[]
  notify: (msg: string, err?: boolean) => void
}

function detailFromValues(
  values: Record<string, unknown> | null,
  t: (key: string, vars?: Record<string, string | number>) => string
): string {
  if (!values) return '—'
  const moduleKey = typeof values.module_key === 'string' ? values.module_key : null
  const permissionKey = typeof values.permission_key === 'string' ? values.permission_key : null
  const allowed = values.allowed
  const parts: string[] = []
  if (moduleKey && permissionKey) {
    parts.push(`${permissionModuleLabel(moduleKey, t)} — ${permissionActionLabel(permissionKey, t)}`)
  } else if (moduleKey) {
    parts.push(permissionModuleLabel(moduleKey, t))
  }
  if (typeof allowed === 'boolean') {
    parts.push(allowed ? t('permissions.allow') : t('permissions.matrix.denied'))
  }
  if (typeof values.system_role_id === 'string') {
    parts.push(`${t('permissions.systemRole')}: ${values.system_role_id.slice(0, 8)}…`)
  }
  return parts.length > 0 ? parts.join(' · ') : '—'
}

export function PermissionsAuditTab({ users, roles, notify }: Props) {
  const { t, lang } = useLang()
  const [items, setItems] = useState<PermissionAuditEvent[]>([])
  const [loading, setLoading] = useState(true)

  const userById = useMemo(() => new Map(users.map(u => [u.id, u])), [users])
  const roleById = useMemo(() => new Map(roles.map(r => [r.id, r])), [roles])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await getPermissionAuditEvents(200))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [notify, t])

  useEffect(() => {
    void load()
  }, [load])

  function formatWhen(iso: string) {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }

  function actionLabel(action: string) {
    const key = `permissions.audit.actions.${action}`
    const label = t(key)
    return label === key ? action : label
  }

  function targetLabel(event: PermissionAuditEvent) {
    if (!event.entityId) return '—'
    if (event.entityType === 'user_permission_overrides' || event.entityType === 'profiles') {
      const u = userById.get(event.entityId)
      return u ? u.full_name || u.email || event.entityId.slice(0, 8) : event.entityId.slice(0, 8) + '…'
    }
    if (event.entityType === 'role_permissions' || event.entityType === 'system_roles') {
      const r = roleById.get(event.entityId)
      return r ? r.role_name_ar : event.entityId.slice(0, 8) + '…'
    }
    return event.entityId.slice(0, 8) + '…'
  }

  function detailLabel(event: PermissionAuditEvent) {
    const values = event.newValues ?? event.oldValues
    return detailFromValues(values, t)
  }

  return (
    <div className="space-y-4">
      <div className="card-industrial flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{t('permissions.audit.title')}</h3>
            <p className="mt-1 text-sm text-slate-400">{t('permissions.audit.hint')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </button>
      </div>

      <div className="card-industrial overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-500">
                <th className="table-cell px-3 py-2.5 text-start">{t('permissions.audit.when')}</th>
                <th className="table-cell px-3 py-2.5 text-start">{t('permissions.audit.actor')}</th>
                <th className="table-cell px-3 py-2.5 text-start">{t('permissions.audit.action')}</th>
                <th className="table-cell px-3 py-2.5 text-start">{t('permissions.audit.target')}</th>
                <th className="table-cell px-3 py-2.5 text-start">{t('permissions.audit.detail')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    {t('permissions.audit.empty')}
                  </td>
                </tr>
              ) : (
                items.map(event => (
                  <tr key={event.id} className="border-b border-slate-800/80 hover:bg-slate-900/40">
                    <td className="table-cell whitespace-nowrap px-3 py-2.5 text-slate-300">
                      {formatWhen(event.createdAt)}
                    </td>
                    <td className="table-cell px-3 py-2.5">
                      <p className="font-bold text-white">{event.actorName || event.actorEmail || '—'}</p>
                      {event.actorEmail && event.actorName && (
                        <p className="text-[11px] text-slate-500" dir="ltr">
                          {event.actorEmail}
                        </p>
                      )}
                    </td>
                    <td className="table-cell px-3 py-2.5 font-bold text-violet-200">
                      {actionLabel(event.action)}
                    </td>
                    <td className="table-cell px-3 py-2.5 text-slate-200">{targetLabel(event)}</td>
                    <td className="table-cell max-w-[20rem] px-3 py-2.5 text-slate-400">{detailLabel(event)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
