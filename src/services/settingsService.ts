import { supabase } from '../lib/supabase'
import type { AppUser, Station, VehicleColor, VehicleModel, WorkArea } from '../Types/settings'

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env')
  }
  return supabase
}

function handleError(label: string, error: unknown): never {
  console.error(label, error)
  const message = error instanceof Error ? error.message : 'Supabase request failed'
  throw new Error(message)
}

// Optional station metadata columns added in migration 0006. Until that
// migration is applied they don't exist, so we detect that case and retry
// without them instead of failing the whole save.
const STATION_EXTRA_COLUMNS = [
  'line_name', 'responsible_department', 'responsible_person', 'station_type', 'station_name_en', 'sort_order',
  'headcount_workers', 'avg_station_time_minutes', 'parent_station_id'
]

function isMissingColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const msg = (error.message || '').toLowerCase()
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    STATION_EXTRA_COLUMNS.some(c => msg.includes(c)) ||
    (msg.includes('column') && msg.includes('does not exist')) ||
    (msg.includes('could not find') && msg.includes('column'))
  )
}

function stripStationExtras<T extends Record<string, unknown>>(payload: T): T {
  const copy = { ...payload }
  for (const c of STATION_EXTRA_COLUMNS) delete copy[c]
  return copy
}

export async function getVehicleModels(): Promise<VehicleModel[]> {
  const { data, error } = await requireClient().from('vehicle_models').select('*').eq('is_active', true).order('name')
  if (error) handleError('Failed to load vehicle models:', error)
  return data ?? []
}

export async function createVehicleModel(input: { name: string }): Promise<VehicleModel> {
  const { data, error } = await requireClient()
    .from('vehicle_models')
    .insert({ name: input.name.trim(), is_active: true })
    .select('*')
    .single()
  if (error) handleError('Failed to create vehicle model:', error)
  return data
}

export async function updateVehicleModel(id: string, input: Partial<Pick<VehicleModel, 'name' | 'is_active'>>): Promise<VehicleModel> {
  const { data, error } = await requireClient().from('vehicle_models').update(input).eq('id', id).select('*').single()
  if (error) handleError('Failed to update vehicle model:', error)
  return data
}

export async function deactivateVehicleModel(id: string): Promise<void> {
  const { error } = await requireClient().from('vehicle_models').update({ is_active: false }).eq('id', id)
  if (error) handleError('Failed to deactivate vehicle model:', error)
}

export async function deleteVehicleModel(id: string): Promise<void> {
  const { error } = await requireClient().from('vehicle_models').delete().eq('id', id)
  if (error) handleError('Failed to delete vehicle model:', error)
}

export async function getWorkAreas(): Promise<WorkArea[]> {
  const { data, error } = await requireClient().from('work_areas').select('*').eq('is_active', true).order('name')
  if (error) handleError('Failed to load work areas:', error)
  return data ?? []
}

export async function createWorkArea(input: { name: string; description?: string }): Promise<WorkArea> {
  const { data, error } = await requireClient()
    .from('work_areas')
    .insert({ name: input.name.trim(), description: input.description?.trim() || null, is_active: true })
    .select('*')
    .single()
  if (error) handleError('Failed to create work area:', error)
  return data
}

export async function updateWorkArea(id: string, input: Partial<Pick<WorkArea, 'name' | 'description' | 'is_active'>>): Promise<WorkArea> {
  const { data, error } = await requireClient().from('work_areas').update(input).eq('id', id).select('*').single()
  if (error) handleError('Failed to update work area:', error)
  return data
}

export async function deactivateWorkArea(id: string): Promise<void> {
  const { error } = await requireClient().from('work_areas').update({ is_active: false }).eq('id', id)
  if (error) handleError('Failed to deactivate work area:', error)
}

export async function deleteWorkArea(id: string): Promise<void> {
  const { error } = await requireClient().from('work_areas').delete().eq('id', id)
  if (error) handleError('Failed to delete work area:', error)
}

export async function getStations(): Promise<Station[]> {
  const { data, error } = await requireClient()
    .from('stations')
    .select('*, work_areas(id, name)')
    .eq('is_active', true)
    .order('station_number')
  if (error) handleError('Failed to load stations:', error)
  return (data ?? []) as unknown as Station[]
}

