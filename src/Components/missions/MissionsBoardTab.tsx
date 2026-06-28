import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useEmployees } from '../../hooks/useEmployees'
import { useMyOrgScope } from '../../hooks/useMyOrgScope'
import { ConfirmDialog } from '../ConfirmDialog'
import { Field, inputCls } from '../FormField'
import { MissionFormModal } from './MissionFormModal'
import { ExportableTable } from '../ExportableTable'
import {
  createTeamMission,
  deleteTeamMission,
  getTeamMissions,
  updateTeamMission,
  updateTeamMissionStatus
} from '../../services/missionService'
import { formatPeopleList, missionVisibleToManager } from '../../Utils/missionPeople'
import type { MissionStatus, TeamMission, TeamMissionInput } from '../../Types/mission'
import { MISSION_STATUSES } from '../../Types/mission'

const cell = 'table-cell text-center align-middle whitespace-nowrap px-3 py-2.5'

function isSchemaMissing(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('schema cache') || m.includes('could not find the table') || m.includes('does not exist')
}

type Props = {
  onChanged?: () => void
}

export function MissionsBoardTab({ onChanged }: Props) {
  const { t, lang } = useLang()
  const { employees } = useEmployees()
  const { employeeId, isAdmin, subordinateIds, assignableEmployees, canAssignMissions } = useMyOrgScope(employees)

  const [items, setItems] = useState<TeamMission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [setupRequired, setSetupRequired] = useState(false)
  const [success, setSuccess] = useState('')
  const [statusFilter, setStatusFilter] = useState<MissionStatus | 'all'>('all')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TeamMission | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TeamMission | null>(null)

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

  const visibleItems = useMemo(() => {
    if (isAdmin) return items
    if (!employeeId) return []
    return items.filter(i => missionVisibleToManager(i.assigneeIds, subordinateIds))
  }, [items, isAdmin, employeeId, subordinateIds])

  const filtered = useMemo(
    () => (statusFilter === 'all' ? visibleItems : visibleItems.filter(i => i.status === statusFilter)),
    [visibleItems, statusFilter]
  )

  const stats = useMemo(
    () => ({
      total: visibleItems.length,
      pending: visibleItems.filter(i => i.status === 'pending').length,
      inProgress: visibleItems.filter(i => i.status === 'in_progress').length,
      completed: visibleItems.filter(i => i.status === 'completed').length
    }),
    [visibleItems]
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

  function statusBadge(status: MissionStatus) {
    const tones: Record<MissionStatus, string> = {
      pending: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
      in_progress: 'bg-blue-500/15 text-blue-200 border-blue-500/30',
      completed: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
      cancelled: 'bg-slate-500/15 text-slate-400 border-slate-600/40'
    }
    return (
      <span className={`inline-block rounded-lg border px-2 py-0.5 text-xs font-bold ${tones[status]}`}>
        {t(`missions.status.${status}`)}
      </span>
    )
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(row: TeamMission) {
    setEditing(row)
    setFormOpen(true)
  }

  async function save(input: TeamMissionInput) {
    if (!input.assigneeIds.length || !input.assigneeIds.every(id => assignableEmployees.some(e => e.id === id))) {
      setError(t('missions.errAssigneeNotSubordinate'))
      return
    }
    setSaving(true)
    try {
      if (editing) await updateTeamMission(editing.id, input)
      else await createTeamMission(input)
      setFormOpen(false)
      notify(t(editing ? 'settings.updated' : 'settings.added'))
      await load()
      onChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(row: TeamMission, status: MissionStatus) {
    if (row.status === status) return
    setSaving(true)
    try {
      await updateTeamMissionStatus(row.id, status)
      notify(t('settings.updated'))
      await load()
      onChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await deleteTeamMission(deleteTarget.id)
      setDeleteTarget(null)
      notify(t('settings.deleted'))
      await load()
      onChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card-industrial flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">{t('missions.boardHint')}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void load()} className="rounded-xl bg-slate-800 px-3 py-2 text-slate-200 hover:bg-slate-700">
            <RefreshCcw className="h-4 w-4" />
          </button>
          {canAssignMissions && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-400"
            >
              <Plus className="h-4 w-4" />
              {t('missions.addMission')}
            </button>
          )}
        </div>
      </div>

      {!canAssignMissions && employeeId && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-400">{t('missions.boardNoSubordinates')}</div>
      )}

      {!employeeId && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">{t('missions.my.noEmployeeLink')}</div>
      )}

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

      <div className="card-industrial overflow-hidden">
        <ExportableTable filename="missions" title={t('missions.title')} rowCount={filtered.length}>
        <div className="overflow-x-auto">
        <table className="w-full text-center text-sm">
          <thead className="bg-slate-950/90">
            <tr>
              <th className={`${cell} font-black text-slate-400`}>{t('missions.cols.title')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('missions.cols.assignee')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('missions.cols.priority')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('missions.cols.dueDate')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('missions.cols.status')}</th>
              {canAssignMissions && <th data-export-skip className={`${cell} font-black text-slate-400`}>{t('common.actions')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={canAssignMissions ? 6 : 5} className="px-4 py-12 text-slate-500">
                  {t('common.loading')}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={canAssignMissions ? 6 : 5} className="px-4 py-12 text-slate-500">
                  {t('missions.empty')}
                </td>
              </tr>
            ) : (
              filtered.map(row => (
                <tr key={row.id} className="bg-slate-900/30 hover:bg-slate-800/40">
                  <td className={`${cell} max-w-[14rem] text-start`}>
                    <p className="font-bold text-white">{row.title}</p>
                    {row.description && <p className="mt-0.5 truncate text-xs text-slate-500">{row.description}</p>}
                  </td>
                  <td className={cell}>
                    {row.assignees.length > 1 ? (
                      <div className="space-y-0.5">
                        {row.assignees.map(a => (
                          <p key={a.id} className="font-bold text-slate-200">
                            {a.name}
                            <span className="ms-1 font-mono text-[10px] text-slate-500" dir="ltr">
                              {a.code}
                            </span>
                          </p>
                        ))}
                      </div>
                    ) : (
                      <>
                        <p className="font-bold text-slate-200">{row.assigneeName}</p>
                        <p className="text-xs text-slate-500">{row.assigneeCode}</p>
                      </>
                    )}
                  </td>
                  <td className={cell}>{priorityBadge(row.priority)}</td>
                  <td className={`${cell} text-slate-300`}>{formatDate(row.dueDate)}</td>
                  <td className={cell}>
                    {canAssignMissions ? (
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
                    ) : (
                      statusBadge(row.status)
                    )}
                  </td>
                  {canAssignMissions && (
                    <td data-export-skip className={cell}>
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={() => openEdit(row)} className="rounded-lg bg-slate-800 p-2 text-cyan-300 hover:bg-slate-700">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(row)} className="rounded-lg bg-slate-800 p-2 text-red-300 hover:bg-slate-700">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
        </ExportableTable>
      </div>

      <MissionFormModal
        open={formOpen}
        employees={assignableEmployees}
        editing={editing}
        onClose={() => setFormOpen(false)}
        onSave={save}
        saving={saving}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('missions.deleteTitle')}
        message={t('missions.deleteConfirm', { title: deleteTarget?.title ?? '' })}
        confirmLabel={t('common.delete')}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
        busy={saving}
      />
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
