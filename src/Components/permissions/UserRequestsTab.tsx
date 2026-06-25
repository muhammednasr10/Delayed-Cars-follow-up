import { useEffect, useState } from 'react'
import { CheckCircle2, KeyRound, Loader2, MessageSquare } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import type { UserAccountDetail } from '../../Types/permissions'
import type { UserRequestStatus, UserSupportRequest } from '../../Types/userRequest'
import { getUserSupportRequests, updateUserSupportRequest } from '../../services/userRequestsService'
import { Field, inputCls } from '../FormField'
import { UserPasswordModal } from './UserPasswordModal'

type Filter = 'open' | UserRequestStatus | 'all'

type Props = {
  users: UserAccountDetail[]
  notify: (m: string, err?: boolean) => void
  onChanged?: () => void
}

export function UserRequestsTab({ users, notify, onChanged }: Props) {
  const { t } = useLang()
  const [filter, setFilter] = useState<Filter>('open')
  const [rows, setRows] = useState<UserSupportRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({})
  const [passwordUser, setPasswordUser] = useState<UserAccountDetail | null>(null)

  async function reload() {
    setLoading(true)
    try {
      const data = await getUserSupportRequests(filter === 'all' ? undefined : filter)
      setRows(data)
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [filter])

  function findUserByEmail(email: string): UserAccountDetail | undefined {
    return users.find(u => u.email?.toLowerCase() === email.toLowerCase())
  }

  async function setStatus(id: string, status: UserRequestStatus) {
    setBusyId(id)
    try {
      await updateUserSupportRequest(id, {
        status,
        adminNotes: notesDraft[id]?.trim() || undefined
      })
      notify(t('userRequests.statusUpdated'))
      await reload()
      onChanged?.()
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusyId(null)
    }
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'open', label: t('userRequests.filterOpen') },
    { key: 'pending', label: t('userRequests.status.pending') },
    { key: 'in_progress', label: t('userRequests.status.in_progress') },
    { key: 'resolved', label: t('userRequests.status.resolved') },
    { key: 'rejected', label: t('userRequests.status.rejected') },
    { key: 'all', label: t('common.all') }
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
              filter === f.key ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('common.loading')}
        </p>
      ) : rows.length === 0 ? (
        <div className="card-industrial p-8 text-center text-slate-500">
          <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-40" />
          {t('userRequests.empty')}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(row => {
            const linked = findUserByEmail(row.email)
            const busy = busyId === row.id
            const statusCls =
              row.status === 'pending'
                ? 'bg-amber-500/20 text-amber-200'
                : row.status === 'in_progress'
                  ? 'bg-cyan-500/20 text-cyan-200'
                  : row.status === 'resolved'
                    ? 'bg-emerald-500/20 text-emerald-200'
                    : 'bg-red-500/20 text-red-200'

            return (
              <article key={row.id} className="card-industrial space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${statusCls}`}>
                        {t(`userRequests.status.${row.status}`)}
                      </span>
                      <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                        {t(`userRequests.types.${row.request_type}`)}
                      </span>
                    </div>
                    <p className="mt-2 font-bold text-white" dir="ltr">
                      {row.email}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(row.created_at).toLocaleString()}
                      {row.requester_name || row.requester_profile_name
                        ? ` · ${row.requester_name || row.requester_profile_name}`
                        : ''}
                      {row.employee_code ? ` · ${row.employee_code} — ${row.employee_full_name}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {row.request_type === 'password_reset' && linked && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setPasswordUser(linked)}
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-2 py-1 text-xs font-bold text-amber-200 hover:bg-amber-500/25"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        {t('permissions.managePassword')}
                      </button>
                    )}
                    {row.status === 'pending' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void setStatus(row.id, 'in_progress')}
                        className="rounded-lg bg-cyan-500/15 px-2 py-1 text-xs font-bold text-cyan-200"
                      >
                        {t('userRequests.markInProgress')}
                      </button>
                    )}
                    {row.status !== 'resolved' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void setStatus(row.id, 'resolved')}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-200"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t('userRequests.markResolved')}
                      </button>
                    )}
                    {row.status !== 'rejected' && row.status !== 'resolved' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void setStatus(row.id, 'rejected')}
                        className="rounded-lg bg-red-500/15 px-2 py-1 text-xs font-bold text-red-300"
                      >
                        {t('userRequests.markRejected')}
                      </button>
                    )}
                  </div>
                </div>

                <p className="whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-200">
                  {row.message}
                </p>

                {row.admin_notes && (
                  <p className="text-xs text-slate-500">
                    {t('userRequests.adminNotes')}: {row.admin_notes}
                    {row.handled_by_name ? ` — ${row.handled_by_name}` : ''}
                  </p>
                )}

                <Field label={t('userRequests.adminNotes')}>
                  <textarea
                    className={`${inputCls()} min-h-16`}
                    value={notesDraft[row.id] ?? row.admin_notes ?? ''}
                    onChange={e => setNotesDraft(prev => ({ ...prev, [row.id]: e.target.value }))}
                    placeholder={t('userRequests.adminNotesPlaceholder')}
                  />
                </Field>
              </article>
            )
          })}
        </div>
      )}

      <UserPasswordModal
        open={Boolean(passwordUser)}
        user={passwordUser}
        onClose={() => setPasswordUser(null)}
        onSaved={() => notify(t('permissions.passwordResetSuccess'))}
      />
    </div>
  )
}
