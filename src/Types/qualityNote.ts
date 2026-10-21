export type QualityNoteSeverity = 'recurring' | 'critical'

export type QualityNoteRepairTime = 'little' | 'medium' | 'much'

export type QualityNoteStatus = 'open' | 'under_study' | 'closed'

/** Classic 8D problem-solving steps (D1–D8). */
export type QualityNote8D = {
  d1Team: string
  d2Problem: string
  d3Containment: string
  d4RootCause: string
  d5Corrective: string
  d6Implement: string
  d7Prevent: string
  d8Congratulate: string
}

export const EMPTY_QUALITY_NOTE_8D: QualityNote8D = {
  d1Team: '',
  d2Problem: '',
  d3Containment: '',
  d4RootCause: '',
  d5Corrective: '',
  d6Implement: '',
  d7Prevent: '',
  d8Congratulate: ''
}

export type QualityNoteRecord = {
  id: string
  vehicleModelIds: string[]
  modelNames: string[]
  stationId: string | null
  stationCode: string | null
  stationName: string | null
  workerLineStationId: string | null
  workerLineCode: string | null
  category: string
  severity: QualityNoteSeverity
  repairTime: QualityNoteRepairTime
  status: QualityNoteStatus
  description: string
  studyNotes: string | null
  study8d: QualityNote8D
  vins: string[]
  notedAt: string
  createdAt: string
  updatedAt: string
}

export type QualityNoteInput = {
  vehicleModelIds: string[]
  stationId: string
  workerLineStationId?: string | null
  category: string
  severity: QualityNoteSeverity
  repairTime: QualityNoteRepairTime
  description: string
  vins?: string[]
  notedAt?: string
}

export type QualityNoteStudyPatch = {
  status: QualityNoteStatus
  studyNotes?: string | null
  study8d?: QualityNote8D
}
