import { supabase } from '../lib/supabase'
import type { ModelRoutingRow, RoutingClassification } from '../Types/engineering'
import type { TrainingLevel } from '../Types/enums'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

type RouteRow = ModelRoutingRow & {
  station_operations?: { operation_name_ar: string } | null
  stations?: { station_name: string; station_number: string } | null
}

function mapRow(r: RouteRow): ModelRoutingRow {
  return {
    id: r.id,
    vehicle_model_id: r.vehicle_model_id,
    model_family_id: r.model_family_id,
    station_id: r.station_id,
    operation_id: r.operation_id,
    sequence_no: r.sequence_no,
    operation_type: r.operation_type,
    routing_class: r.routing_class,
    required_level: r.required_level,
    required_manpower_count: r.required_manpower_count,
    standard_time_seconds: r.standard_time_seconds != null ? Number(r.standard_time_seconds) : null,
    takt_time_seconds: r.takt_time_seconds != null ? Number(r.takt_time_seconds) : null,
    is_required: r.is_required,
    is_active: r.is_active,
    notes: r.notes,
    operation_name_ar: r.station_operations?.operation_name_ar,
    station_name: r.stations?.station_name,
    station_number: r.stations?.station_number
  }
}

export async function getModelRouting(vehicleModelId: string): Promise<ModelRoutingRow[]> {
  const { data, error } = await client()
    .from('vehicle_model_operations')
    .select('*, station_operations(operation_name_ar), stations(station_name, station_number)')
    .eq('vehicle_model_id', vehicleModelId)
    .eq('is_active', true)
    .order('sequence_no')
  if (error) throw new Error(error.message)
  return (data ?? []).map(r => mapRow(r as RouteRow))
}

export type RoutingUpsertInput = {
  vehicle_model_id: string
  station_id: string
  operation_id: string
  sequence_no: number
  operation_type?: string
  routing_class?: RoutingClassification
  required_level?: TrainingLevel
  required_manpower_count?: number
  standard_time_seconds?: number | null
  takt_time_seconds?: number | null
  is_required?: boolean
  notes?: string
}

export async function upsertModelRouting(input: RoutingUpsertInput): Promise<void> {
  const payload = {
    vehicle_model_id: input.vehicle_model_id,
    station_id: input.station_id,
    operation_id: input.operation_id,
    sequence_no: input.sequence_no,
    operation_type: input.operation_type ?? 'common',
    routing_class: input.routing_class ?? 'model_specific',
    required_level: input.required_level ?? 'level_3',
    required_manpower_count: input.required_manpower_count ?? 1,
    standard_time_seconds: input.standard_time_seconds ?? null,
    takt_time_seconds: input.takt_time_seconds ?? null,
    is_required: input.is_required ?? true,
    notes: input.notes?.trim() || null,
    is_active: true
  }

  const { data: existing, error: findErr } = await client()
    .from('vehicle_model_operations')
    .select('id')
    .eq('vehicle_model_id', input.vehicle_model_id)
    .eq('operation_id', input.operation_id)
    .maybeSingle()
  if (findErr) throw new Error(findErr.message)

  if (existing?.id) {
    const { error } = await client().from('vehicle_model_operations').update(payload).eq('id', existing.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await client().from('vehicle_model_operations').insert(payload)
    if (error) throw new Error(error.message)
  }
}

export async function deactivateModelRouting(id: string): Promise<void> {
  const { error } = await client().from('vehicle_model_operations').update({ is_active: false }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function listOperationsForRouting(search = ''): Promise<
  { id: string; operation_name_ar: string; station_id: string; station_name: string }[]
> {
  let q = client()
    .from('station_operations')
    .select('id, operation_name_ar, station_id, stations(station_name)')
    .eq('is_active', true)
    .order('operation_name_ar')
    .limit(100)
  if (search.trim()) {
    const t = search.trim().replace(/%/g, '')
    q = q.ilike('operation_name_ar', `%${t}%`)
  }
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []).map(r => ({
    id: r.id,
    operation_name_ar: r.operation_name_ar,
    station_id: r.station_id,
    station_name: (r.stations as unknown as { station_name: string } | null)?.station_name ?? ''
  }))
}
