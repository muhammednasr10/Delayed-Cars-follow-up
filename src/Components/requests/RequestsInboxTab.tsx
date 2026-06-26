import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ListTodo, RefreshCcw, X } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useEmployees } from '../../hooks/useEmployees'
import { useMyOrgScope } from '../../hooks/useMyOrgScope'
import { Field, inputCls } from '../FormField'
import { ConvertRequestModal } from './ConvertRequestModal'
import { convertTeamRequestToMission, getTeamRequests, respondTeamRequest } from '../../services/teamRequestService'
import { formatPeopleList } from '../../Utils/missionPeople'
import type { TeamRequest } from '../../Types/teamRequest'

function isSchemaMissing(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('schema cache') || m.includes('could not find the table') || m.includes('does not exist')
}

type Props = {
  onChanged?: () => void
}

export function RequestsInboxTab({ onChanged }: Props) {
  const { t, lang } = useLang()
  const { employees } = useEmployees()
  const { employeeId, isAdmin, assignableEmployees, canAssignMissions } = useMyOrgScope(employees)

  const [items, setItems] = useState<TeamRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [setupRequired, setSetupRequired] = useState(false)
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState<TeamRequest['status'] | 'all'>('pending')
  const [responseNotes, setResponseNotes] = useState<Record<string, string>>({})
  const [convertTarget, setConvertTarget] = useState<TeamRequest | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await getTeamRequests())
      setSetupRequired(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error')
      setSetupRequired(isSchemaMissing(msg))
      setError(msg)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const inboxItems = useMemo(() => {
    if (isAdmin) return items
    if (!employeeId) return []
    return items.filter(i => i.managerIds.includes(employeeId))
  }, [items, employeeId, isAdmin])

  const filtered = useMemo(
    () => (statusFilter === 'all' ? inboxItems : inboxItems.filter(i => i.status === statusFilter)),
    [inboxItems, statusFilter]
  )

  const pendingCount = inboxItems.filter(i => i.status === 'pending').length

  function formatDate(iso: string) {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium' })
  }

  function notify(msg: string) {
    setSuccess(msg)
    window.setTimeout(() => setSuccess(''), 2500)
  }

  async function accept(row: TeamRequest) {
    setSaving(true)
    try {
      await respondTeamRequest(row.id, 'accepted', responseNotes[row.id])
      notify(t('requests.accepted'))
      await load()
      onChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function reject(row: TeamRequest) {
    setSaving(true)
    try {
      await respondTeamRequest(row.id, 'rejected', responseNotes[row.id])
      notify(t('requests.rejected'))
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function handleConvert(assigneeIds: string[], priority: 'low' | 'normal' | 'high', dueDate: string | null, notes: string | null) {
    if (!convertTarget) return
    setSaving(true)
    try {
      await convertTeamRequestToMission(convertTarget.id, assigneeIds, { priority, dueDate, notes })
      setConvertTarget(null)
      notify(t('requests.converted'))
      await load()
      onChanged?.()
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error')
      if (msg === 'ASSIGNEE_NOT_SUBORDINATE') setError(t('missions.errAssigneeNotSubordinate'))
      else setError(msg)
    } finally {
      setSaving(false)
    }
  }

  if (!employeeId && !isAdmin) {
    return (
      <div className="card-industrial p-6 text-center">
        <p className="text-sm font-bold text-amber-200">{t('missions.my.noEmployeeLink')}</p>
      </div>
    )
  }

  if (!canAssignMissions && !isAdmin) {
    return (
      <div className="card-industrial p-6 text-center text-sm text-slate-400">{t('requests.inboxManagersOnly')}</div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="card-industrial flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-400">{t('requests.inboxHint')}</p>
          {pendingCount > 0 && (
            <p className="mt-1 text-sm font-bold text-amber-300">{t('requests.pendingCount', { n: pendingCount })}</p>
          )}
        </div>
        <button type="button" onClick={() => void load()} className="rounded-xl bg-slate-800 px-3 py-2 text-slate-200 hover:bg-slate-700">
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="card-industrial p-4">
        <Field label={t('missions.filterStatus')}>
          <select className={inputCls()} value={statusFilter} onChange={e => setStatusFilter(e.target.value as TeamRequest['status'] | 'all')}>
            <option value="all">{t('common.all')}</option>
            <option value="pending">{t('requests.status.pending')}</option>
            <option value="accepted">{t('requests.status.accepted')}</option>
            <option value="rejected">{t('requests.status.rejected')}</option>
            <option value="converted">{t('requests.status.converted')}</option>
          </select>
        </Field>
      </div>

      {setupRequired && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-bold">{t('requests.setupTitle')}</p>
          <p className="mt-1">{t('requests.setupHint')}</p>
        </div>
      )}

      {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>}
      {error && !setupRequired && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      <div className="space-y-3">
        {loading ? (
          <div className="card-industrial px-4 py-12 text-center text-slate-500">{t('common.loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="card-industrial px-4 py-12 text-center text-slate-500">{t('requests.inboxEmpty')}</div>
        ) : (
          filtered.map(row => (
            <div key={row.id} className="card-industrial p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-black text-white">{row.title}</p>
                  {row.description && <p className="mt-1 text-sm text-slate-400">{row.description}</p>}
                  <p className="mt-2 text-xs text-slate-500">
                    {t('requests.from')}: <span className="font-bold text-slate-300">{row.requesterName}</span>
                    {row.managers.length > 1 && (
                      <span className="ms-2">
                        · {t('requests.cols.managers')}: {formatPeopleList(row.managers)}
                      </span>
                    )}
                    {' · '}
                    {formatDate(row.createdAt)}
                  </p>
                  {row.status !== 'pending' && row.managerResponse && (
                    <p className="mt-2 text-xs text-slate-400">
                      {t('requests.cols.response')}: {row.managerResponse}
                    </p>
                  )}
                </div>
                <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-xs font-bold ${
                  row.status === 'pending'
                    ? 'border-amber-500/30 bg-amber-500/15 text-amber-200'
                    : row.status === 'accepted'
                      ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200'
                      : row.status === 'rejected'
                        ? 'border-red-500/30 bg-red-500/15 text-red-200'
                        : 'border-violet-500/30 bg-violet-500/15 text-violet-200'
                }`}>
                  {t(`requests.status.${row.status}`)}
                </span>
              </div>

              {row.status === 'pending' && (
                <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
                  <input
                    className={inputCls()}
                    placeholder={t('requests.responsePh')}
                    value={responseNotes[row.id] ?? ''}
                    onChange={e => setResponseNotes(prev => ({ ...prev, [row.id]: e.target.value }))}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void accept(row)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-500 disabled:opacity-60"
                    >
                      <Check className="h-4 w-4" />
                      {t('requests.accept')}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void reject(row)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-red-600/80 px-3 py-2 text-xs font-black text-white hover:bg-red-500 disabled:opacity-60"
                    >
                      <X className="h-4 w-4" />
                      {t('requests.reject')}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setConvertTarget(row)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-slate-950 hover:bg-amber-400 disabled:opacity-60"
                    >
                      <ListTodo className="h-4 w-4" />
                      {t('requests.convertAction')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <ConvertRequestModal
        open={!!convertTarget}
        request={convertTarget}
        assignableEmployees={assignableEmployees}
        onClose={() => setConvertTarget(null)}
        onConvert={handleConvert}
        saving={saving}
      />
    </div>
  )
}
