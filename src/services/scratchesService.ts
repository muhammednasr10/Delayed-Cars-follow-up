import { supabase } from '../lib/supabase'
import type { ScratchInput, ScratchRecord, ScratchSeverity } from '../Types/scratch'
import type { MpFollowUpAssignment } from '../Types/mpVehicleActions'

const IMAGE_BUCKET = 'scratches'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

type Row = {
  id: string
  vin: string
  parent_model_id: string | null
  vehicle_model_id: string | null
  body_area: string
  factory_org_unit_id: string | null
  severity: ScratchSeverity
  recorded_at: string
  notes: string | null
  image_path: string | null
  will_stop?: boolean | null
  completing_department?: string | null
  follow_up_employee_id?: string | null
  follow_up_employee_ids?: string[] | null
  resolved_at?: string | null
  created_at: string
  updated_at: string
  parent_model?: { name: string } | { name: string }[] | null
  variant_model?: { name: string } | { name: string }[] | null
  follow_up?: { full_name: string } | { full_name: string }[] | null
}

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export function scratchImageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  const { data } = requireClient().storage.from(IMAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

function mapRow(row: Row): ScratchRecord {
  const parent = relOne(row.parent_model)
  const variant = relOne(row.variant_model)
  const followUp = relOne(row.follow_up)
  return {
    id: row.id,
    vin: row.vin,
    parentModelId: row.parent_model_id,
    parentModelName: parent?.name,
    vehicleModelId: row.vehicle_model_id,
    modelName: variant?.name,
    bodyArea: row.body_area,
    factoryOrgUnitId: row.factory_org_unit_id,
    severity: row.severity,
    recordedAt: row.recorded_at,
    notes: row.notes ?? undefined,
    imagePath: row.image_path,
    imageUrl: scratchImageUrl(row.image_path),
    willStop: Boolean(row.will_stop),
    completingDepartment: row.completing_department ?? null,
    followUpEmployeeId: row.follow_up_employee_id ?? null,
    followUpEmployeeName: followUp?.full_name ?? null,
    followUpEmployeeIds: row.follow_up_employee_ids ?? (row.follow_up_employee_id ? [row.follow_up_employee_id] : []),
    followUpEmployeeNames: null,
    resolvedAt: row.resolved_at ?? null
  }
}

const SELECT_CORE =
  '*, parent_model:vehicle_models!parent_model_id(name), variant_model:vehicle_models!vehicle_model_id(name)'
const SELECT = `${SELECT_CORE}, follow_up:employees!follow_up_employee_id(full_name)`

function toPayload(input: ScratchInput) {
  return {
    vin: input.vin.trim().toUpperCase(),
    parent_model_id: input.parentModelId,
    vehicle_model_id: input.vehicleModelId,
    body_area: input.bodyArea.trim(),
    factory_org_unit_id: input.factoryOrgUnitId || null,
    severity: input.severity,
    recorded_at: input.recordedAt,
    notes: input.notes?.trim() || null,
    will_stop: input.willStop
  }
}

export async function getScratches(): Promise<ScratchRecord[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('scratches')
    .select(SELECT)
    .order('recorded_at', { ascending: false })
    .order('created_at', { ascending: false })
  if (!error) return (data as Row[]).map(mapRow)
  const m = error.message.toLowerCase()
  if (
    m.includes('schema cache') ||
    m.includes('does not exist') ||
    m.includes('will_stop') ||
    m.includes('follow_up') ||
    m.includes('completing_department')
  ) {
    const fallback = await client
      .from('scratches')
      .select(SELECT_CORE)
      .order('recorded_at', { ascending: false })
      .order('created_at', { ascending: false })
    if (fallback.error) throw new Error(fallback.error.message)
    return (fallback.data as Row[]).map(mapRow)
  }
  throw new Error(error.message)
}

export async function createScratch(input: ScratchInput): Promise<ScratchRecord> {
  const { data, error } = await requireClient().from('scratches').insert(toPayload(input)).select(SELECT).single()
  if (error) throw new Error(error.message)
  return mapRow(data as Row)
}

export async function updateScratch(id: string, input: ScratchInput): Promise<ScratchRecord> {
  const { data, error } = await requireClient()
    .from('scratches')
    .update(toPayload(input))
    .eq('id', id)
    .select(SELECT)
    .single()
  if (error) throw new Error(error.message)
  return mapRow(data as Row)
}

export async function assignScratchFollowUp(id: string, assignment: MpFollowUpAssignment): Promise<void> {
  const { error } = await requireClient()
    .from('scratches')
    .update({
      completing_department: assignment.completingDepartment || null,
      follow_up_employee_id: assignment.followUpEmployeeIds?.[0] || assignment.followUpEmployeeId || null,
      follow_up_employee_ids: assignment.followUpEmployeeIds ?? (assignment.followUpEmployeeId ? [assignment.followUpEmployeeId] : [])
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function completeScratch(id: string): Promise<void> {
  const { error } = await requireClient()
    .from('scratches')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function uploadScratchImage(recordId: string, file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) throw new Error('IMAGE_TOO_LARGE')
  const mime = file.type.toLowerCase()
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mime)) {
    throw new Error('IMAGE_INVALID_TYPE')
  }
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : mime === 'image/gif' ? 'gif' : 'jpg'
  const path = `${recordId}/${Date.now()}.${ext}`

  const { error } = await requireClient().storage.from(IMAGE_BUCKET).upload(path, file, {
    upsert: true,
    cacheControl: '3600',
    contentType: mime
  })
  if (error) throw new Error(error.message)

  const { error: updateError } = await requireClient().from('scratches').update({ image_path: path }).eq('id', recordId)
  if (updateError) throw new Error(updateError.message)

  return path
}

export async function deleteScratch(id: string): Promise<void> {
  const { error } = await requireClient().from('scratches').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
