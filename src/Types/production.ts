import type { ProductionOrderStatus } from './enums'

export type ProductionOrder = {
  id: string
  orderNumber: string
  modelId: string | null
  plannedQty: number
  status: ProductionOrderStatus
  plannedStart?: string | null
  plannedEnd?: string | null
  notes?: string | null
  createdAt?: string
  updatedAt?: string
}

export type ProductionOrderInput = {
  orderNumber: string
  modelId: string | null
  plannedQty: number
  plannedStart?: string | null
  plannedEnd?: string | null
  notes?: string
}
