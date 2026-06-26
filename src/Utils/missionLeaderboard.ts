import type { Employee } from '../Types/employee'
import type { MissionLeaderboardRow, TeamMission } from '../Types/mission'

export function missionInCompletedMonth(mission: TeamMission, year: number, month: number): boolean {
  if (mission.status !== 'completed' || !mission.completedAt) return false
  const d = new Date(mission.completedAt)
  return d.getFullYear() === year && d.getMonth() + 1 === month
}

export function computeMissionLeaderboard(
  missions: TeamMission[],
  employees: Employee[],
  year: number,
  month: number
): MissionLeaderboardRow[] {
  const completedByEmployee = new Map<string, number>()
  const activeByEmployee = new Map<string, number>()

  for (const m of missions) {
    const ids = m.assigneeIds.length > 0 ? m.assigneeIds : [m.assigneeId]
    if (m.status === 'completed') {
      if (missionInCompletedMonth(m, year, month)) {
        for (const id of ids) {
          completedByEmployee.set(id, (completedByEmployee.get(id) ?? 0) + 1)
        }
      }
    } else if (m.status === 'pending' || m.status === 'in_progress') {
      for (const id of ids) {
        activeByEmployee.set(id, (activeByEmployee.get(id) ?? 0) + 1)
      }
    }
  }

  const rows: MissionLeaderboardRow[] = employees
    .filter(e => e.isActive)
    .map(e => ({
      employeeId: e.id,
      employeeName: e.fullName,
      employeeCode: e.employeeCode,
      completedCount: completedByEmployee.get(e.id) ?? 0,
      activeCount: activeByEmployee.get(e.id) ?? 0
    }))

  return rows
    .filter(r => r.completedCount > 0 || r.activeCount > 0)
    .sort((a, b) => b.completedCount - a.completedCount || a.employeeName.localeCompare(b.employeeName, 'ar'))
}
