import { getTeamMissions } from './missionService'
import { getTeamRequests } from './teamRequestService'
import { missionHasAssignee } from '../Utils/missionPeople'

export type AppNotificationCounts = {
  pendingMissions: number
  pendingRequests: number
}

export async function fetchAppNotificationCounts(
  employeeId: string | null,
  isAdmin: boolean
): Promise<AppNotificationCounts> {
  const out: AppNotificationCounts = { pendingMissions: 0, pendingRequests: 0 }
  if (!employeeId) return out

  try {
    const missions = await getTeamMissions()
    out.pendingMissions = missions.filter(
      m =>
        missionHasAssignee(m.assigneeIds, employeeId) &&
        (m.status === 'pending' || m.status === 'in_progress')
    ).length
  } catch {
    /* table may be missing */
  }

  try {
    const requests = await getTeamRequests()
    const inbox = isAdmin ? requests : requests.filter(r => r.managerIds.includes(employeeId))
    out.pendingRequests = inbox.filter(r => r.status === 'pending').length
  } catch {
    /* table may be missing */
  }

  return out
}
