export type MissionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export type MissionPriority = 'low' | 'normal' | 'high'

export const MISSION_STATUSES: MissionStatus[] = ['pending', 'in_progress', 'completed', 'cancelled']

export type MissionListFilter = MissionStatus | 'all' | 'overdue'

export const MISSION_PRIORITIES: MissionPriority[] = ['low', 'normal', 'high']

export type MissionRecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom'

export const MISSION_RECURRENCE_TYPES: MissionRecurrenceType[] = ['none', 'daily', 'weekly', 'monthly', 'custom']

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

  recurrenceType: MissionRecurrenceType

  recurrenceCustom: string | null

  recurrenceSeriesId: string | null

  completedAt: string | null

  notes: string | null

  responseCount: number

  createdByEmployeeId: string | null

  createdByName: string | null

  sourceVehicleId: string | null

  sourceMissingPartId: string | null

  sourceScratchId: string | null

  sourceVin: string | null

  sourceModelName: string | null

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

  recurrenceType?: MissionRecurrenceType

  recurrenceCustom?: string | null

  notes?: string

  sourceVehicleId?: string | null

  sourceMissingPartId?: string | null

  sourceScratchId?: string | null

  sourceVin?: string | null

  sourceModelName?: string | null
}

export type MissionLeaderboardRow = {
  employeeId: string

  employeeName: string

  employeeCode: string

  completedCount: number

  activeCount: number
}

export type TeamMissionResponseAttachment = {
  id: string
  filePath: string
  fileName: string
  mimeType: string
  url: string
}

export type ShortageMissionLink = {
  id: string
  title: string
  status: MissionStatus
  sourceVehicleId: string | null
  sourceMissingPartId: string | null
  sourceScratchId: string | null
  sourceVin: string | null
}

export type TeamMissionResponse = {
  id: string
  missionId: string
  authorEmployeeId: string | null
  authorName: string
  body: string
  createdAt: string
  attachments: TeamMissionResponseAttachment[]
}
