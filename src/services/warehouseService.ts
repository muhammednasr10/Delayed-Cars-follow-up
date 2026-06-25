import { supabase } from '../lib/supabase'
import type { BomItemDetail } from '../Types/bom'
import { iplFieldsFromBomItem } from '../Utils/iplFeedingFields'
import type {
  FeedingLineInput,
  FeedingPlanStatus,
  IplFeedingRow,
  ModelPartInventory,
  Warehouse,
  WarehouseFeeding,
  WarehouseFeedingPlan
} from '../Types/warehouse'

function client() {
  if (!supabase) throw new Error('Supabase is not configured. Check .env')
  return supabase
}

type WarehouseRow = {
  id: string
  code: string
  name: string
  allow_negative_stock: boolean
  is_active: boolean
}

type InventoryRow = {
  vehicle_model_id: string
  model_name: string
  model_kind: string | null
  part_id: string
  part_number: string
  normalized_part_number: string
  part_name: string
  qty_per_vehicle: number
  item_id: string | null
  item_sku: string | null
  warehouse_id: string | null
  warehouse_code: string | null
  warehouse_name: string | null
  qty_on_hand: number
  qty_reserved: number
  qty_available: number
  vehicles_coverable: number | null
}

function mapWarehouse(r: WarehouseRow): Warehouse {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    allowNegativeStock: r.allow_negative_stock,
    isActive: r.is_active
  }
}

function mapInventory(r: InventoryRow): ModelPartInventory {
  return {
    vehicleModelId: r.vehicle_model_id,
    modelName: r.model_name,
    modelKind: r.model_kind,
    partId: r.part_id,
    partNumber: r.part_number,
    normalizedPartNumber: r.normalized_part_number,
    partName: r.part_name,
    qtyPerVehicle: Number(r.qty_per_vehicle),
    itemId: r.item_id,
    itemSku: r.item_sku,
    warehouseId: r.warehouse_id,
    warehouseCode: r.warehouse_code,
    warehouseName: r.warehouse_name,
    qtyOnHand: Number(r.qty_on_hand),
    qtyReserved: Number(r.qty_reserved),
    qtyAvailable: Number(r.qty_available),
    vehiclesCoverable: r.vehicles_coverable
  }
}

export async function getWarehouses(): Promise<Warehouse[]> {
  const { data, error } = await client()
    .from('warehouses')
    .select('id, code, name, allow_negative_stock, is_active')
    .eq('is_active', true)
    .order('code')
  if (error) throw new Error(error.message)
  return (data as WarehouseRow[]).map(mapWarehouse)
}

export async function getModelPartInventory(filters: {
  vehicleModelId?: string
  warehouseId?: string
  search?: string
}): Promise<ModelPartInventory[]> {
  let q = client().from('v_model_part_inventory').select('*')

  if (filters.vehicleModelId) q = q.eq('vehicle_model_id', filters.vehicleModelId)
  if (filters.warehouseId) q = q.eq('warehouse_id', filters.warehouseId)
  if (filters.search?.trim()) {
    const term = filters.search.trim().replace(/%/g, '')
    q = q.or(`part_number.ilike.%${term}%,part_name.ilike.%${term}%,normalized_part_number.ilike.%${term}%`)
  }

  const { data, error } = await q.order('part_number')
  if (error) throw new Error(error.message)

  const rows = (data as InventoryRow[]).map(mapInventory)

  // Without warehouse filter, collapse duplicate parts (no stock row) into one line
  if (!filters.warehouseId) {
    const map = new Map<string, ModelPartInventory>()
    for (const row of rows) {
      const key = `${row.vehicleModelId}:${row.partId}`
      const existing = map.get(key)
      if (!existing || row.qtyOnHand > existing.qtyOnHand) {
        map.set(key, { ...row, warehouseId: row.warehouseId, warehouseCode: row.warehouseCode, warehouseName: row.warehouseName })
      }
    }
    return [...map.values()].sort((a, b) => a.partNumber.localeCompare(b.partNumber))
  }

  return rows
}

