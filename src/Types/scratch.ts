export type ScratchSeverity = 'light' | 'medium' | 'severe'

export type ScratchRecord = {
  id: string
  vin: string
  bodyArea: string
  factoryOrgUnitId?: string | null
  severity: ScratchSeverity
  recordedAt: string
  notes?: string
}

export type ScratchInput = Omit<ScratchRecord, 'id'>
