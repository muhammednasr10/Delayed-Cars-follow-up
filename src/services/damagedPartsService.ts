import { supabase } from '../lib/supabase'
import { getBomItems } from './bomService'
import type { DamagedPartInput, DamagedPartRecord, IplPartHit } from '../Types/damagedPart'

const IMAGE_BUCKET = 'damaged-parts'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

type Row = {
  id: string
  vehicle_model_id: string
  part_id: string
  part_number: string
  part_name: string | null
  quantity: number | string
  unit_cost?: number | string | null
  damage_reason: string
  final_decision: string
  is_repairable: boolean
  caused_by_employee_id: string | null
  causing_department: string | null
  image_path: string | null
  notes: string | null
  reported_at: string
  created_at: string
  updated_at: string
  vehicle_models?: { name: string } | { name: string }[] | null
  employees?: { full_name: string } | { full_name: string }[] | null
}

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export function damagedPartImageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  const { data } = requireClient().storage.from(IMAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

function mapRow(row: Row): DamagedPartRecord {
  const model = relOne(row.vehicle_models)
  const employee = relOne(row.employees)
  return {
    id: row.id,
    vehicleModelId: row.vehicle_model_id,
    modelName: model?.name ?? '—',
    partId: row.part_id,
    partNumber: row.part_number,
    partName: row.part_name,
    quantity: Number(row.quantity),
    unitCost: row.unit_cost == null || row.unit_cost === '' ? null : Number(row.unit_cost),
    damageReason: row.damage_reason,
    finalDecision: row.final_decision,
    isRepairable: row.is_repairable,
    causedByEmployeeId: row.caused_by_employee_id,
    causedByName: employee?.full_name ?? null,
    causingDepartment: row.causing_department,
    imagePath: row.image_path,
    imageUrl: damagedPartImageUrl(row.image_path),
    notes: row.notes,
    reportedAt: row.reported_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

const SELECT = '*, vehicle_models(name), employees(full_name)'

function toPayload(input: DamagedPartInput) {
  return {
    vehicle_model_id: input.vehicleModelId,
    part_id: input.partId,
    part_number: input.partNumber.trim(),
    part_name: input.partName?.trim() || null,
    quantity: input.quantity,
    unit_cost: input.unitCost ?? null,
    damage_reason: input.damageReason,
    final_decision: input.finalDecision,
    is_repairable: input.isRepairable ?? false,
    caused_by_employee_id: input.causedByEmployeeId || null,
    causing_department: input.causingDepartment?.trim() || null,
    image_path: input.imagePath || null,
    notes: input.notes?.trim() || null,
    reported_at: input.reportedAt ?? new Date().toISOString().slice(0, 10)
  }
}

export async function getDamagedParts(): Promise<DamagedPartRecord[]> {
  const { data, error } = await requireClient()
    .from('damaged_parts')
    .select(SELECT)
    .order('reported_at', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data ?? []) as Row[]).map(mapRow)
}

export async function createDamagedPart(input: DamagedPartInput): Promise<DamagedPartRecord> {
  const { data, error } = await requireClient().from('damaged_parts').insert(toPayload(input)).select(SELECT).single()
  if (error) throw new Error(error.message)
  return mapRow(data as Row)
}

export async function updateDamagedPart(id: string, input: DamagedPartInput): Promise<DamagedPartRecord> {
  const { data, error } = await requireClient().from('damaged_parts').update(toPayload(input)).eq('id', id).select(SELECT).single()
  if (error) throw new Error(error.message)
  return mapRow(data as Row)
}

export async function updateDamagedPartRepairable(id: string, isRepairable: boolean): Promise<void> {
  const { error } = await requireClient().from('damaged_parts').update({ is_repairable: isRepairable }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteDamagedPart(id: string): Promise<void> {
  const { error } = await requireClient().from('damaged_parts').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function uploadDamagedPartImage(recordId: string, file: File): Promise<string> {
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

  const { error: updateError } = await requireClient().from('damaged_parts').update({ image_path: path }).eq('id', recordId)
  if (updateError) throw new Error(updateError.message)

  return path
}

export async function searchIplPartsForModel(
  modelId: string,
  modelName: string,
  term: string,
  limit = 20
): Promise<IplPartHit[]> {
  const q = term.trim()
  if (!modelId || !q) return []

  const { items } = await getBomItems({
    vehicleModelId: modelId,
    search: q,
    page: 1,
    pageSize: limit
  })

  let hits = items.map(item => ({
    partId: item.part_id,
    partNumber: item.part_number,
    partName: item.part_name_ar ?? item.part_name,
    stationCode: item.station_code_text
  }))

  if (hits.length === 0) {
    const fallback = await getBomItems({
      modelName,
      search: q,
      page: 1,
      pageSize: limit
    })
    hits = fallback.items.map(item => ({
      partId: item.part_id,
      partNumber: item.part_number,
      partName: item.part_name_ar ?? item.part_name,
      stationCode: item.station_code_text
    }))
  }

  const seen = new Set<string>()
  const out: IplPartHit[] = []
  for (const hit of hits) {
    if (seen.has(hit.partId)) continue
    seen.add(hit.partId)
    out.push(hit)
  }
  return out
}
