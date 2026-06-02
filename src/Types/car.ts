export type CriticalityLevel = 'critical' | 'medium' | 'low'
export type DelayStatus = 'waiting' | 'shipping' | 'received_installed' | 'closed'

export type DelayedCar = {
  id: string
  chassisNumber: string
  model: string
  modelId?: string | null
  stationNumber: string
  stationId?: string | null
  vehicleColorId?: string | null
  vehicleColorName?: string | null
  vehicleColorHex?: string | null
  missingPart: string
  criticality: CriticalityLevel
  isDrItem: boolean
  assignedEngineer: string
  assignedUserId?: string | null
  notes: string
  status: DelayStatus
  createdAt: string
  updatedAt: string
  resolvedAt?: string | null
}

export type DelayedCarInput = Omit<
  DelayedCar,
  'id' | 'status' | 'createdAt' | 'updatedAt' | 'resolvedAt' | 'vehicleColorName' | 'vehicleColorHex'
>

export type TrackingFilters = {
  stationNumber: string
  criticality: '' | CriticalityLevel
  drOnly: boolean
  search: string
}
