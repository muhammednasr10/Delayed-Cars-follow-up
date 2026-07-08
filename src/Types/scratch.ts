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
}
