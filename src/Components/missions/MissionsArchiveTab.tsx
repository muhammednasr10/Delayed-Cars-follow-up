import { useMemo, useState } from 'react'
import { RefreshCcw } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useEmployees } from '../../hooks/useEmployees'
import { useMyOrgScope } from '../../hooks/useMyOrgScope'
import { useOpenMissionShortage } from '../../hooks/useOpenMissionShortage'
import { useOpenedMissionSearch } from '../../hooks/useOpenedMissionSearch'
import { useTeamMissions } from '../../hooks/useTeamMissions'
import { ConfirmDialog } from '../ConfirmDialog'
import { MissionFormModal } from './MissionFormModal'
import { MissionsFilterBar } from './MissionsFilterBar'
import { MissionListAlerts } from './MissionStatPills'
import { MissionListModals } from './MissionListModals'
import { MissionsBoardTable } from './MissionsBoardTable'
import {
  deleteTeamMission,
  updateTeamMission,
  updateTeamMissionStatus
} from '../../services/missionService'
import { missionHasAssignee, missionVisibleToManager } from '../../Utils/missionPeople'
import { filterMissions } from '../../Utils/missionFilters'
import { filterArchivedMissions } from '../../Utils/missionDisplay'
import type { MissionPerson, MissionStatus, TeamMission, TeamMissionInput } from '../../Types/mission'

type Props = {
  onChanged?: () => void
  openedSearch?: string
  openedSearchKey?: number
}

export function MissionsArchiveTab({ onChanged, openedSearch, openedSearchKey = 0 }: Props) {
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

  const [editing, setEditing] = useState<TeamMission | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TeamMission | null>(null)

  const visibleItems = useMemo(() => {
    const archived = filterArchivedMissions(items)
    if (canViewAllMissions) return archived
    if (!employeeId) return []
    return archived.filter(
      i => missionHasAssignee(i.assigneeIds, employeeId) || missionVisibleToManager(i.assigneeIds, subordinateIds)
    )
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

  const cancelledCount = visibleItems.filter(i => i.status === 'cancelled').length
  const completedCount = visibleItems.filter(i => i.status === 'completed').length

  async function save(input: TeamMissionInput) {
    if (!editing) return
    setSaving(true)
    try {
      await updateTeamMission(editing.id, input)
      setFormOpen(false)
      notify(t('settings.updated'))
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
        <div>
          <p className="text-sm text-slate-400">{t('missions.archive.hint')}</p>
          <p className="mt-1 text-xs text-slate-500">
            {t('missions.archive.summary', { completed: completedCount, cancelled: cancelledCount })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl bg-slate-800 px-3 py-2 text-slate-200 hover:bg-slate-700"
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      {!employeeId && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          {t('missions.my.noEmployeeLink')}
        </div>
      )}

      <MissionsFilterBar
        query={query}
        onChange={setQuery}
        assignees={assigneeOptions}
        shownCount={filtered.length}
        totalCount={visibleItems.length}
        archiveMode
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
        canRespond={() => false}
        canReassign={() => false}
        onRespond={() => undefined}
        onReassign={() => undefined}
        onEdit={row => {
          setEditing(row)
          setFormOpen(true)
        }}
        onDelete={setDeleteTarget}
        emptyKey="missions.archive.empty"
      />

      <MissionListModals
        mission={detailTarget}
        onCloseDetail={() => setDetailTarget(null)}
        canDelegate={false}
        canRespond={false}
        onOpenShortage={openShortage}
        refreshKey={detailRefresh}
        respondTarget={null}
        saving={saving}
        onCloseRespond={() => undefined}
        onSubmitRespond={async () => undefined}
        delegateTarget={null}
        assignableEmployees={assignableEmployees}
        onCloseDelegate={() => undefined}
        onSubmitDelegate={async () => undefined}
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
