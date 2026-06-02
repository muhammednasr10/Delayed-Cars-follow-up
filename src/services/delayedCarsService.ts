import { supabase } from '../lib/supabase'
import type { DelayedCar, DelayedCarInput, DelayStatus } from '../Types/car'

type DelayedCarRow = {
  id: string
  chassis_number: string
  model: string | null
  model_id: string | null
  station_number: string | null
  station_id: string | null
  vehicle_color_id: string | null
  missing_part: string
  criticality: 'critical' | 'medium' | 'low'
  is_dr_item: boolean
  assigned_engineer: string | null
  assigned_user_id: string | null
  status: DelayStatus
  notes: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  vehicle_colors?: { name: string; hex_code: string } | null
}

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }
  return supabase
}

export function mapRowToCar(row: DelayedCarRow): DelayedCar {
  return {
    id: row.id,
    chassisNumber: row.chassis_number,
    model: row.model ?? '',
    modelId: row.model_id,
    stationNumber: row.station_number ?? '',
    stationId: row.station_id,
    vehicleColorId: row.vehicle_color_id,
    vehicleColorName: row.vehicle_colors?.name ?? null,
    vehicleColorHex: row.vehicle_colors?.hex_code ?? null,
    missingPart: row.missing_part,
    criticality: row.criticality,
    isDrItem: row.is_dr_item,
    assignedEngineer: row.assigned_engineer ?? '',
    assignedUserId: row.assigned_user_id,
    notes: row.notes ?? '',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at
  }
}

function mapInputToInsert(input: DelayedCarInput) {
  return {
    chassis_number: input.chassisNumber.trim().toUpperCase(),
    model: input.model,
    model_id: input.modelId || null,
    station_number: input.stationNumber,
    station_id: input.stationId || null,
    vehicle_color_id: input.vehicleColorId || null,
    missing_part: input.missingPart.trim(),
    criticality: input.criticality,
    is_dr_item: input.isDrItem,
    assigned_engineer: input.assignedEngineer,
    assigned_user_id: input.assignedUserId || null,
    status: 'waiting' as DelayStatus,
    notes: input.notes?.trim() || null
  }
}

export async function getDelayedCars(): Promise<DelayedCar[]> {
  const { data, error } = await requireClient()
    .from('delayed_cars')
    .select('*, vehicle_colors(name, hex_code)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to load delayed cars:', error)
    throw new Error(error.message)
  }

  return ((data ?? []) as DelayedCarRow[]).map(mapRowToCar)
}

export async function createDelayedCar(input: DelayedCarInput): Promise<DelayedCar> {
  const { data, error } = await requireClient()
    .from('delayed_cars')
    .insert(mapInputToInsert(input))
    .select('*, vehicle_colors(name, hex_code)')
    .single()

  if (error) {
    console.error('Failed to create delayed car:', error)
    throw new Error(error.message)
  }

  return mapRowToCar(data as DelayedCarRow)
}

export async function updateDelayedCarStatus(id: string, status: DelayStatus): Promise<void> {
  const patch = {
    status,
    resolved_at: status === 'received_installed' || status === 'closed' ? new Date().toISOString() : null
  }

  const { error } = await requireClient().from('delayed_cars').update(patch).eq('id', id)
  if (error) {
    console.error('Failed to update delayed car status:', error)
    throw new Error(error.message)
  }
}

export async function updateDelayedCar(id: string, patch: Partial<DelayedCar>): Promise<void> {
  const dbPatch: Record<string, unknown> = {}
  if (patch.chassisNumber !== undefined) dbPatch.chassis_number = patch.chassisNumber
  if (patch.model !== undefined) dbPatch.model = patch.model
  if (patch.modelId !== undefined) dbPatch.model_id = patch.modelId || null
  if (patch.stationNumber !== undefined) dbPatch.station_number = patch.stationNumber
  if (patch.stationId !== undefined) dbPatch.station_id = patch.stationId || null
  if (patch.vehicleColorId !== undefined) dbPatch.vehicle_color_id = patch.vehicleColorId || null
  if (patch.missingPart !== undefined) dbPatch.missing_part = patch.missingPart
  if (patch.criticality !== undefined) dbPatch.criticality = patch.criticality
  if (patch.isDrItem !== undefined) dbPatch.is_dr_item = patch.isDrItem
  if (patch.assignedEngineer !== undefined) dbPatch.assigned_engineer = patch.assignedEngineer
  if (patch.assignedUserId !== undefined) dbPatch.assigned_user_id = patch.assignedUserId || null
  if (patch.status !== undefined) dbPatch.status = patch.status
  if (patch.notes !== undefined) dbPatch.notes = patch.notes
  if (patch.resolvedAt !== undefined) dbPatch.resolved_at = patch.resolvedAt || null

  const { error } = await requireClient().from('delayed_cars').update(dbPatch).eq('id', id)
  if (error) {
    console.error('Failed to update delayed car:', error)
    throw new Error(error.message)
  }
}
