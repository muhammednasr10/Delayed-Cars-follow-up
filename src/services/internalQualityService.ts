import { supabase } from '../lib/supabase'
import type { InternalQualityIssue, InternalQualityIssueInput, InternalQualityStudyPatch } from '../Types/internalQuality'
import { parseQualityNote8D, trimQualityNote8D } from '../Utils/qualityNote8d'

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

type Row = {
  id: string
  problem_type: string
  problem: string
  reporting_workshop: string
  vehicle_model_ids?: string[] | null
  first_reported_at: string
  status?: InternalQualityIssue['status'] | null
  study_notes: string | null
  study_8d?: unknown
  study_count?: number | null
  last_study_at?: string | null
  created_at: string
  updated_at: string
}

function mapRow(row: Row): InternalQualityIssue {
  return {
    id: row.id,
    problemType: row.problem_type,
    problem: row.problem,
    reportingWorkshop: row.reporting_workshop,
    vehicleModelIds: row.vehicle_model_ids ?? [],
    firstReportedAt: row.first_reported_at,
    status: row.status === 'under_study' || row.status === 'closed' ? row.status : 'open',
    studyNotes: row.study_notes || '',
    study8d: parseQualityNote8D(row.study_8d),
    studyCount: row.study_count ?? 0,
    lastStudyAt: row.last_study_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

const SELECT =
  'id, problem_type, problem, reporting_workshop, vehicle_model_ids, first_reported_at, status, study_notes, study_8d, study_count, last_study_at, created_at, updated_at'
const SELECT_NO_COUNT =
  'id, problem_type, problem, reporting_workshop, vehicle_model_ids, first_reported_at, status, study_notes, study_8d, created_at, updated_at'
const SELECT_NO_8D =
  'id, problem_type, problem, reporting_workshop, vehicle_model_ids, first_reported_at, study_notes, created_at, updated_at'
const SELECT_BASIC =
  'id, problem_type, problem, reporting_workshop, first_reported_at, study_notes, created_at, updated_at'

function isMissingCol(message: string, column: string): boolean {
  return new RegExp(column, 'i').test(message) && /schema cache|does not exist|Could not find|42703/i.test(message)
}

export function isMissingInternalQualityTable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return (
    /internal_quality_issues/i.test(msg) &&
    /does not exist|schema cache|42P01|PGRST205|Could not find/i.test(msg)
  )
}

export async function getInternalQualityIssues(): Promise<InternalQualityIssue[]> {
  const db = requireClient()
  let data: Row[] | null = null
  let error: { message: string } | null = null
  {
    const res = await db
      .from('internal_quality_issues')
      .select(SELECT)
      .order('updated_at', { ascending: false })
    data = (res.data ?? null) as Row[] | null
    error = res.error
  }
  if (error && (isMissingCol(error.message, 'study_count') || isMissingCol(error.message, 'last_study_at'))) {
    const res = await db
      .from('internal_quality_issues')
      .select(SELECT_NO_COUNT)
      .order('updated_at', { ascending: false })
    data = (res.data ?? null) as Row[] | null
    error = res.error
  }
  if (error && (isMissingCol(error.message, 'study_8d') || isMissingCol(error.message, 'status'))) {
    const res = await db
      .from('internal_quality_issues')
      .select(SELECT_NO_8D)
      .order('updated_at', { ascending: false })
    data = (res.data ?? null) as Row[] | null
    error = res.error
  }
  if (error && isMissingCol(error.message, 'vehicle_model_ids')) {
    const res = await db
      .from('internal_quality_issues')
      .select(SELECT_BASIC)
      .order('updated_at', { ascending: false })
    data = (res.data ?? null) as Row[] | null
    error = res.error
  }
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapRow)
}

function toPayload(input: InternalQualityIssueInput, includeModels: boolean) {
  const row: Record<string, unknown> = {
    problem_type: input.problemType.trim(),
    problem: input.problem.trim(),
    reporting_workshop: input.reportingWorkshop.trim(),
    first_reported_at: input.firstReportedAt
  }
  if (includeModels) row.vehicle_model_ids = input.vehicleModelIds
  return row
}

async function writeIssue(
  input: InternalQualityIssueInput,
  write: (
    payload: Record<string, unknown>,
    select: string
  ) => Promise<{ data: Row | null; error: { message: string } | null }>
): Promise<InternalQualityIssue> {
  let { data, error } = await write(toPayload(input, true), SELECT)
  if (error && (isMissingCol(error.message, 'study_count') || isMissingCol(error.message, 'last_study_at'))) {
    ;({ data, error } = await write(toPayload(input, true), SELECT_NO_COUNT))
  }
  if (error && (isMissingCol(error.message, 'study_8d') || isMissingCol(error.message, 'status'))) {
    ;({ data, error } = await write(toPayload(input, true), SELECT_NO_8D))
  }
  if (error && isMissingCol(error.message, 'vehicle_model_ids')) {
    ;({ data, error } = await write(toPayload(input, false), SELECT_BASIC))
  }
  if (error || !data) throw new Error(error?.message || 'save failed')
  return mapRow(data)
}

export async function createInternalQualityIssue(
  input: InternalQualityIssueInput
): Promise<InternalQualityIssue> {
  const db = requireClient()
  const row = await writeIssue(input, async (payload, select) =>
    db.from('internal_quality_issues').insert(payload).select(select).single()
  )
  const { tryCreateAutoRoutedMission } = await import('./missionAutoRouteService')
  const { internalQualityMissionTitle } = await import('../Utils/missionAutoRouteTitles')
  await tryCreateAutoRoutedMission({
    eventType: 'internal_quality',
    title: internalQualityMissionTitle(row.problem),
    description: [row.problemType, row.problem, row.reportingWorkshop].filter(Boolean).join('\n'),
    sourceInternalQualityId: row.id
  })
  return row
}

export async function updateInternalQualityIssue(
  id: string,
  input: InternalQualityIssueInput
): Promise<InternalQualityIssue> {
  const db = requireClient()
  return writeIssue(input, async (payload, select) =>
    db.from('internal_quality_issues').update(payload).eq('id', id).select(select).single()
  )
}

export async function updateInternalQualityStudy(
  id: string,
  patch: InternalQualityStudyPatch
): Promise<void> {
  const db = requireClient()
  const full = {
    status: patch.status,
    study_notes: patch.studyNotes.trim(),
    study_8d: trimQualityNote8D(patch.study8d),
    study_count: patch.studyCount,
    last_study_at: patch.lastStudyAt
  }
  let { error } = await db.from('internal_quality_issues').update(full).eq('id', id)
  if (error && (isMissingCol(error.message, 'study_count') || isMissingCol(error.message, 'last_study_at'))) {
    const { study_count: _c, last_study_at: _d, ...withoutCount } = full
    ;({ error } = await db.from('internal_quality_issues').update(withoutCount).eq('id', id))
  }
  if (error && (isMissingCol(error.message, 'study_8d') || isMissingCol(error.message, 'status'))) {
    ;({ error } = await db
      .from('internal_quality_issues')
      .update({ study_notes: patch.studyNotes.trim() })
      .eq('id', id))
  }
  if (error) throw new Error(error.message)
}

export async function deleteInternalQualityIssue(id: string): Promise<void> {
  const { error } = await requireClient().from('internal_quality_issues').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
