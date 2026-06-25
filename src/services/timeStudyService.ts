import { supabase } from '../lib/supabase'
import type { TimeStudy, TimeStudyCreateInput, TimeStudyReading, TimeStudyStatus } from '../Types/engineering'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

function studyCode(): string {
  const d = new Date()
  const y = d.getFullYear().toString().slice(-2)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const r = Math.floor(Math.random() * 9000 + 1000)
  return `TS-${y}${m}${day}-${r}`
}

type StudyRow = TimeStudy & {
  station_operations?: { operation_name_ar: string } | null
  stations?: { station_name: string } | null
  vehicle_models?: { name: string } | null
}

function mapStudy(r: StudyRow): TimeStudy {
  return {
    id: r.id,
    vehicle_model_id: r.vehicle_model_id,
    station_id: r.station_id,
    operation_id: r.operation_id,
    study_code: r.study_code,
    study_date: r.study_date,
    measurement_scope: (r.measurement_scope as TimeStudy['measurement_scope']) ?? 'operation',
    worker_station_id: r.worker_station_id ?? null,
    subject_label: r.subject_label ?? null,
    measured_by_name: r.measured_by_name ?? null,
    operator_employee_id: r.operator_employee_id,
    observer_employee_id: r.observer_employee_id,
    rating_factor: Number(r.rating_factor),
    allowance_factor: Number(r.allowance_factor),
    takt_time_seconds: r.takt_time_seconds != null ? Number(r.takt_time_seconds) : null,
    average_observed_time_seconds:
      r.average_observed_time_seconds != null ? Number(r.average_observed_time_seconds) : null,
    normal_time_seconds: r.normal_time_seconds != null ? Number(r.normal_time_seconds) : null,
    standard_time_seconds: r.standard_time_seconds != null ? Number(r.standard_time_seconds) : null,
    required_manpower: r.required_manpower != null ? Number(r.required_manpower) : null,
    status: r.status,
    approved_at: r.approved_at,
    notes: r.notes,
    operation_name_ar: r.station_operations?.operation_name_ar,
    station_name: r.stations?.station_name,
    vehicle_model_name: r.vehicle_models?.name ?? undefined
  }
}

export type TimeStudyListFilters = {
  status?: TimeStudyStatus
  operationId?: string
  vehicleModelId?: string
  stationId?: string
}