async function fetchAllBomForModel(vehicleModelId: string): Promise<BomItemDetail[]> {
  const pageSize = 200
  const items: BomItemDetail[] = []
  let page = 1

  while (true) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    const { data, error, count } = await client()
      .from('v_bom_items_detail')
      .select('*', { count: 'exact' })
      .eq('vehicle_model_id', vehicleModelId)
      .eq('is_active', true)
      .order('station_sort_order', { ascending: true, nullsFirst: false })
      .order('station_code_text')
      .order('part_number')
      .range(from, to)

    if (error) throw new Error(error.message)
    items.push(...((data ?? []) as BomItemDetail[]))
    const total = count ?? items.length
    if (items.length >= total) break
    page += 1
  }

  return items
}

export async function getIplFeedingParts(
  vehicleModelId: string,
  warehouseId?: string,
  t?: (k: string) => string
): Promise<IplFeedingRow[]> {
  const [bomItems, inventory] = await Promise.all([
    fetchAllBomForModel(vehicleModelId),
    getModelPartInventory({ vehicleModelId, warehouseId })
  ])

  const invByPart = new Map(inventory.map(i => [i.partId, i.qtyAvailable]))
  const tr = t ?? ((k: string) => k)

  return bomItems.map(item => {
    const fields = iplFieldsFromBomItem(item, tr)
    return {
      bomItemId: item.id,
      partId: item.part_id,
      partNumber: item.part_number,
      partName: item.part_name || item.part_name_ar || item.part_name_en || item.part_number,
      qtyPerVehicle: Number(item.quantity),
      stationCode: item.station_code_text || item.station_number,
      stationSortOrder: item.station_sort_order ?? null,
      qtyAvailable: invByPart.get(item.part_id) ?? 0,
      partDirection: fields.partDirection,
      partDirectionLabel: fields.partDirectionLabel,
      partKindLabel: fields.partKindLabel,
      dimensions: fields.dimensions,
      weight: fields.weight,
      classification: fields.classification,
      rackCapacity: fields.rackCapacity,
      supplierLabel: fields.supplierLabel,
      cartonQty: fields.cartonQty,
      feedingMethod: fields.feedingMethod
    }
  })
}

export async function getWarehouseFeedings(limit = 50): Promise<WarehouseFeeding[]> {
  const { data, error } = await client()
    .from('warehouse_feeding')
    .select(
      `
      id, vehicle_model_id, warehouse_id, station_id, feeding_date, reference, notes, created_at,
      vehicle_models ( name ),
      warehouses ( code, name ),
      stations ( station_number, station_name ),
      warehouse_feeding_lines (
        id, part_id, item_id, quantity, notes,
        parts ( part_number, part_name_ar, part_name_en )
      )
    `
    )
    .order('feeding_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  type Raw = {
    id: string
    vehicle_model_id: string
    warehouse_id: string
    station_id: string | null
    feeding_date: string
    reference: string | null
    notes: string | null
    created_at: string
    vehicle_models: { name: string } | null
    warehouses: { code: string; name: string } | null
    stations: { station_number: string; station_name: string } | null
    warehouse_feeding_lines: Array<{
      id: string
      part_id: string
      item_id: string | null
      quantity: number
      notes: string | null
      parts: { part_number: string; part_name_ar: string | null; part_name_en: string | null } | null
    }>
  }

  return ((data ?? []) as unknown as Raw[]).map(f => ({
    id: f.id,
    vehicleModelId: f.vehicle_model_id,
    modelName: f.vehicle_models?.name ?? '—',
    warehouseId: f.warehouse_id,
    warehouseCode: f.warehouses?.code ?? '—',
    warehouseName: f.warehouses?.name ?? '—',
    stationId: f.station_id,
    stationNumber: f.stations?.station_number ?? null,
    stationName: f.stations?.station_name ?? null,
    feedingDate: f.feeding_date,
    reference: f.reference,
    notes: f.notes,
    createdAt: f.created_at,
    lines: (f.warehouse_feeding_lines ?? []).map(l => ({
      id: l.id,
      partId: l.part_id,
      partNumber: l.parts?.part_number ?? '—',
      partName: l.parts?.part_name_ar || l.parts?.part_name_en || l.parts?.part_number || '—',
      quantity: Number(l.quantity),
      itemId: l.item_id,
      notes: l.notes
    }))
  }))
}

