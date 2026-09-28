import type { ProductionOrderStatus } from './enums'

export type ProductionOrderColorLine = {
  id?: string
  colorId: string
  colorName?: string | null
  colorCode?: string | null
  hexCode?: string | null
  qty: number
}

export type ProductionOrder = {
  id: string
  orderNumber: string
  modelId: string | null
  modelName?: string | null
  familyName?: string | null
  plannedQty: number
  status: ProductionOrderStatus
  chassisStart?: string | null
  chassisEnd?: string | null
  plannedStart?: string | null
  plannedEnd?: string | null
  notes?: string | null
  /** When the order was opened on the line / for planning. */
  openedAt?: string | null
  colors?: ProductionOrderColorLine[]
  createdAt?: string
  updatedAt?: string
}

export type ProductionOrderColorInput = {
  colorId: string
  qty: number
}

export type ProductionOrderInput = {
  orderNumber: string
  modelId: string | null
  plannedQty: number
  chassisStart?: string | null
  chassisEnd?: string | null
  plannedStart?: string | null
  plannedEnd?: string | null
  notes?: string
  openedAt?: string | null
  colors?: ProductionOrderColorInput[]
}
