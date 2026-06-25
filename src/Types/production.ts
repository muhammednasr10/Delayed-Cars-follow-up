import type { ProductionOrderStatus } from './enums'

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
  createdAt?: string
  updatedAt?: string
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
}
