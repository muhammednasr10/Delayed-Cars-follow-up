export type CriticalityLevel = 'critical' | 'medium' | 'low'
export type DelayStatus = 'waiting' | 'shipping' | 'installed' | 'closed'

export type DelayedCar = {
  id: string
  chassisNumber: string
  model: string
  stationNumber: string
  missingPart: string
  criticality: CriticalityLevel
  isDrItem: boolean
  assignedEngineer: string
  notes: string
  status: DelayStatus
  createdAt: string
  updatedAt: string
  resolvedAt?: string
}

export type DelayedCarInput = Omit<
  DelayedCar,
  'id' | 'status' | 'createdAt' | 'updatedAt' | 'resolvedAt'
>

export type TrackingFilters = {
  stationNumber: string
  criticality: '' | CriticalityLevel
  drOnly: boolean
  search: string
}
