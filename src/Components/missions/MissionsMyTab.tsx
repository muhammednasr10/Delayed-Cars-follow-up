import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCcw } from 'lucide-react'
import { useAuth } from '../../Context/AuthContext'
import { useLang } from '../../i18n/LanguageContext'
import { Field, inputCls } from '../FormField'
import { getTeamMissions, updateMyTeamMissionStatus } from '../../services/missionService'
import { missionHasAssignee } from '../../Utils/missionPeople'
import type { MissionStatus, TeamMission } from '../../Types/mission'
import { MISSION_STATUSES } from '../../Types/mission'

const cell = 'table-cell text-center align-middle whitespace-nowrap px-3 py-2.5'

function isSchemaMissing(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('schema cache') || m.includes('could not find the table') || m.includes('does not exist')
}

type Props = {
  onChanged?: () => void
}

export function MissionsMyTab({ onChanged }: Props) {
  const { t, lang } = useLang()
  const { profile } = useAuth()
  const employeeId = profile?.employee_id ?? null

  const [items, setItems] = useState<TeamMission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [setupRequired, setSetupRequired] = useState(false)
  const [success, setSuccess] = useState('')
  const [statusFilter, setStatusFilter] = useState<MissionStatus | 'all'>('all')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await getTeamMissions())
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

  const myItems = useMemo(
    () => (employeeId ? items.filter(i => missionHasAssignee(i.assigneeIds, employeeId)) : []),
    [items, employeeId]
  )

  const filtered = useMemo(
    () => (statusFilter === 'all' ? myItems : myItems.filter(i => i.status === statusFilter)),
    [myItems, statusFilter]
  )

  const stats = useMemo(
    () => ({
      total: myItems.length,
      pending: myItems.filter(i => i.status === 'pending').length,
      inProgress: myItems.filter(i => i.status === 'in_progress').length,
      completed: myItems.filter(i => i.status === 'completed').length
    }),
    [myItems]
  )

  function notify(msg: string) {
    setSuccess(msg)
    window.setTimeout(() => setSuccess(''), 2500)
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—'
    const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium' })
  }

  function priorityBadge(priority: TeamMission['priority']) {
    const tones = {
      low: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
      normal: 'bg-cyan-500/15 text-cyan-200 border-cyan-500/30',
      high: 'bg-red-500/15 text-red-200 border-red-500/30'
    }
    return (
      <span className={`inline-block rounded-lg border px-2 py-0.5 text-xs font-bold ${tones[priority]}`}>
        {t(`missions.priority.${priority}`)}
      </span>
    )
  }

  async function changeStatus(row: TeamMission, status: MissionStatus) {
    if (row.status === status) return
    setSaving(true)
    setError('')
    try {
      await updateMyTeamMissionStatus(row.id, status)
      notify(t('settings.updated'))
      await load()
      onChanged?.()
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error')
      if (msg === 'NO_EMPLOYEE_LINK') setError(t('missions.my.noEmployeeLink'))
      else setError(msg)
    } finally {
      setSaving(false)
    }
  }

  if (!employeeId) {
    return (
      <div className="card-industrial p-6 text-center">
        <p className="text-sm font-bold text-amber-200">{t('missions.my.noEmployeeLink')}</p>
        <p className="mt-2 text-sm text-slate-400">{t('missions.my.noEmployeeHint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="card-industrial flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-400">{t('missions.my.hint')}</p>
          <p className="mt-1 text-sm font-bold text-amber-200">
            {profile?.employee_full_name ?? profile?.full_name ?? '—'}
            {profile?.employee_code ? (
              <span className="ms-2 font-mono text-xs text-slate-400" dir="ltr">
                {profile.employee_code}
              </span>
            ) : null}
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="rounded-xl bg-slate-800 px-3 py-2 text-slate-200 hover:bg-slate-700">
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatPill label={t('missions.stats.total')} value={String(stats.total)} />
        <StatPill label={t('missions.status.pending')} value={String(stats.pending)} tone="amber" />
        <StatPill label={t('missions.status.in_progress')} value={String(stats.inProgress)} tone="blue" />
        <StatPill label={t('missions.status.completed')} value={String(stats.completed)} tone="emerald" />
      </div>

      <div className="card-industrial p-4">
        <Field label={t('missions.filterStatus')}>
          <select className={inputCls()} value={statusFilter} onChange={e => setStatusFilter(e.target.value as MissionStatus | 'all')}>
            <option value="all">{t('common.all')}</option>
            {MISSION_STATUSES.map(key => (
              <option key={key} value={key}>
                {t(`missions.status.${key}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {setupRequired && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-bold">{t('missions.setupTitle')}</p>
          <p className="mt-1 text-amber-200/80">{t('missions.setupHint')}</p>
        </div>
      )}

      {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>}
      {error && !setupRequired && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      <div className="card-industrial overflow-x-auto">
        <table className="w-full text-center text-sm">
          <thead className="bg-slate-950/90">
            <tr>
              <th className={`${cell} font-black text-slate-400`}>{t('missions.cols.title')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('missions.cols.priority')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('missions.cols.dueDate')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('missions.cols.status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-slate-500">
                  {t('common.loading')}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-slate-500">
                  {t('missions.my.empty')}
                </td>
              </tr>
            ) : (
              filtered.map(row => (
                <tr key={row.id} className="bg-slate-900/30 hover:bg-slate-800/40">
                  <td className={`${cell} max-w-[16rem] text-start`}>
                    <p className="font-bold text-white">{row.title}</p>
                    {row.description && <p className="mt-0.5 text-xs text-slate-500">{row.description}</p>}
                    {row.notes && <p className="mt-1 text-xs text-slate-400">{row.notes}</p>}
                  </td>
                  <td className={cell}>{priorityBadge(row.priority)}</td>
                  <td className={`${cell} text-slate-300`}>{formatDate(row.dueDate)}</td>
                  <td className={cell}>
                    <select
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-bold text-slate-200"
                      value={row.status}
                      disabled={saving}
                      onChange={e => void changeStatus(row, e.target.value as MissionStatus)}
                    >
                      {MISSION_STATUSES.map(key => (
                        <option key={key} value={key}>
                          {t(`missions.status.${key}`)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatPill({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'amber' | 'blue' | 'emerald' }) {
  const tones = {
    slate: 'border-slate-600/50 bg-slate-800/50 text-slate-200',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
    blue: 'border-blue-500/30 bg-blue-500/10 text-blue-100',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
  }
  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  )
}
