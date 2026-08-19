import { useMemo, useState } from 'react'
import { RefreshCcw, Plus } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useEmployees } from '../../hooks/useEmployees'
import { useMyOrgScope } from '../../hooks/useMyOrgScope'
import { useOpenMissionShortage } from '../../hooks/useOpenMissionShortage'
import { useOpenedMissionSearch } from '../../hooks/useOpenedMissionSearch'
import { useMissionRespond } from '../../hooks/useMissionRespond'
import { useTeamMissions } from '../../hooks/useTeamMissions'
import { ConfirmDialog } from '../ConfirmDialog'
import { MissionFormModal } from './MissionFormModal'
import { MissionsFilterBar } from './MissionsFilterBar'
import { MissionListAlerts, MissionStatPills } from './MissionStatPills'
import { MissionListModals } from './MissionListModals'
import { MissionsBoardTable } from './MissionsBoardTable'
import {
  createTeamMission,
  deleteTeamMission,
  reassignTeamMission,
  updateTeamMission,
  updateTeamMissionStatus
} from '../../services/missionService'
import { missionVisibleToManager } from '../../Utils/missionPeople'
import { filterMissions } from '../../Utils/missionFilters'
import { filterActiveMissions, isOpenMissionStatus, missionListStats } from '../../Utils/missionDisplay'
import type { MissionPerson, MissionStatus, TeamMission, TeamMissionInput } from '../../Types/mission'

type Props = {
  onChanged?: () => void
  openedSearch?: string
  openedSearchKey?: number
}

export function MissionsBoardTab({ onChanged, openedSearch, openedSearchKey = 0 }: Props) {
  const { t, lang } = useLang()
  const { employees } = useEmployees()
  const { employeeId, canViewAllMissions, subordinateIds, assignableEmployees, canAssignMissions } =
    useMyOrgScope(employees)
  const list = useTeamMissions()
  const {
    items,
    loading,
    error,
    setError,
    setupRequired,
    success,
    saving,
    setSaving,
    detailTarget,
    setDetailTarget,
    detailRefresh,
    load,
    notify
  } = list
  const openShortage = useOpenMissionShortage(() => setDetailTarget(null))
  const { query, setQuery } = useOpenedMissionSearch(openedSearch, openedSearchKey)
  const { respondTarget, setRespondTarget, respondMission } = useMissionRespond(list, onChanged)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TeamMission | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TeamMission | null>(null)
  const [delegateTarget, setDelegateTarget] = useState<TeamMission | null>(null)

  const visibleItems = useMemo(() => {
    const active = filterActiveMissions(items)
    if (canViewAllMissions) return active
    if (!employeeId) return []
    return active.filter(i => missionVisibleToManager(i.assigneeIds, subordinateIds))
  }, [items, canViewAllMissions, employeeId, subordinateIds])

  const filtered = useMemo(() => filterMissions(visibleItems, query), [visibleItems, query])

  const assigneeOptions = useMemo(() => {
    const map = new Map<string, MissionPerson>()
    for (const item of visibleItems) {
      for (const person of item.assignees) {
        if (!map.has(person.id)) map.set(person.id, person)
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, lang === 'ar' ? 'ar' : 'en'))
  }, [visibleItems, lang])

  const stats = useMemo(() => missionListStats(visibleItems), [visibleItems])

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

  function canRespondMission(row: TeamMission): boolean {
    return canAssignMissions && isOpenMissionStatus(row.status)
  }

  function canReassignMission(row: TeamMission): boolean {
    return canAssignMissions && assignableEmployees.length > 0 && isOpenMissionStatus(row.status)
  }

  async function reassignMission(assigneeIds: string[]) {
    if (!delegateTarget) return
    setSaving(true)
    setError('')
    try {
      if (!assigneeIds.every(id => assignableEmployees.some(e => e.id === id))) {
        setError(t('missions.errAssigneeNotSubordinate'))
        throw new Error('ASSIGNEE_NOT_SUBORDINATE')
      }
      await reassignTeamMission(delegateTarget, assigneeIds)
      notify(t('missions.delegate.success'))
      setDelegateTarget(null)
      setDetailTarget(null)
      await load()
      onChanged?.()
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error')
      if (msg !== 'ASSIGNEE_NOT_SUBORDINATE') setError(msg)
      throw e
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card-industrial flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">{t('missions.boardHint')}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl bg-slate-800 px-3 py-2 text-slate-200 hover:bg-slate-700"
          >
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
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-400">
          {t('missions.boardNoSubordinates')}
        </div>
      )}

      {!employeeId && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          {t('missions.my.noEmployeeLink')}
        </div>
      )}

      <MissionStatPills stats={stats} />

      <MissionsFilterBar
        query={query}
        onChange={setQuery}
        assignees={assigneeOptions}
        shownCount={filtered.length}
        totalCount={visibleItems.length}
      />

      <MissionListAlerts setupRequired={setupRequired} success={success} error={error} />

      <MissionsBoardTable
        query={query}
        filtered={filtered}
        loading={loading}
        saving={saving}
        canAssignMissions={canAssignMissions}
        onOpenDetail={setDetailTarget}
        onChangeStatus={changeStatus}
        canRespond={canRespondMission}
        canReassign={canReassignMission}
        onRespond={setRespondTarget}
        onReassign={setDelegateTarget}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      <MissionListModals
        mission={detailTarget}
        onCloseDetail={() => setDetailTarget(null)}
        canDelegate={detailTarget ? canReassignMission(detailTarget) : false}
        onDelegate={
          detailTarget && canReassignMission(detailTarget) ? () => setDelegateTarget(detailTarget) : undefined
        }
        canRespond={detailTarget ? canRespondMission(detailTarget) : false}
        onRespond={
          detailTarget && canRespondMission(detailTarget) ? () => setRespondTarget(detailTarget) : undefined
        }
        onOpenShortage={openShortage}
        refreshKey={detailRefresh}
        respondTarget={respondTarget}
        saving={saving}
        onCloseRespond={() => setRespondTarget(null)}
        onSubmitRespond={respondMission}
        delegateTarget={delegateTarget}
        assignableEmployees={assignableEmployees}
        onCloseDelegate={() => setDelegateTarget(null)}
        onSubmitDelegate={reassignMission}
      />

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
