export type ProductionStopType = 'partial' | 'full'

export type ProductionLineStop = {
  id: string
  stopReason: string
  stopType: ProductionStopType
  vehicleModelId: string | null
  vehicleModelName: string | null
  startedAt: string
  endedAt: string
  department: string
  lostVehicles: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type ProductionLineStopInput = {
  stopReason: string
  stopType: ProductionStopType
  vehicleModelId?: string | null
  startedAt: string
  endedAt: string
  department: string
  lostVehicles: number
  notes?: string | null
}
