import { supabase } from '../lib/supabase'
import { normalizeStationNumberForSave } from '../Utils/stationHierarchy'
import type { AppUser, Station, VehicleColor, VehicleModel, WorkArea } from '../Types/settings'

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env')
  }
  return supabase
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    const e = error as { message?: string; code?: string; details?: string }
    if (e.code === '23505') {
      return 'station_duplicate'
    }
    if (typeof e.message === 'string' && e.message.trim()) return e.message
    if (typeof e.details === 'string' && e.details.trim()) return e.details
  }
  return 'Supabase request failed'
}

function handleError(label: string, error: unknown): never {
  console.error(label, error)
  throw new Error(errorMessage(error))
}

// Optional station metadata columns added in migration 0006. Until that
// migration is applied they don't exist, so we detect that case and retry
// without them instead of failing the whole save.
const STATION_EXTRA_COLUMNS = [
  'line_name', 'responsible_department', 'responsible_person', 'station_type', 'station_name_en', 'sort_order',
  'headcount_workers', 'avg_station_time_minutes', 'parent_station_id', 'worker1_operations_summary'
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

function mapVehicleModel(row: Record<string, unknown>, parentName?: string | null): VehicleModel {
  return {
    id: row.id as string,
    name: row.name as string,
    model_kind: (row.model_kind as VehicleModel['model_kind']) ?? 'variant',
    parent_model_id: (row.parent_model_id as string | null) ?? null,
    parent_name: parentName ?? null,
    is_active: Boolean(row.is_active),
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined
  }
}

export async function getVehicleModels(opts?: { includeInactive?: boolean }): Promise<VehicleModel[]> {
  let q = requireClient().from('vehicle_models').select('*').order('name')
  if (!opts?.includeInactive) q = q.eq('is_active', true)
  const { data, error } = await q
  if (error) handleError('Failed to load vehicle models:', error)
  const rows = (data ?? []) as Record<string, unknown>[]
  const nameById = new Map(rows.map(r => [r.id as string, r.name as string]))
  return rows.map(r =>
    mapVehicleModel(r, r.parent_model_id ? nameById.get(r.parent_model_id as string) ?? null : null)
  )
}

export async function createVehicleModel(input: {
  name: string
  model_kind?: VehicleModel['model_kind']
  parent_model_id?: string | null
}): Promise<VehicleModel> {
  const kind = input.model_kind ?? 'variant'
  const payload = {
    name: input.name.trim().toUpperCase(),
    model_kind: kind,
    parent_model_id: kind === 'family' ? null : input.parent_model_id ?? null,
    is_active: true
  }
  const { data, error } = await requireClient().from('vehicle_models').insert(payload).select('*').single()
  if (error) handleError('Failed to create vehicle model:', error)
  const row = data as Record<string, unknown>
  let parent_name: string | null = null
  if (row.parent_model_id) {
    const { data: p } = await requireClient()
      .from('vehicle_models')
      .select('name')
      .eq('id', row.parent_model_id as string)
      .maybeSingle()
    parent_name = p?.name ?? null
  }
  await syncModelFamilyMembership(row.id as string, kind, row.parent_model_id as string | null)
  return mapVehicleModel(row, parent_name)
}

export async function updateVehicleModel(
  id: string,
  input: Partial<Pick<VehicleModel, 'name' | 'is_active' | 'model_kind' | 'parent_model_id'>>
): Promise<VehicleModel> {
  const patch: Record<string, unknown> = { ...input }
  if (typeof patch.name === 'string') patch.name = patch.name.trim().toUpperCase()
  if (patch.model_kind === 'family') patch.parent_model_id = null
  const { data, error } = await requireClient().from('vehicle_models').update(patch).eq('id', id).select('*').single()
  if (error) handleError('Failed to update vehicle model:', error)
  const row = data as Record<string, unknown>
  let parent_name: string | null = null
  if (row.parent_model_id) {
    const { data: p } = await requireClient()
      .from('vehicle_models')
      .select('name')
      .eq('id', row.parent_model_id as string)
      .maybeSingle()
    parent_name = p?.name ?? null
  }
  await syncModelFamilyMembership(id, row.model_kind as VehicleModel['model_kind'], row.parent_model_id as string | null)
  return mapVehicleModel(row, parent_name)
}

async function syncModelFamilyMembership(
  modelId: string,
  kind: VehicleModel['model_kind'],
  parentId: string | null
): Promise<void> {
  if (kind !== 'variant' || !parentId) return
  const { data: parent } = await requireClient().from('vehicle_models').select('name').eq('id', parentId).maybeSingle()
  if (!parent?.name) return
  const code = parent.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
  const { data: fam } = await requireClient()
    .from('vehicle_model_families')
    .upsert(
      { family_code: code, name_ar: parent.name, name_en: parent.name, is_active: true },
      { onConflict: 'family_code' }
    )
    .select('id')
    .single()
  if (!fam?.id) return
  const client = requireClient()
  await client.from('vehicle_model_family_members').delete().eq('vehicle_model_id', modelId)
  await client.from('vehicle_model_family_members').insert({ family_id: fam.id, vehicle_model_id: modelId })
}

export async function deactivateVehicleModel(id: string): Promise<void> {
  const { error } = await requireClient().from('vehicle_models').update({ is_active: false }).eq('id', id)
  if (error) handleError('Failed to deactivate vehicle model:', error)
}

export async function deleteVehicleModel(id: string): Promise<void> {
  const { count, error: childErr } = await requireClient()
    .from('vehicle_models')
    .select('id', { count: 'exact', head: true })
    .eq('parent_model_id', id)
  if (childErr) handleError('Failed to check child models:', childErr)
  if ((count ?? 0) > 0) {
    throw new Error('MODEL_HAS_CHILDREN')
  }
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
    .order('sort_order')
    .order('station_number')
  if (error) handleError('Failed to load stations:', error)
  return (data ?? []) as unknown as Station[]
}

/** كل أرقام المحطات (نشطة وموقوفة) — للتحقق من التكرار */
export async function getAllStationNumbers(): Promise<string[]> {
  const { data, error } = await requireClient().from('stations').select('station_number')
  if (error) handleError('Failed to load station numbers:', error)
  return (data ?? []).map(r => String(r.station_number))
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
  worker1_operations_summary?: string | null
}): Promise<Station> {
  const stationNumber = normalizeStationNumberForSave(input.station_number)
  const payload: Record<string, unknown> = {
    station_number: stationNumber,
    station_name: input.station_name.trim(),
    parent_station_id: input.parent_station_id || null,
    work_area_id: input.work_area_id || null,
    line_name: input.line_name?.trim() || null,
    responsible_department: input.responsible_department || null,
    responsible_person: input.responsible_person?.trim() || null,
    station_type: input.station_type || 'main_line',
    station_name_en: input.station_name_en?.trim() || null,
    sort_order: input.sort_order ?? 0,
    headcount_workers: input.headcount_workers ?? null,
    worker1_operations_summary: input.worker1_operations_summary?.trim() || null,
    is_active: input.is_active ?? true
  }

  let { data, error } = await requireClient().from('stations').insert(payload).select('*').single()
  if (error && isMissingColumnError(error)) {
    ;({ data, error } = await requireClient().from('stations').insert(stripStationExtras(payload)).select('*').single())
  }
  if (error) handleError('Failed to create station:', error)
  return data
}

