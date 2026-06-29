export type QualityNoteSeverity = 'low' | 'medium' | 'high' | 'critical'

export type QualityNoteStatus = 'open' | 'under_study' | 'closed'

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
  status: QualityNoteStatus
  description: string
  studyNotes: string | null
  vehicleCount: number
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
  description: string
  vehicleCount: number
  vins?: string[]
  notedAt?: string
}

export type QualityNoteStudyPatch = {
  status: QualityNoteStatus
  studyNotes?: string | null
}
