export type ScratchSeverity = 'light' | 'medium' | 'severe'

export type ScratchRecord = {
  id: string
  vin: string
  parentModelId?: string | null
  parentModelName?: string
  vehicleModelId?: string | null
  modelName?: string
  bodyArea: string
  factoryOrgUnitId?: string | null
  severity: ScratchSeverity
  recordedAt: string
  notes?: string
  imagePath?: string | null
  imageUrl?: string | null
  willStop: boolean
  completingDepartment: string | null
  followUpEmployeeId: string | null
  followUpEmployeeName: string | null
  followUpEmployeeIds: string[]
  followUpEmployeeNames: string | null
  resolvedAt: string | null
}

export type ScratchInput = {
  vin: string
  parentModelId: string
  vehicleModelId: string
  bodyArea: string
  factoryOrgUnitId?: string | null
  severity: ScratchSeverity
  recordedAt: string
  notes?: string
  imagePath?: string | null
  willStop: boolean
}

export type ScratchNote = {
  id: string
  scratchId: string
  body: string
  createdBy: string | null
  createdByName: string | null
  createdByEmail: string | null
  createdAt: string
}

export type ScratchNoteTarget = {
  scratchId: string
  vin: string
  modelName?: string
}
