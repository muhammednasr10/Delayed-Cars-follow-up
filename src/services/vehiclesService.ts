import { supabase } from '../lib/supabase'
import type { VehicleInput, VehicleOverview } from '../Types/vehicle'

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

type VehicleOverviewRow = {
  id: string
  vin: string
  production_status: VehicleOverview['productionStatus']
  completion_status: VehicleOverview['completionStatus']
  qc_status: VehicleOverview['qcStatus']
  delivery_status: VehicleOverview['deliveryStatus']
  delivery_blocked: boolean
  open_missing_count: number
  completion_percent: number | string
  model_name: string | null
  production_order_number: string | null
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
    productionOrderNumber: row.production_order_number ?? '',
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
      production_order_id: input.productionOrderId,
      model_id: input.modelId,
      vehicle_color_id: input.vehicleColorId || null,
      current_station_id: input.currentStationId || null,
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
