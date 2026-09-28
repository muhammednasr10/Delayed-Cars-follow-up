import { supabase } from '../lib/supabase'
import type {
  ProductionOrder,
  ProductionOrderColorInput,
  ProductionOrderColorLine,
  ProductionOrderInput
} from '../Types/production'

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
  opened_at?: string | null
  created_at: string
  updated_at: string
}

type ColorJoinRow = {
  id: string
  production_order_id: string
  color_id: string
  qty: number
  vehicle_colors?: {
    name?: string | null
    code?: string | null
    hex_code?: string | null
  } | null
}

function mapRow(row: ProductionOrderRow, colors: ProductionOrderColorLine[] = []): ProductionOrder {
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
    openedAt: row.opened_at ?? row.created_at ?? null,
    colors,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapColorRow(row: ColorJoinRow): ProductionOrderColorLine {
  return {
    id: row.id,
    colorId: row.color_id,
    colorName: row.vehicle_colors?.name ?? null,
    colorCode: row.vehicle_colors?.code ?? null,
    hexCode: row.vehicle_colors?.hex_code ?? null,
    qty: row.qty
  }
}

async function loadColorsByOrderIds(orderIds: string[]): Promise<Map<string, ProductionOrderColorLine[]>> {
  const map = new Map<string, ProductionOrderColorLine[]>()
  if (orderIds.length === 0) return map
  const { data, error } = await requireClient()
    .from('production_order_colors')
    .select('id, production_order_id, color_id, qty, vehicle_colors(name, code, hex_code)')
    .in('production_order_id', orderIds)
  if (error) return map
  for (const row of (data ?? []) as ColorJoinRow[]) {
    const list = map.get(row.production_order_id) ?? []
    list.push(mapColorRow(row))
    map.set(row.production_order_id, list)
  }
  return map
}

async function replaceOrderColors(orderId: string, colors: ProductionOrderColorInput[] | undefined): Promise<void> {
  if (colors === undefined) return
  const client = requireClient()
  const { error: delErr } = await client.from('production_order_colors').delete().eq('production_order_id', orderId)
  if (delErr) {
    if (/relation|does not exist|schema cache/i.test(delErr.message)) return
    throw new Error(delErr.message)
  }

  const rows = colors
    .filter(c => c.colorId && Number(c.qty) > 0)
    .map(c => ({
      production_order_id: orderId,
      color_id: c.colorId,
      qty: Math.floor(Number(c.qty))
    }))
  if (rows.length === 0) return

  const { error: insErr } = await client.from('production_order_colors').insert(rows)
  if (insErr) {
    if (/relation|does not exist|schema cache/i.test(insErr.message)) return
    throw new Error(insErr.message)
  }
}

function writePayload(input: ProductionOrderInput, includeOpenedAt: boolean) {
  const payload: Record<string, unknown> = {
    order_number: input.orderNumber.trim(),
    model_id: input.modelId || null,
    planned_qty: input.plannedQty,
    chassis_start: input.chassisStart?.trim() || null,
    chassis_end: input.chassisEnd?.trim() || null,
    planned_start: input.plannedStart || null,
    planned_end: input.plannedEnd || null,
    notes: input.notes?.trim() || null
  }
  if (includeOpenedAt && input.openedAt !== undefined) {
    payload.opened_at = input.openedAt || null
  }
  return payload
}

export async function getProductionOrders(): Promise<ProductionOrder[]> {
  let rows: ProductionOrderRow[] = []
  const primary = await requireClient().from('v_production_orders_detail').select('*').order('created_at', {
    ascending: false
  })

  if (primary.error) {
    const fallback = await requireClient().from('production_orders').select('*').order('created_at', {
      ascending: false
    })
    if (fallback.error) throw new Error(fallback.error.message)
    rows = (fallback.data ?? []) as ProductionOrderRow[]
  } else {
    rows = (primary.data ?? []) as ProductionOrderRow[]
  }

  rows.sort((a, b) => {
    const aa = a.opened_at ?? a.created_at
    const bb = b.opened_at ?? b.created_at
    return bb.localeCompare(aa)
  })

  const colorsMap = await loadColorsByOrderIds(rows.map(r => r.id))
  return rows.map(row => mapRow(row, colorsMap.get(row.id) ?? []))
}

async function saveOrder(
  mode: 'create' | 'update',
  id: string | null,
  input: ProductionOrderInput
): Promise<ProductionOrder> {
  const client = requireClient()
  const withOpened = writePayload(input, true)
  let result =
    mode === 'create'
      ? await client.from('production_orders').insert(withOpened).select('*').single()
      : await client.from('production_orders').update(withOpened).eq('id', id!).select('*').single()

  if (result.error && /opened_at/i.test(result.error.message)) {
    const withoutOpened = writePayload(input, false)
    result =
      mode === 'create'
        ? await client.from('production_orders').insert(withoutOpened).select('*').single()
        : await client.from('production_orders').update(withoutOpened).eq('id', id!).select('*').single()
  }

  if (result.error) throw new Error(result.error.message)
  const row = result.data as ProductionOrderRow
  await replaceOrderColors(row.id, input.colors)
  const colorsMap = await loadColorsByOrderIds([row.id])
  return mapRow(row, colorsMap.get(row.id) ?? [])
}

export async function createProductionOrder(input: ProductionOrderInput): Promise<ProductionOrder> {
  return saveOrder('create', null, input)
}

export async function updateProductionOrder(id: string, input: ProductionOrderInput): Promise<ProductionOrder> {
  return saveOrder('update', id, input)
}

export async function deleteProductionOrder(id: string): Promise<void> {
  const { error } = await requireClient().from('production_orders').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
