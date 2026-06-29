import { supabase } from '../lib/supabase'
import type { QualityNoteInput, QualityNoteRecord, QualityNoteStudyPatch } from '../Types/qualityNote'
import { formatStationWorkerDisplayCode } from '../Utils/stationHierarchy'

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
  severity: QualityNoteRecord['severity']
  status: QualityNoteRecord['status']
  description: string
  study_notes: string | null
  vehicle_count: number | string
  vins: string[] | null
  noted_at: string
  created_at: string
  updated_at: string
  stations?: { station_number: string; station_name: string } | { station_number: string; station_name: string }[] | null
  worker_line?: { station_number: string } | { station_number: string }[] | null
}

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

const SELECT =
  '*, stations!station_id(station_number, station_name), worker_line:stations!worker_line_station_id(station_number)'

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
    severity: row.severity,
    status: row.status,
    description: row.description,
    studyNotes: row.study_notes,
    vehicleCount: Number(row.vehicle_count) || 1,
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
    description: input.description.trim(),
    vehicle_count: input.vehicleCount,
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
  const { data, error } = await requireClient()
    .from('quality_notes')
    .update({
      status: patch.status,
      study_notes: patch.studyNotes?.trim() || null
    })
    .eq('id', id)
    .select(SELECT)
    .single()
  if (error) throw new Error(error.message)
  return mapRow(data as Row, modelNameById)
}
