export type VehicleNote = {
  id: string
  vehicleId: string
  body: string
  createdBy: string | null
  createdByName: string | null
  createdByEmail: string | null
  createdAt: string
}

export type VehicleNoteTarget = {
  vehicleId: string
  vin: string
  modelName: string
  colorName: string | null
  colorHex: string | null
  /** Other chassis in the same report, so the notes icon can show each VIN's thread. */
  chassis?: { vehicleId: string; vin: string }[]
}