export async function recordWarehouseFeeding(input: {
  vehicleModelId: string
  warehouseId: string
  stationId?: string | null
  notes?: string | null
  lines: FeedingLineInput[]
}): Promise<string> {
  const { data, error } = await client().rpc('record_warehouse_feeding', {
    p_vehicle_model_id: input.vehicleModelId,
    p_warehouse_id: input.warehouseId,
    p_station_id: input.stationId || null,
    p_notes: input.notes?.trim() || null,
    p_lines: input.lines.map(l => ({
      part_id: l.partId,
      quantity: l.quantity,
      notes: l.notes?.trim() || null
    }))
  })
  if (error) throw new Error(error.message)
  return data as string
}

export async function getWarehouseFeedingPlans(limit = 50): Promise<WarehouseFeedingPlan[]> {
  const { data, error } = await client()
    .from('warehouse_feeding_plans')
    .select(
      `
      id, vehicle_model_id, warehouse_id, station_id, planned_date, status, notes, executed_feeding_id, created_at,
      vehicle_models ( name ),
      warehouses ( code, name ),
      stations ( station_number, station_name ),
      warehouse_feeding_plan_lines (
        id, part_id, quantity, notes,
        parts ( part_number, part_name_ar, part_name_en )
      )
    `
    )
    .order('planned_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  type Raw = {
    id: string
    vehicle_model_id: string
    warehouse_id: string
    station_id: string | null
    planned_date: string
    status: FeedingPlanStatus
    notes: string | null
    executed_feeding_id: string | null
    created_at: string
    vehicle_models: { name: string } | null
    warehouses: { code: string; name: string } | null
    stations: { station_number: string; station_name: string } | null
    warehouse_feeding_plan_lines: Array<{
      id: string
      part_id: string
      quantity: number
      notes: string | null
      parts: { part_number: string; part_name_ar: string | null; part_name_en: string | null } | null
    }>
  }

  return ((data ?? []) as unknown as Raw[]).map(p => ({
    id: p.id,
    vehicleModelId: p.vehicle_model_id,
    modelName: p.vehicle_models?.name ?? '—',
    warehouseId: p.warehouse_id,
    warehouseCode: p.warehouses?.code ?? '—',
    warehouseName: p.warehouses?.name ?? '—',
    stationId: p.station_id,
    stationNumber: p.stations?.station_number ?? null,
    stationName: p.stations?.station_name ?? null,
    plannedDate: p.planned_date,
    status: p.status,
    notes: p.notes,
    executedFeedingId: p.executed_feeding_id,
    createdAt: p.created_at,
    lines: (p.warehouse_feeding_plan_lines ?? []).map(l => ({
      id: l.id,
      partId: l.part_id,
      partNumber: l.parts?.part_number ?? '—',
      partName: l.parts?.part_name_ar || l.parts?.part_name_en || l.parts?.part_number || '—',
      quantity: Number(l.quantity),
      notes: l.notes
    }))
  }))
}

export async function createWarehouseFeedingPlan(input: {
  vehicleModelId: string
  warehouseId: string
  stationId?: string | null
  plannedDate: string
  notes?: string | null
  lines: FeedingLineInput[]
}): Promise<string> {
  const { data, error } = await client().rpc('create_warehouse_feeding_plan', {
    p_vehicle_model_id: input.vehicleModelId,
    p_warehouse_id: input.warehouseId,
    p_station_id: input.stationId || null,
    p_planned_date: input.plannedDate,
    p_notes: input.notes?.trim() || null,
    p_lines: input.lines.map(l => ({
      part_id: l.partId,
      quantity: l.quantity,
      notes: l.notes?.trim() || null
    }))
  })
  if (error) throw new Error(error.message)
  return data as string
}

export async function executeWarehouseFeedingPlan(planId: string): Promise<string> {
  const { data, error } = await client().rpc('execute_warehouse_feeding_plan', { p_plan_id: planId })
  if (error) throw new Error(error.message)
  return data as string
}

export async function cancelWarehouseFeedingPlan(planId: string): Promise<void> {
  const { error } = await client()
    .from('warehouse_feeding_plans')
    .update({ status: 'cancelled' })
    .eq('id', planId)
    .eq('status', 'planned')
  if (error) throw new Error(error.message)
}
