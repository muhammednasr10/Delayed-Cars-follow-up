export type ScratchSeverity = 'light' | 'medium' | 'severe'

export type ScratchRecord = {
  id: string
  vin: string
  bodyArea: string
  severity: ScratchSeverity
  recordedAt: string
  notes?: string
}

export type ScratchInput = Omit<ScratchRecord, 'id'>
