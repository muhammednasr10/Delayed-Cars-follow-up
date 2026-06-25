export type Warehouse = {
  id: string
  code: string
  name: string
  allowNegativeStock: boolean
  isActive: boolean
}

export type IplFeedingRow = {
  bomItemId: string
  partId: string
  partNumber: string
  partName: string
  qtyPerVehicle: number
  stationCode: string | null
  stationSortOrder: number | null
  qtyAvailable: number
  partDirection: 'right' | 'left' | 'either' | 'other'
  partDirectionLabel: string
  partKindLabel: string
  dimensions: string
  weight: string
  classification: string
  rackCapacity: string
  supplierLabel: string
  cartonQty: string
  feedingMethod: string
}

export type ModelPartInventory = {
  vehicleModelId: string
  modelName: string
  modelKind: string | null
  partId: string
  partNumber: string
  normalizedPartNumber: string
  partName: string
  qtyPerVehicle: number
  itemId: string | null
  itemSku: string | null
  warehouseId: string | null
  warehouseCode: string | null
  warehouseName: string | null
  qtyOnHand: number
  qtyReserved: number
  qtyAvailable: number
  vehiclesCoverable: number | null
}

export type WarehouseFeedingLine = {
  id: string
  partId: string
  partNumber: string
  partName: string
  quantity: number
  itemId: string | null
  notes: string | null
}

export type WarehouseFeeding = {
  id: string
  vehicleModelId: string
  modelName: string
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  stationId: string | null
  stationNumber: string | null
  stationName: string | null
  feedingDate: string
  reference: string | null
  notes: string | null
  createdAt: string
  lines: WarehouseFeedingLine[]
}

export type FeedingLineInput = {
  partId: string
  quantity: number
  notes?: string | null
}

export type FeedingPlanStatus = 'planned' | 'executed' | 'cancelled'

export type WarehouseFeedingPlanLine = {
  id: string
  partId: string
  partNumber: string
  partName: string
  quantity: number
  notes: string | null
}

export type WarehouseFeedingPlan = {
  id: string
  vehicleModelId: string
  modelName: string
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  stationId: string | null
  stationNumber: string | null
  stationName: string | null
  plannedDate: string
  status: FeedingPlanStatus
  notes: string | null
  executedFeedingId: string | null
  createdAt: string
  lines: WarehouseFeedingPlanLine[]
}
