export type Warehouse = {
  id: string
  code: string
  name: string
  allowNegativeStock: boolean
  isActive: boolean
}

export type FeedingWarehouseType = 'CKD' | 'Local' | 'Plastics' | 'Hardware'

export type IplFeedingRow = {
  bomItemId: string
  partId: string
  partNumber: string
  partName: string
  qtyPerVehicle: number
  stationCode: string | null
  stationSortOrder: number | null
  warehouseType: FeedingWarehouseType
  warehouseTypeLabel: string
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
  productionOrderId: string | null
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

export type WarehouseEquipmentStatus = 'active' | 'maintenance' | 'retired'

export type WarehouseRack = {
  id: string
  warehouseId: string | null
  warehouseCode: string | null
  warehouseName: string | null
  stationId: string | null
  stationNumber: string | null
  stationName: string | null
  code: string
  name: string | null
  capacity: string | null
  lengthMm: number | null
  widthMm: number | null
  heightMm: number | null
  direction: string | null
  status: WarehouseEquipmentStatus
  notes: string | null
  isActive: boolean
  createdAt: string
}

export type WarehouseCart = {
  id: string
  warehouseId: string | null
  warehouseCode: string | null
  warehouseName: string | null
  code: string
  name: string | null
  cartType: string | null
  capacity: string | null
  maxLoadKg: number | null
  dollCount: number | null
  dollLengthCm: number | null
  dollWidthCm: number | null
  dollHeightCm: number | null
  status: WarehouseEquipmentStatus
  notes: string | null
  isActive: boolean
  createdAt: string
}

export type WarehouseRackInput = {
  warehouseId?: string | null
  stationId?: string | null
  code: string
  name?: string | null
  capacity?: string | null
  lengthMm?: number | null
  widthMm?: number | null
  heightMm?: number | null
  direction?: string | null
  status?: WarehouseEquipmentStatus
  notes?: string | null
}

export type WarehouseCartInput = {
  warehouseId?: string | null
  code: string
  name?: string | null
  cartType?: string | null
  capacity?: string | null
  maxLoadKg?: number | null
  dollCount?: number | null
  dollLengthCm?: number | null
  dollWidthCm?: number | null
  dollHeightCm?: number | null
  status?: WarehouseEquipmentStatus
  notes?: string | null
}
