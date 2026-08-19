import { useMemo, useState } from 'react'
import { RefreshCcw } from 'lucide-react'
import { useAuth } from '../../Context/AuthContext'
import { useLang } from '../../i18n/LanguageContext'
import { useEmployees } from '../../hooks/useEmployees'
import { useMyOrgScope } from '../../hooks/useMyOrgScope'
import { useOpenMissionShortage } from '../../hooks/useOpenMissionShortage'
import { useOpenedMissionSearch } from '../../hooks/useOpenedMissionSearch'
import { useMissionRespond } from '../../hooks/useMissionRespond'
import { useTeamMissions } from '../../hooks/useTeamMissions'
import { MissionsFilterBar } from './MissionsFilterBar'
import { MissionListAlerts, MissionStatPills } from './MissionStatPills'
import { MissionListModals } from './MissionListModals'
import { MissionsMyTable } from './MissionsMyTable'
import { delegateMyTeamMission, updateMyTeamMissionStatus } from '../../services/missionService'
import { missionHasAssignee } from '../../Utils/missionPeople'
import { filterMissions } from '../../Utils/missionFilters'
import {
  isOpenMissionStatus,
  mapMissionActionError,
  mapMissionDelegateError,
  missionListStats
} from '../../Utils/missionDisplay'
import type { MissionStatus, TeamMission } from '../../Types/mission'

type Props = {
  onChanged?: () => void
  openedSearch?: string
  openedSearchKey?: number
}

export function MissionsMyTab({ onChanged, openedSearch, openedSearchKey = 0 }: Props) {
  const { t } = useLang()
  const { profile } = useAuth()
  const { employees } = useEmployees()
  const { assignableEmployees, canAssignMissions } = useMyOrgScope(employees)
  const employeeId = profile?.employee_id ?? null
  const assignableEmployeesNoSelf = useMemo(
    () => (employeeId ? assignableEmployees.filter(e => e.id !== employeeId) : assignableEmployees),
    [assignableEmployees, employeeId]
  )
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
  const [delegateTarget, setDelegateTarget] = useState<TeamMission | null>(null)

  const myItems = useMemo(
    () => (employeeId ? items.filter(i => missionHasAssignee(i.assigneeIds, employeeId)) : []),
    [items, employeeId]
  )

  const filtered = useMemo(() => filterMissions(myItems, query), [myItems, query])
  const stats = useMemo(() => missionListStats(myItems), [myItems])

  function canDelegateMission(row: TeamMission): boolean {
    if (!employeeId || !canAssignMissions || assignableEmployeesNoSelf.length === 0) return false
    if (!missionHasAssignee(row.assigneeIds, employeeId)) return false
    return isOpenMissionStatus(row.status)
  }

  function canRespondMission(row: TeamMission): boolean {
    if (!employeeId || !missionHasAssignee(row.assigneeIds, employeeId)) return false
    return isOpenMissionStatus(row.status)
  }

  async function delegateMission(assigneeIds: string[]) {
    if (!delegateTarget) return
    setSaving(true)
    setError('')
    try {
      await delegateMyTeamMission(delegateTarget.id, assigneeIds)
      notify(t('missions.delegate.success'))
      setDelegateTarget(null)
      setDetailTarget(null)
      await load()
      onChanged?.()
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error')
      setError(mapMissionDelegateError(msg, t))
      throw e
    } finally {
      setSaving(false)
    }
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
      setError(mapMissionActionError(msg, t))
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

  const showDelegateActions = canAssignMissions && assignableEmployeesNoSelf.length > 0

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
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl bg-slate-800 px-3 py-2 text-slate-200 hover:bg-slate-700"
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      <MissionStatPills stats={stats} />

      <MissionsFilterBar
        query={query}
        onChange={setQuery}
        shownCount={filtered.length}
        totalCount={myItems.length}
      />

      <MissionListAlerts setupRequired={setupRequired} success={success} error={error} />

      <MissionsMyTable
        query={query}
        filtered={filtered}
        loading={loading}
        saving={saving}
        onOpenDetail={setDetailTarget}
        onChangeStatus={changeStatus}
        canRespond={canRespondMission}
        canDelegate={row => showDelegateActions && canDelegateMission(row)}
        onRespond={setRespondTarget}
        onDelegate={setDelegateTarget}
      />

      <MissionListModals
        mission={detailTarget}
        onCloseDetail={() => setDetailTarget(null)}
        canDelegate={detailTarget ? canDelegateMission(detailTarget) : false}
        onDelegate={detailTarget && showDelegateActions ? () => setDelegateTarget(detailTarget) : undefined}
        canRespond={detailTarget ? canRespondMission(detailTarget) : false}
        onRespond={detailTarget && canRespondMission(detailTarget) ? () => setRespondTarget(detailTarget) : undefined}
        onOpenShortage={openShortage}
        refreshKey={detailRefresh}
        respondTarget={respondTarget}
        saving={saving}
        onCloseRespond={() => setRespondTarget(null)}
        onSubmitRespond={respondMission}
        delegateTarget={delegateTarget}
        assignableEmployees={assignableEmployeesNoSelf}
        onCloseDelegate={() => setDelegateTarget(null)}
        onSubmitDelegate={delegateMission}
      />
    </div>
  )
}
