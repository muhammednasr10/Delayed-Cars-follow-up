import type { MissingPartDetail } from './missingPart'
import type { ShortageMissionLink, TeamMissionInput } from './mission'

export type MpFollowUpAssignment = {
  completingDepartment: string
  followUpEmployeeId: string
  followUpEmployeeIds: string[]
}

export type ShortageMissionAssignInput = TeamMissionInput

export type ShortageMissionActionProps = {
  onAssignShortageMission?: (part: MissingPartDetail, input: ShortageMissionAssignInput) => void | Promise<void>
  assignMissionBusy?: boolean
  shortageMissions?: ShortageMissionLink[]
}

export type MpVehicleActionFlags = {
  canUpdateStatus: boolean
  canNotes: boolean
  canEdit: boolean
  canDelete: boolean
  canComplete: boolean
}

export type MpVehicleListActionProps = {
  onOpenNotes: (part: MissingPartDetail) => void
  onEdit: (part: MissingPartDetail) => void
  onUpdate: (part: MissingPartDetail) => void
  onDeleteParts: (parts: MissingPartDetail[]) => void
  onComplete: (part: MissingPartDetail) => void
  onCompleteAll?: (parts: MissingPartDetail[]) => void
  onAssignFollowUp?: (part: MissingPartDetail, assignment: MpFollowUpAssignment) => void
} & ShortageMissionActionProps
