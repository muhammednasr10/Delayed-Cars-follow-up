export type MissingPartWorkflowKind = 'transfer' | 'restore'
export type MissingPartWorkflowStatus = 'pending' | 'approved' | 'rejected'

export type MissingPartWorkflowRequest = {
  id: string
  kind: MissingPartWorkflowKind
  status: MissingPartWorkflowStatus
  missingPartId: string | null
  vehicleId: string
  fromStationId: string | null
  toStationId: string | null
  requestedBy: string | null
  requestedAt: string
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNote: string | null
  vin: string
  modelName: string
  partDescription: string | null
  fromStationNumber: string | null
  fromStationName: string | null
  toStationNumber: string | null
  toStationName: string | null
  requestedByName: string | null
  reviewedByName: string | null
}
