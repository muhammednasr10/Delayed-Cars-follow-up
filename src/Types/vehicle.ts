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
  modelId?: string | null
  vehicleColorId?: string | null
  colorName?: string | null
  colorHex?: string | null
  productionOrderId?: string | null
  productionOrderNumber: string
  factoryOrgUnitId?: string | null
  createdAt: string
  updatedAt: string
}

export type VehicleInput = {
  vin: string
  productionOrderId?: string | null
  modelId: string
  vehicleColorId?: string | null
  currentStationId?: string | null
  factoryOrgUnitId?: string | null
  notes?: string
}

export type VehicleUpdateInput = {
  vin?: string
  modelId?: string
  vehicleColorId?: string | null
  productionOrderId?: string | null
}

export type VehicleFilters = {
  search: string
  deliveryStatus: '' | VehicleDeliveryStatus
  qcStatus: '' | VehicleQcStatus
  blockedOnly: boolean
}
