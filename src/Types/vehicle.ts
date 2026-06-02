import type {
  VehicleCompletionStatus,
  VehicleDeliveryStatus,
  VehicleProductionStatus,
  VehicleQcStatus
} from './enums'

// Row shape returned by the `v_vehicle_overview` reporting view.
export type VehicleOverview = {
  id: string
  vin: string
  productionStatus: VehicleProductionStatus
  completionStatus: VehicleCompletionStatus
  qcStatus: VehicleQcStatus
  deliveryStatus: VehicleDeliveryStatus
  deliveryBlocked: boolean
  openMissingCount: number
  completionPercent: number
  modelName: string
  productionOrderNumber: string
  createdAt: string
  updatedAt: string
}

export type VehicleInput = {
  vin: string
  productionOrderId: string
  modelId: string
  vehicleColorId?: string | null
  currentStationId?: string | null
  notes?: string
}

export type VehicleFilters = {
  search: string
  deliveryStatus: '' | VehicleDeliveryStatus
  qcStatus: '' | VehicleQcStatus
  blockedOnly: boolean
}