export async function listTimeStudies(filters: TimeStudyListFilters = {}): Promise<TimeStudy[]> {
  let q = client()
    .from('time_studies')
    .select(
      '*, station_operations(operation_name_ar), stations(station_name), vehicle_models(name)'
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (filters.status) q = q.eq('status', filters.status)
  if (filters.operationId) q = q.eq('operation_id', filters.operationId)
  if (filters.vehicleModelId) q = q.eq('vehicle_model_id', filters.vehicleModelId)
  if (filters.stationId) q = q.eq('station_id', filters.stationId)

  let { data, error } = await q
  if (error) {
    let q2 = client().from('time_studies').select('*').order('created_at', { ascending: false }).limit(200)
    if (filters.status) q2 = q2.eq('status', filters.status)
    if (filters.operationId) q2 = q2.eq('operation_id', filters.operationId)
    if (filters.vehicleModelId) q2 = q2.eq('vehicle_model_id', filters.vehicleModelId)
    if (filters.stationId) q2 = q2.eq('station_id', filters.stationId)
    ;({ data, error } = await q2)
  }
  if (error) throw new Error(error.message)
  return (data ?? []).map(r => mapStudy(r as StudyRow))
}

export async function getTimeStudy(id: string): Promise<TimeStudy | null> {
  const { data, error } = await client()
    .from('time_studies')
    .select(
      '*, station_operations(operation_name_ar), stations(station_name), vehicle_models(name)'
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapStudy(data as StudyRow) : null
}

export async function createTimeStudy(input: TimeStudyCreateInput): Promise<string> {
  const payload: Record<string, unknown> = {
    vehicle_model_id: input.vehicle_model_id ?? null,
    station_id: input.station_id,
    operation_id: input.operation_id,
    study_code: studyCode(),
    study_date: input.study_date ?? new Date().toISOString().slice(0, 10),
    rating_factor: input.rating_factor ?? 1,
    allowance_factor: input.allowance_factor ?? 0.15,
    takt_time_seconds: input.takt_time_seconds ?? null,
    notes: input.notes?.trim() || null,
    status: 'draft',
    measurement_scope: input.measurement_scope ?? 'operation',
    worker_station_id: input.worker_station_id ?? null,
    subject_label: input.subject_label?.trim() || null,
    measured_by_name: input.measured_by_name?.trim() || null
  }

  let { data, error } = await client().from('time_studies').insert(payload).select('id').single()
  if (error?.message.includes('measurement_scope') || error?.message.includes('subject_label')) {
    const {
      measurement_scope: _ms,
      worker_station_id: _ws,
      subject_label: _sl,
      measured_by_name: _mb,
      ...fallback
    } = payload
    ;({ data, error } = await client().from('time_studies').insert(fallback).select('id').single())
  }
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Failed to create time study')
  return data.id
}

export async function updateTimeStudy(
  id: string,
  patch: Partial<{
    vehicle_model_id: string | null
    rating_factor: number
    allowance_factor: number
    takt_time_seconds: number | null
    notes: string
    status: TimeStudyStatus
  }>
): Promise<void> {
  const { error } = await client().from('time_studies').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
  await recalcTimeStudy(id)
}

export async function recalcTimeStudy(id: string): Promise<void> {
  const { error } = await client().rpc('recalc_time_study_metrics', { p_study_id: id })
  if (error) throw new Error(error.message)
}

export async function approveTimeStudy(id: string): Promise<void> {
  const { error } = await client().rpc('approve_time_study', { p_study_id: id })
  if (error) throw new Error(error.message)
}

/** Keep only one reading in the average, then approve the study. */
export async function approveStudyWithReading(studyId: string, readingId: string): Promise<void> {
  const readings = await getTimeStudyReadings(studyId)
  if (!readings.some(r => r.id === readingId)) {
    throw new Error('Reading not found')
  }
  for (const r of readings) {
    const { error } = await client()
      .from('time_study_readings')
      .update({ exclude_from_avg: r.id !== readingId })
      .eq('id', r.id)
    if (error) throw new Error(error.message)
  }
  await recalcTimeStudy(studyId)
  await approveTimeStudy(studyId)
}

export async function getTimeStudyReadings(studyId: string): Promise<TimeStudyReading[]> {
  const { data, error } = await client()
    .from('time_study_readings')
    .select('*')
    .eq('time_study_id', studyId)
    .order('cycle_no')
  if (error) throw new Error(error.message)
  return (data ?? []).map(r => ({
    id: r.id,
    time_study_id: r.time_study_id,
    cycle_no: r.cycle_no,
    observed_time_seconds: Number(r.observed_time_seconds),
    is_outlier: r.is_outlier,
    exclude_from_avg: r.exclude_from_avg,
    outlier_reason: r.outlier_reason,
    notes: r.notes
  }))
}

export async function addTimeStudyReading(
  studyId: string,
  cycleNo: number,
  observedSeconds: number
): Promise<void> {
  if (observedSeconds <= 0) throw new Error('Observed time must be greater than 0')
  const { error } = await client().from('time_study_readings').insert({
    time_study_id: studyId,
    cycle_no: cycleNo,
    observed_time_seconds: observedSeconds
  })
  if (error) throw new Error(error.message)
  await recalcTimeStudy(studyId)
}

export async function setReadingExcluded(id: string, studyId: string, exclude: boolean): Promise<void> {
  const { error } = await client()
    .from('time_study_readings')
    .update({ exclude_from_avg: exclude })
    .eq('id', id)
  if (error) throw new Error(error.message)
  await recalcTimeStudy(studyId)
}

export async function deleteTimeStudyReading(id: string, studyId: string): Promise<void> {
  const { error } = await client().from('time_study_readings').delete().eq('id', id)
  if (error) throw new Error(error.message)
  await recalcTimeStudy(studyId)
}

export async function submitTimeStudyForReview(id: string): Promise<void> {
  await updateTimeStudy(id, { status: 'under_review' })
}

export async function deleteTimeStudy(id: string): Promise<void> {
  const { error } = await client().from('time_studies').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** One reading from Excel import — draft study for later approval. */
export async function createDraftTimeStudyFromImport(params: {
  operationId: string
  stationId: string
  vehicleModelId?: string | null
  observedSeconds: number
  importBatchId?: string
}): Promise<string | null> {
  if (params.observedSeconds <= 0) return null

  let q = client()
    .from('time_studies')
    .select('id')
    .eq('operation_id', params.operationId)
    .eq('status', 'draft')
  if (params.vehicleModelId) q = q.eq('vehicle_model_id', params.vehicleModelId)
  else q = q.is('vehicle_model_id', null)

  const { data: existing } = await q.maybeSingle()
  if (existing?.id) return existing.id

  const id = await createTimeStudy({
    vehicle_model_id: params.vehicleModelId ?? null,
    station_id: params.stationId,
    operation_id: params.operationId,
    notes: params.importBatchId ? `Imported batch ${params.importBatchId}` : 'Imported from operations Excel'
  })
  await addTimeStudyReading(id, 1, params.observedSeconds)
  return id
}
