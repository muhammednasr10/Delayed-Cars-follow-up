import { supabase } from '../lib/supabase'
import type { WarehouseCart, WarehouseCartInput, WarehouseRack, WarehouseRackInput } from '../Types/warehouse'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

type RackRow = {
  id: string
  warehouse_id: string | null
  station_id: string | null
  code: string
  name: string | null
  capacity: string | null
  length_mm: number | null
  width_mm: number | null
  height_mm: number | null
  direction: string | null
  status: string
  notes: string | null
  is_active: boolean
  created_at: string
  warehouses?: { code: string; name: string } | null
  stations?: { station_number: string; station_name: string } | null
}

type CartRow = {
  id: string
  warehouse_id: string | null
  code: string
  name: string | null
  cart_type: string | null
  capacity: string | null
  max_load_kg: number | null
  doll_count: number | null
  doll_length_cm: number | null
  doll_width_cm: number | null
  doll_height_cm: number | null
  status: string
  notes: string | null
  is_active: boolean
  created_at: string
  warehouses?: { code: string; name: string } | null
}

function mapRack(r: RackRow): WarehouseRack {
  return {
    id: r.id,
    warehouseId: r.warehouse_id,
    warehouseCode: r.warehouses?.code ?? null,
    warehouseName: r.warehouses?.name ?? null,
    stationId: r.station_id,
    stationNumber: r.stations?.station_number ?? null,
    stationName: r.stations?.station_name ?? null,
    code: r.code,
    name: r.name,
    capacity: r.capacity,
    lengthMm: r.length_mm != null ? Number(r.length_mm) : null,
    widthMm: r.width_mm != null ? Number(r.width_mm) : null,
    heightMm: r.height_mm != null ? Number(r.height_mm) : null,
    direction: r.direction,
    status: r.status as WarehouseRack['status'],
    notes: r.notes,
    isActive: r.is_active,
    createdAt: r.created_at
  }
}

function mapCart(r: CartRow): WarehouseCart {
  return {
    id: r.id,
    warehouseId: r.warehouse_id,
    warehouseCode: r.warehouses?.code ?? null,
    warehouseName: r.warehouses?.name ?? null,
    code: r.code,
    name: r.name,
    cartType: r.cart_type,
    capacity: r.capacity,
    maxLoadKg: r.max_load_kg != null ? Number(r.max_load_kg) : null,
    dollCount: r.doll_count != null ? Number(r.doll_count) : null,
    dollLengthCm: r.doll_length_cm != null ? Number(r.doll_length_cm) : null,
    dollWidthCm: r.doll_width_cm != null ? Number(r.doll_width_cm) : null,
    dollHeightCm: r.doll_height_cm != null ? Number(r.doll_height_cm) : null,
    status: r.status as WarehouseCart['status'],
    notes: r.notes,
    isActive: r.is_active,
    createdAt: r.created_at
  }
}

const RACK_SELECT = '*, warehouses(code, name), stations(station_number, station_name)'
const CART_SELECT = '*, warehouses(code, name)'

export async function getWarehouseRacks(): Promise<WarehouseRack[]> {
  const { data, error } = await client()
    .from('warehouse_racks')
    .select(RACK_SELECT)
    .eq('is_active', true)
    .order('code')
  if (error) throw new Error(error.message)
  return (data ?? []).map(row => mapRack(row as RackRow))
}

export async function getWarehouseCarts(): Promise<WarehouseCart[]> {
  const { data, error } = await client()
    .from('warehouse_carts')
    .select(CART_SELECT)
    .eq('is_active', true)
    .order('code')
  if (error) throw new Error(error.message)
  return (data ?? []).map(row => mapCart(row as CartRow))
}

export async function createWarehouseRack(input: WarehouseRackInput): Promise<void> {
  const { error } = await client().from('warehouse_racks').insert({
    warehouse_id: input.warehouseId || null,
    station_id: input.stationId || null,
    code: input.code.trim(),
    name: input.name?.trim() || null,
    capacity: input.capacity?.trim() || null,
    length_mm: input.lengthMm ?? null,
    width_mm: input.widthMm ?? null,
    height_mm: input.heightMm ?? null,
    direction: input.direction?.trim() || null,
    status: input.status ?? 'active',
    notes: input.notes?.trim() || null
  })
  if (error) throw new Error(error.message)
}

export async function updateWarehouseRack(id: string, input: WarehouseRackInput): Promise<void> {
  const { error } = await client()
    .from('warehouse_racks')
    .update({
      warehouse_id: input.warehouseId || null,
      station_id: input.stationId || null,
      code: input.code.trim(),
      name: input.name?.trim() || null,
      capacity: input.capacity?.trim() || null,
      length_mm: input.lengthMm ?? null,
      width_mm: input.widthMm ?? null,
      height_mm: input.heightMm ?? null,
      direction: input.direction?.trim() || null,
      status: input.status ?? 'active',
      notes: input.notes?.trim() || null
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteWarehouseRack(id: string): Promise<void> {
  const { error } = await client().from('warehouse_racks').update({ is_active: false }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function createWarehouseCart(input: WarehouseCartInput): Promise<void> {
  const { error } = await client().from('warehouse_carts').insert({
    warehouse_id: input.warehouseId || null,
    code: input.code.trim(),
    name: input.name?.trim() || null,
    cart_type: input.cartType?.trim() || null,
    capacity: input.capacity?.trim() || null,
    max_load_kg: input.maxLoadKg ?? null,
    doll_count: input.dollCount ?? null,
    doll_length_cm: input.dollLengthCm ?? null,
    doll_width_cm: input.dollWidthCm ?? null,
    doll_height_cm: input.dollHeightCm ?? null,
    status: input.status ?? 'active',
    notes: input.notes?.trim() || null
  })
  if (error) throw new Error(error.message)
}

export async function updateWarehouseCart(id: string, input: WarehouseCartInput): Promise<void> {
  const { error } = await client()
    .from('warehouse_carts')
    .update({
      warehouse_id: input.warehouseId || null,
      code: input.code.trim(),
      name: input.name?.trim() || null,
      cart_type: input.cartType?.trim() || null,
      capacity: input.capacity?.trim() || null,
      max_load_kg: input.maxLoadKg ?? null,
      doll_count: input.dollCount ?? null,
      doll_length_cm: input.dollLengthCm ?? null,
      doll_width_cm: input.dollWidthCm ?? null,
      doll_height_cm: input.dollHeightCm ?? null,
      status: input.status ?? 'active',
      notes: input.notes?.trim() || null
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteWarehouseCart(id: string): Promise<void> {
  const { error } = await client().from('warehouse_carts').update({ is_active: false }).eq('id', id)
  if (error) throw new Error(error.message)
}
