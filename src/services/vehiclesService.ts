import { supabase } from '../lib/supabase'
import type { VehicleInput, VehicleOverview, VehicleUpdateInput } from '../Types/vehicle'

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

type VehicleOverviewRow = {
  id: string
  vin: string
  model_id?: string | null
  vehicle_color_id?: string | null
  production_order_id?: string | null
  production_status: VehicleOverview['productionStatus']
  completion_status: VehicleOverview['completionStatus']
  qc_status: VehicleOverview['qcStatus']
  delivery_status: VehicleOverview['deliveryStatus']
  delivery_blocked: boolean
  open_missing_count: number
  completion_percent: number | string
  model_name: string | null
  color_name?: string | null
  color_hex?: string | null
  production_order_number: string | null
  factory_org_unit_id?: string | null
  created_at: string
  updated_at: string
}

function mapOverview(row: VehicleOverviewRow): VehicleOverview {
  return {
    id: row.id,
    vin: row.vin,
    productionStatus: row.production_status,
    completionStatus: row.completion_status,
    qcStatus: row.qc_status,
    deliveryStatus: row.delivery_status,
    deliveryBlocked: row.delivery_blocked,
    openMissingCount: row.open_missing_count,
    completionPercent: Number(row.completion_percent ?? 0),
    modelName: row.model_name ?? '',
    modelId: row.model_id ?? null,
    vehicleColorId: row.vehicle_color_id ?? null,
    colorName: row.color_name ?? null,
    colorHex: row.color_hex ?? null,
    productionOrderId: row.production_order_id ?? null,
    productionOrderNumber: row.production_order_number ?? '',
    factoryOrgUnitId: row.factory_org_unit_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export async function getVehicles(): Promise<VehicleOverview[]> {
  const { data, error } = await requireClient()
    .from('v_vehicle_overview')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return ((data ?? []) as VehicleOverviewRow[]).map(mapOverview)
}

export async function createVehicle(input: VehicleInput): Promise<string> {
  const { data, error } = await requireClient()
    .from('vehicles')
    .insert({
      vin: input.vin.trim().toUpperCase(),
      production_order_id: input.productionOrderId ?? null,
      model_id: input.modelId,
      vehicle_color_id: input.vehicleColorId || null,
      current_station_id: input.currentStationId || null,
      factory_org_unit_id: input.factoryOrgUnitId || null,
      notes: input.notes?.trim() || null
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return (data as { id: string }).id
}

// RPC: enforces all release rules at the database level.
export async function releaseVehicleForDelivery(vehicleId: string): Promise<void> {
  const { error } = await requireClient().rpc('release_vehicle_for_delivery', { p_vehicle_id: vehicleId })
  if (error) throw new Error(error.message)
}

export async function markVehicleDelivered(vehicleId: string): Promise<void> {
  const { error } = await requireClient()
    .from('vehicles')
    .update({ delivery_status: 'delivered' })
    .eq('id', vehicleId)
  if (error) throw new Error(error.message)
}

export async function updateVehicle(vehicleId: string, input: VehicleUpdateInput): Promise<void> {
  const patch: Record<string, unknown> = {}
  if (input.vin !== undefined) patch.vin = input.vin.trim().toUpperCase()
  if (input.modelId !== undefined) patch.model_id = input.modelId
  if (input.vehicleColorId !== undefined) patch.vehicle_color_id = input.vehicleColorId || null
  if (input.productionOrderId !== undefined) patch.production_order_id = input.productionOrderId || null

  const { error } = await requireClient().from('vehicles').update(patch).eq('id', vehicleId)
  if (error) throw new Error(error.message)
}

export async function softDeleteVehicle(vehicleId: string): Promise<void> {
  const { error } = await requireClient().from('vehicles').update({ is_deleted: true }).eq('id', vehicleId)
  if (error) throw new Error(error.message)
}