export async function createStation(input: {
  station_number: string
  station_name: string
  parent_station_id?: string | null
  work_area_id?: string | null
  line_name?: string | null
  responsible_department?: string | null
  responsible_person?: string | null
  is_active?: boolean
  station_type?: string | null
  station_name_en?: string | null
  sort_order?: number | null
  headcount_workers?: number | null
  avg_station_time_minutes?: number | null
}): Promise<Station> {
  const payload: Record<string, unknown> = {
    station_number: input.station_number.trim(),
    station_name: input.station_name.trim(),
    parent_station_id: input.parent_station_id || null,
    work_area_id: input.work_area_id || null,
    line_name: input.line_name?.trim() || null,
    responsible_department: input.responsible_department || null,
    responsible_person: input.responsible_person?.trim() || null,
    station_type: input.station_type || 'main_line',
    station_name_en: input.station_name_en?.trim() || null,
    sort_order: input.sort_order ?? 0,
    is_active: input.is_active ?? true
  }

  let { data, error } = await requireClient().from('stations').insert(payload).select('*').single()
  if (error && isMissingColumnError(error)) {
    ;({ data, error } = await requireClient().from('stations').insert(stripStationExtras(payload)).select('*').single())
  }
  if (error) handleError('Failed to create station:', error)
  return data
}

export async function updateStation(id: string, input: Partial<Pick<Station, 'station_number' | 'station_name' | 'station_name_en' | 'station_type' | 'sort_order' | 'work_area_id' | 'line_name' | 'responsible_department' | 'responsible_person' | 'headcount_workers' | 'avg_station_time_minutes' | 'worker1_operations_summary' | 'is_active'>>): Promise<Station> {
  const payload = input as Record<string, unknown>

  let { data, error } = await requireClient().from('stations').update(payload).eq('id', id).select('*').single()
  if (error && isMissingColumnError(error)) {
    ;({ data, error } = await requireClient().from('stations').update(stripStationExtras(payload)).eq('id', id).select('*').single())
  }
  if (error) handleError('Failed to update station:', error)
  return data
}

export async function deactivateStation(id: string): Promise<void> {
  const { error } = await requireClient().from('stations').update({ is_active: false }).eq('id', id)
  if (error) handleError('Failed to deactivate station:', error)
}

export async function deleteStation(id: string): Promise<void> {
  const { error } = await requireClient().from('stations').delete().eq('id', id)
  if (error) handleError('Failed to delete station:', error)
}

export async function getVehicleColors(): Promise<VehicleColor[]> {
  const { data, error } = await requireClient().from('vehicle_colors').select('*').eq('is_active', true).order('name')
  if (error) handleError('Failed to load vehicle colors:', error)
  return data ?? []
}

export async function createVehicleColor(input: { name: string; hex_code: string }): Promise<VehicleColor> {
  const { data, error } = await requireClient()
    .from('vehicle_colors')
    .insert({ name: input.name.trim(), hex_code: input.hex_code || '#ffffff', is_active: true })
    .select('*')
    .single()
  if (error) handleError('Failed to create vehicle color:', error)
  return data
}

export async function updateVehicleColor(id: string, input: Partial<Pick<VehicleColor, 'name' | 'hex_code' | 'is_active'>>): Promise<VehicleColor> {
  const { data, error } = await requireClient().from('vehicle_colors').update(input).eq('id', id).select('*').single()
  if (error) handleError('Failed to update vehicle color:', error)
  return data
}

export async function deactivateVehicleColor(id: string): Promise<void> {
  const { error } = await requireClient().from('vehicle_colors').update({ is_active: false }).eq('id', id)
  if (error) handleError('Failed to deactivate vehicle color:', error)
}

export async function deleteVehicleColor(id: string): Promise<void> {
  const { error } = await requireClient().from('vehicle_colors').delete().eq('id', id)
  if (error) handleError('Failed to delete vehicle color:', error)
}

export async function getAppUsers(): Promise<AppUser[]> {
  const { data, error } = await requireClient().from('app_users').select('*').eq('is_active', true).order('name')
  if (error) handleError('Failed to load app users:', error)
  return data ?? []
}

export async function createAppUser(input: { name: string; email?: string; role: string }): Promise<AppUser> {
  const { data, error } = await requireClient()
    .from('app_users')
    .insert({ name: input.name.trim(), email: input.email?.trim() || null, role: input.role, is_active: true })
    .select('*')
    .single()
  if (error) handleError('Failed to create app user:', error)
  return data
}

export async function updateAppUser(id: string, input: Partial<Pick<AppUser, 'name' | 'email' | 'role' | 'is_active'>>): Promise<AppUser> {
  const { data, error } = await requireClient().from('app_users').update(input).eq('id', id).select('*').single()
  if (error) handleError('Failed to update app user:', error)
  return data
}

export async function deactivateAppUser(id: string): Promise<void> {
  const { error } = await requireClient().from('app_users').update({ is_active: false }).eq('id', id)
  if (error) handleError('Failed to deactivate app user:', error)
}

export async function deleteAppUser(id: string): Promise<void> {
  const { error } = await requireClient().from('app_users').delete().eq('id', id)
  if (error) handleError('Failed to delete app user:', error)
}