export async function updateStation(id: string, input: Partial<Pick<Station, 'station_number' | 'station_name' | 'station_name_en' | 'station_type' | 'sort_order' | 'work_area_id' | 'line_name' | 'responsible_department' | 'responsible_person' | 'headcount_workers' | 'avg_station_time_minutes' | 'worker1_operations_summary' | 'is_active' | 'parent_station_id'>>): Promise<Station> {
  const payload = { ...input } as Record<string, unknown>
  if (typeof payload.station_number === 'string') {
    payload.station_number = normalizeStationNumberForSave(payload.station_number)
  }

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

export async function getAllVehicleColors(): Promise<VehicleColor[]> {
  const { data, error } = await requireClient().from('vehicle_colors').select('*').order('name')
  if (error) handleError('Failed to load vehicle colors:', error)
  return data ?? []
}

function colorCodeFromName(name: string, explicit?: string): string {
  const raw = (explicit?.trim() || name.trim()).toLowerCase()
  const slug = raw.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  return slug || `c_${Date.now()}`
}

export async function createVehicleColor(input: { name: string; code?: string; hex_code: string }): Promise<VehicleColor> {
  const { data, error } = await requireClient()
    .from('vehicle_colors')
    .insert({
      name: input.name.trim(),
      code: colorCodeFromName(input.name, input.code),
      hex_code: input.hex_code || '#ffffff',
      is_active: true
    })
    .select('*')
    .single()
  if (error) handleError('Failed to create vehicle color:', error)
  return data
}

export async function updateVehicleColor(
  id: string,
  input: Partial<Pick<VehicleColor, 'name' | 'code' | 'hex_code' | 'is_active'>>
): Promise<VehicleColor> {
  const patch = { ...input }
  if (patch.code !== undefined && patch.code !== null) {
    patch.code = colorCodeFromName(patch.name ?? '', patch.code)
  }
  const { data, error } = await requireClient().from('vehicle_colors').update(patch).eq('id', id).select('*').single()
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
