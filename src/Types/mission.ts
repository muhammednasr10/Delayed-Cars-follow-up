export type MissionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type MissionPriority = 'low' | 'normal' | 'high'

export const MISSION_STATUSES: MissionStatus[] = ['pending', 'in_progress', 'completed', 'cancelled']
export const MISSION_PRIORITIES: MissionPriority[] = ['low', 'normal', 'high']

export type MissionPerson = {
  id: string
  name: string
  code: string
}

export type TeamMission = {
  id: string
  title: string
  description: string | null
  assigneeId: string
  assigneeName: string
  assigneeCode: string
  assigneeIds: string[]
  assignees: MissionPerson[]
  status: MissionStatus
  priority: MissionPriority
  dueDate: string | null
  completedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type TeamMissionInput = {
  title: string
  description?: string
  assigneeIds: string[]
  status: MissionStatus
  priority: MissionPriority
  dueDate?: string | null
  notes?: string
}

export type MissionLeaderboardRow = {
  employeeId: string
  employeeName: string
  employeeCode: string
  completedCount: number
  activeCount: number
}

