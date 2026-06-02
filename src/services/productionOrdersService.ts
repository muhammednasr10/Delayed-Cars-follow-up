import { supabase } from '../lib/supabase'
import type { ProductionOrder, ProductionOrderInput } from '../Types/production'

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

type ProductionOrderRow = {
  id: string
  order_number: string
  model_id: string | null
  planned_qty: number
  status: ProductionOrder['status']
  planned_start: string | null
  planned_end: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

function mapRow(row: ProductionOrderRow): ProductionOrder {
  return {
    id: row.id,
    orderNumber: row.order_number,
    modelId: row.model_id,
    plannedQty: row.planned_qty,
    status: row.status,
    plannedStart: row.planned_start,
    plannedEnd: row.planned_end,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export async function getProductionOrders(): Promise<ProductionOrder[]> {
  const { data, error } = await requireClient()
    .from('production_orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return ((data ?? []) as ProductionOrderRow[]).map(mapRow)
}

export async function createProductionOrder(input: ProductionOrderInput): Promise<ProductionOrder> {
  const { data, error } = await requireClient()
    .from('production_orders')
    .insert({
      order_number: input.orderNumber.trim(),
      model_id: input.modelId || null,
      planned_qty: input.plannedQty,
      planned_start: input.plannedStart || null,
      planned_end: input.plannedEnd || null,
      notes: input.notes?.trim() || null
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapRow(data as ProductionOrderRow)
}
