export type ProductionLineStop = {
  id: string
  stopReason: string
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
  startedAt: string
  endedAt: string
  department: string
  lostVehicles: number
  notes?: string | null
}
