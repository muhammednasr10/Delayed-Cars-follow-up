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
  model_name?: string | null
  family_name?: string | null
  planned_qty: number
  status: ProductionOrder['status']
  chassis_start: string | null
  chassis_end: string | null
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
    modelName: row.model_name ?? null,
    familyName: row.family_name ?? null,
    plannedQty: row.planned_qty,
    status: row.status,
    chassisStart: row.chassis_start,
    chassisEnd: row.chassis_end,
    plannedStart: row.planned_start,
    plannedEnd: row.planned_end,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export async function getProductionOrders(): Promise<ProductionOrder[]> {
  const { data, error } = await requireClient()
    .from('v_production_orders_detail')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    const fallback = await requireClient().from('production_orders').select('*').order('created_at', { ascending: false })
    if (fallback.error) throw new Error(fallback.error.message)
    return ((fallback.data ?? []) as ProductionOrderRow[]).map(mapRow)
  }

  return ((data ?? []) as ProductionOrderRow[]).map(mapRow)
}

export async function createProductionOrder(input: ProductionOrderInput): Promise<ProductionOrder> {
  const { data, error } = await requireClient()
    .from('production_orders')
    .insert({
      order_number: input.orderNumber.trim(),
      model_id: input.modelId || null,
      planned_qty: input.plannedQty,
      chassis_start: input.chassisStart?.trim() || null,
      chassis_end: input.chassisEnd?.trim() || null,
      planned_start: input.plannedStart || null,
      planned_end: input.plannedEnd || null,
      notes: input.notes?.trim() || null
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapRow(data as ProductionOrderRow)
}

export async function updateProductionOrder(id: string, input: ProductionOrderInput): Promise<ProductionOrder> {
  const { data, error } = await requireClient()
    .from('production_orders')
    .update({
      order_number: input.orderNumber.trim(),
      model_id: input.modelId || null,
      planned_qty: input.plannedQty,
      chassis_start: input.chassisStart?.trim() || null,
      chassis_end: input.chassisEnd?.trim() || null,
      planned_start: input.plannedStart || null,
      planned_end: input.plannedEnd || null,
      notes: input.notes?.trim() || null
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapRow(data as ProductionOrderRow)
}

export async function deleteProductionOrder(id: string): Promise<void> {
  const { error } = await requireClient().from('production_orders').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
