import type { QualityNote8D, QualityNoteStatus } from './qualityNote'

export type InternalQualityIssue = {
  id: string
  problemType: string
  problem: string
  reportingWorkshop: string
  vehicleModelIds: string[]
  firstReportedAt: string
  status: QualityNoteStatus
  studyNotes: string
  study8d: QualityNote8D
  studyCount: number
  lastStudyAt: string | null
  createdAt: string
  updatedAt: string
}

export type InternalQualityIssueInput = {
  problemType: string
  problem: string
  reportingWorkshop: string
  vehicleModelIds: string[]
  firstReportedAt: string
}

export type InternalQualityStudyPatch = {
  status: QualityNoteStatus
  studyNotes: string
  study8d: QualityNote8D
  studyCount: number
  lastStudyAt: string | null
}
