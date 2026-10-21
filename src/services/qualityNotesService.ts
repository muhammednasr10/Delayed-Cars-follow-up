import { supabase } from '../lib/supabase'
import type {
  QualityNoteInput,
  QualityNoteRecord,
  QualityNoteRepairTime,
  QualityNoteSeverity,
  QualityNoteStudyPatch
} from '../Types/qualityNote'
import { formatStationWorkerDisplayCode } from '../Utils/stationHierarchy'
import { parseQualityNote8D, trimQualityNote8D } from '../Utils/qualityNote8d'

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

type Row = {
  id: string
  vehicle_model_ids: string[] | null
  station_id: string | null
  worker_line_station_id: string | null
  category: string
  severity: string
  repair_time?: string | null
  status: QualityNoteRecord['status']
  description: string
  study_notes: string | null
  study_8d?: unknown
  vehicle_count?: number | string
  vins: string[] | null
  noted_at: string
  created_at: string
  updated_at: string
  stations?:
    | { station_number: string; station_name: string }
    | { station_number: string; station_name: string }[]
    | null
  worker_line?: { station_number: string } | { station_number: string }[] | null
}

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

const SELECT =
  '*, stations!station_id(station_number, station_name), worker_line:stations!worker_line_station_id(station_number)'

function normalizeSeverity(raw: string): QualityNoteSeverity {
  return raw === 'critical' ? 'critical' : 'recurring'
}

function normalizeRepairTime(raw: string | null | undefined): QualityNoteRepairTime {
  if (raw === 'little' || raw === 'medium' || raw === 'much') return raw
  return 'medium'
}

function mapRow(row: Row, modelNameById?: Map<string, string>): QualityNoteRecord {
  const station = relOne(row.stations)
  const workerLine = relOne(row.worker_line)
  const ids = row.vehicle_model_ids ?? []
  const modelNames = ids.map(id => modelNameById?.get(id) ?? id)
  const workerLineRaw = workerLine?.station_number ?? null
  return {
    id: row.id,
    vehicleModelIds: ids,
    modelNames,
    stationId: row.station_id,
    stationCode: station?.station_number ?? null,
    stationName: station?.station_name ?? null,
    workerLineStationId: row.worker_line_station_id,
    workerLineCode: workerLineRaw ? formatStationWorkerDisplayCode(workerLineRaw) : null,
    category: row.category,
    severity: normalizeSeverity(row.severity),
    repairTime: normalizeRepairTime(row.repair_time),
    status: row.status,
    description: row.description,
    studyNotes: row.study_notes,
    study8d: parseQualityNote8D(row.study_8d),
    vins: row.vins ?? [],
    notedAt: row.noted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function toPayload(input: QualityNoteInput) {
  const vins = (input.vins ?? []).map(v => v.trim().toUpperCase()).filter(Boolean)
  return {
    vehicle_model_ids: input.vehicleModelIds,
    station_id: input.stationId,
    worker_line_station_id: input.workerLineStationId || null,
    category: input.category,
    severity: input.severity,
    repair_time: input.repairTime,
    description: input.description.trim(),
    vehicle_count: Math.max(1, vins.length || 1),
    vins,
    noted_at: input.notedAt ?? new Date().toISOString().slice(0, 10)
  }
}

export async function getQualityNotes(modelNameById?: Map<string, string>): Promise<QualityNoteRecord[]> {
  const { data, error } = await requireClient()
    .from('quality_notes')
    .select(SELECT)
    .order('noted_at', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data ?? []) as Row[]).map(r => mapRow(r, modelNameById))
}

export async function createQualityNote(
  input: QualityNoteInput,
  modelNameById?: Map<string, string>
): Promise<QualityNoteRecord> {
  const { data, error } = await requireClient().from('quality_notes').insert(toPayload(input)).select(SELECT).single()
  if (error) throw new Error(error.message)
  return mapRow(data as Row, modelNameById)
}

export async function updateQualityNote(
  id: string,
  input: QualityNoteInput,
  modelNameById?: Map<string, string>
): Promise<QualityNoteRecord> {
  const { data, error } = await requireClient()
    .from('quality_notes')
    .update(toPayload(input))
    .eq('id', id)
    .select(SELECT)
    .single()
  if (error) throw new Error(error.message)
  return mapRow(data as Row, modelNameById)
}

export async function deleteQualityNote(id: string): Promise<void> {
  const { error } = await requireClient().from('quality_notes').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function updateQualityNoteStudy(
  id: string,
  patch: QualityNoteStudyPatch,
  modelNameById?: Map<string, string>
): Promise<QualityNoteRecord> {
  const body: Record<string, unknown> = {
    status: patch.status
  }
  if (patch.studyNotes !== undefined) body.study_notes = patch.studyNotes?.trim() || null
  if (patch.study8d !== undefined) body.study_8d = trimQualityNote8D(patch.study8d)

  const { data, error } = await requireClient()
    .from('quality_notes')
    .update(body)
    .eq('id', id)
    .select(SELECT)
    .single()
  if (error) throw new Error(error.message)
  return mapRow(data as Row, modelNameById)
}
