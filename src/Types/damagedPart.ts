export type DamagedPartRecord = {
  id: string
  vehicleModelId: string
  modelName: string
  partId: string
  partNumber: string
  partName: string | null
  quantity: number
  damageReason: string
  finalDecision: string
  isRepairable: boolean
  causedByEmployeeId: string | null
  causedByName: string | null
  imagePath: string | null
  imageUrl: string | null
  notes: string | null
  reportedAt: string
  createdAt: string
  updatedAt: string
}

export type DamagedPartInput = {
  vehicleModelId: string
  partId: string
  partNumber: string
  partName?: string | null
  quantity: number
  damageReason: string
  finalDecision: string
  isRepairable?: boolean
  causedByEmployeeId?: string | null
  imagePath?: string | null
  notes?: string | null
  reportedAt?: string
}

export type IplPartHit = {
  partId: string
  partNumber: string
  partName: string | null
  stationCode: string | null
}

export type DamagedPartFilters = {
  search: string
  modelName: string
  damageReason: string
  finalDecision: string
  causedByEmployeeId: string
  dateFrom: string
  dateTo: string
  topLimit: number
}

export const DEFAULT_DAMAGED_PART_FILTERS: DamagedPartFilters = {
  search: '',
  modelName: '',
  damageReason: '',
  finalDecision: '',
  causedByEmployeeId: '',
  dateFrom: '',
  dateTo: '',
  topLimit: 10
}
