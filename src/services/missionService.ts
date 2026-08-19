import { supabase } from '../lib/supabase'
import type { MissionPerson, ShortageMissionLink, TeamMission, TeamMissionInput } from '../Types/mission'

export { getTeamMissionResponses, respondMyTeamMission } from './missionResponseService'

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

type AssigneeRow = {
  employee_id: string
  employees?: { full_name: string; employee_code: string } | { full_name: string; employee_code: string }[] | null
}

type Row = {
  id: string
  title: string
  description: string | null
  assignee_id: string
  status: TeamMission['status']
  priority: TeamMission['priority']
  due_date: string | null
  recurrence_type?: TeamMission['recurrenceType']
  recurrence_custom?: string | null
  recurrence_series_id?: string | null
  completed_at: string | null
  notes: string | null
  created_by_employee_id?: string | null
  created_by_name?: string | null
  source_vehicle_id?: string | null
  source_missing_part_id?: string | null
  source_scratch_id?: string | null
  source_vin?: string | null
  source_model_name?: string | null
  created_at: string
  updated_at: string
  assignee?: { full_name: string; employee_code: string } | { full_name: string; employee_code: string }[] | null
  team_mission_assignees?: AssigneeRow[] | null
  team_mission_responses?: { count: number }[] | null
}

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function relCount(value: { count?: number }[] | null | undefined): number {
  if (!value?.length) return 0
  const n = Number(value[0]?.count ?? 0)
  return Number.isFinite(n) ? n : 0
}

function mapAssignees(rows: AssigneeRow[] | null | undefined): MissionPerson[] {
  if (!rows?.length) return []
  return rows.map(r => {
    const emp = relOne(r.employees)
    return {
      id: r.employee_id,
      name: emp?.full_name ?? '—',
      code: emp?.employee_code ?? '—'
    }
  })
}

function mapRow(row: Row): TeamMission {
  const assignees = mapAssignees(row.team_mission_assignees)
  const primary = assignees[0]
  const emp = relOne(row.assignee)
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    assigneeId: primary?.id ?? row.assignee_id,
    assigneeName: primary?.name ?? emp?.full_name ?? '—',
    assigneeCode: primary?.code ?? emp?.employee_code ?? '—',
    assigneeIds: assignees.length > 0 ? assignees.map(a => a.id) : [row.assignee_id],
    assignees:
      assignees.length > 0
        ? assignees
        : [{ id: row.assignee_id, name: emp?.full_name ?? '—', code: emp?.employee_code ?? '—' }],
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    recurrenceType: row.recurrence_type ?? 'none',
    recurrenceCustom: row.recurrence_custom ?? null,
    recurrenceSeriesId: row.recurrence_series_id ?? row.id,
    completedAt: row.completed_at,
    notes: row.notes,
    responseCount: relCount(row.team_mission_responses),
    createdByEmployeeId: row.created_by_employee_id ?? null,
    createdByName: row.created_by_name ?? null,
    sourceVehicleId: row.source_vehicle_id ?? null,
    sourceMissingPartId: row.source_missing_part_id ?? null,
    sourceScratchId: row.source_scratch_id ?? null,
    sourceVin: row.source_vin ?? null,
    sourceModelName: row.source_model_name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function toPayload(input: TeamMissionInput) {
  const firstId = input.assigneeIds[0]
  if (!firstId) throw new Error('ASSIGNEES_REQUIRED')
  const payload: Record<string, unknown> = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    assignee_id: firstId,
    status: input.status,
    priority: input.priority,
    due_date: input.dueDate || null,
    recurrence_type: input.recurrenceType ?? 'none',
    recurrence_custom: input.recurrenceCustom?.trim() || null,
    notes: input.notes?.trim() || null
  }
  if (input.sourceVehicleId !== undefined || input.sourceScratchId !== undefined) {
    payload.source_vehicle_id = input.sourceVehicleId || null
    payload.source_missing_part_id = input.sourceMissingPartId || null
    payload.source_scratch_id = input.sourceScratchId || null
    payload.source_vin = input.sourceVin?.trim() || null
    payload.source_model_name = input.sourceModelName?.trim() || null
  }
  return payload
}

const SELECT = `
  *,
  assignee:employees!team_missions_assignee_id_fkey(full_name, employee_code),
  team_mission_assignees(
    employee_id,
    employees!team_mission_assignees_employee_id_fkey(full_name, employee_code)
  ),
  team_mission_responses(count)
`

async function syncAssignees(missionId: string, assigneeIds: string[]): Promise<void> {
  const { error } = await requireClient().rpc('sync_team_mission_assignees', {
    p_mission_id: missionId,
    p_assignee_ids: assigneeIds
  })
  if (error) {
    if (error.message?.includes('ASSIGNEE_NOT_SUBORDINATE')) throw new Error('ASSIGNEE_NOT_SUBORDINATE')
    if (error.message?.includes('ASSIGNEES_REQUIRED')) throw new Error('ASSIGNEES_REQUIRED')
    throw new Error(error.message)
  }
}

async function spawnDueRecurringMissions(): Promise<void> {
  const { error } = await requireClient().rpc('spawn_due_recurring_missions')
  if (!error) return
  const code = error.code ?? ''
  const msg = error.message ?? ''
  if (code === 'PGRST202' || code === '42883' || /spawn_due_recurring_missions/i.test(msg)) return
}

export async function getTeamMissions(): Promise<TeamMission[]> {
  await spawnDueRecurringMissions()
  const { data, error } = await requireClient()
    .from('team_missions')
    .select(SELECT)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data ?? []) as Row[]).map(mapRow)
}

export async function listOpenShortageMissions(vehicleIds: string[]): Promise<ShortageMissionLink[]> {
  const ids = [...new Set(vehicleIds.filter(Boolean))]
  if (ids.length === 0) return []
  const out: ShortageMissionLink[] = []
  const chunkSize = 200
  for (let i = 0; i < ids.length; i += chunkSize) {
    const slice = ids.slice(i, i + chunkSize)
    const { data, error } = await requireClient()
      .from('team_missions')
      .select('id, title, status, source_vehicle_id, source_missing_part_id, source_vin')
      .in('source_vehicle_id', slice)
      .in('status', ['pending', 'in_progress'])
    if (error) {
      const m = error.message.toLowerCase()
      if (m.includes('schema cache') || m.includes('does not exist') || m.includes('source_vehicle')) return []
      throw new Error(error.message)
    }
    for (const row of (data ?? []) as {
      id: string
      title: string
      status: ShortageMissionLink['status']
      source_vehicle_id: string | null
      source_missing_part_id: string | null
      source_vin: string | null
    }[]) {
      out.push({
        id: row.id,
        title: row.title,
        status: row.status,
        sourceVehicleId: row.source_vehicle_id,
        sourceMissingPartId: row.source_missing_part_id,
        sourceScratchId: null,
        sourceVin: row.source_vin
      })
    }
  }
  return out
}

export async function listOpenScratchMissions(scratchIds: string[], vins: string[]): Promise<ShortageMissionLink[]> {
  const ids = [...new Set(scratchIds.filter(Boolean))]
  const vinList = [...new Set(vins.map(v => v.trim()).filter(Boolean))]
  if (ids.length === 0 && vinList.length === 0) return []
  const seen = new Set<string>()
  const out: ShortageMissionLink[] = []

  async function pull(column: 'source_scratch_id' | 'source_vin', values: string[]) {
    if (values.length === 0) return
    const { data, error } = await requireClient()
      .from('team_missions')
      .select('id, title, status, source_vehicle_id, source_missing_part_id, source_scratch_id, source_vin')
      .in(column, values)
      .in('status', ['pending', 'in_progress'])
    if (error) {
      const m = error.message.toLowerCase()
      if (m.includes('schema cache') || m.includes('does not exist') || m.includes('source_')) return
      throw new Error(error.message)
    }
    for (const row of (data ?? []) as {
      id: string
      title: string
      status: ShortageMissionLink['status']
      source_vehicle_id: string | null
      source_missing_part_id: string | null
      source_scratch_id?: string | null
      source_vin: string | null
    }[]) {
      if (seen.has(row.id)) continue
      seen.add(row.id)
      out.push({
        id: row.id,
        title: row.title,
        status: row.status,
        sourceVehicleId: row.source_vehicle_id,
        sourceMissingPartId: row.source_missing_part_id,
        sourceScratchId: row.source_scratch_id ?? null,
        sourceVin: row.source_vin
      })
    }
  }

  await pull('source_scratch_id', ids)
  await pull('source_vin', vinList)
  return out
}

export async function createTeamMission(input: TeamMissionInput): Promise<TeamMission> {
  if (!input.assigneeIds.length) throw new Error('ASSIGNEES_REQUIRED')
  const { data, error } = await requireClient().from('team_missions').insert(toPayload(input)).select('id').single()
  if (error) throw new Error(error.message)
  const id = (data as { id: string }).id
  await syncAssignees(id, input.assigneeIds)
  const { data: full, error: loadErr } = await requireClient()
    .from('team_missions')
    .select(SELECT)
    .eq('id', id)
    .single()
  if (loadErr) throw new Error(loadErr.message)
  return mapRow(full as Row)
}

export async function updateTeamMission(id: string, input: TeamMissionInput): Promise<TeamMission> {
  if (!input.assigneeIds.length) throw new Error('ASSIGNEES_REQUIRED')
  const { error } = await requireClient().from('team_missions').update(toPayload(input)).eq('id', id)
  if (error) throw new Error(error.message)
  await syncAssignees(id, input.assigneeIds)
  const { data, error: loadErr } = await requireClient().from('team_missions').select(SELECT).eq('id', id).single()
  if (loadErr) throw new Error(loadErr.message)
  return mapRow(data as Row)
}

export async function updateTeamMissionStatus(id: string, status: TeamMission['status']): Promise<TeamMission> {
  const { data, error } = await requireClient()
    .from('team_missions')
    .update({ status })
    .eq('id', id)
    .select(SELECT)
    .single()
  if (error) throw new Error(error.message)
  return mapRow(data as Row)
}

export async function updateMyTeamMissionStatus(id: string, status: TeamMission['status']): Promise<void> {
  const { error } = await requireClient().rpc('update_my_team_mission_status', {
    p_mission_id: id,
    p_status: status
  })
  if (error) {
    if (error.message?.includes('NO_EMPLOYEE_LINK')) throw new Error('NO_EMPLOYEE_LINK')
    if (error.message?.includes('MISSION_NOT_FOUND')) throw new Error('MISSION_NOT_FOUND')
    throw new Error(error.message)
  }
}

export async function delegateMyTeamMission(missionId: string, assigneeIds: string[]): Promise<void> {
  if (!assigneeIds.length) throw new Error('ASSIGNEES_REQUIRED')
  const { error } = await requireClient().rpc('delegate_my_team_mission', {
    p_mission_id: missionId,
    p_assignee_ids: assigneeIds
  })
  if (error) {
    if (error.message?.includes('ASSIGNEE_NOT_SUBORDINATE')) throw new Error('ASSIGNEE_NOT_SUBORDINATE')
    if (error.message?.includes('ASSIGNEES_REQUIRED')) throw new Error('ASSIGNEES_REQUIRED')
    if (error.message?.includes('MISSION_NOT_ASSIGNEE')) throw new Error('MISSION_NOT_ASSIGNEE')
    if (error.message?.includes('NO_EMPLOYEE_LINK')) throw new Error('NO_EMPLOYEE_LINK')
    if (error.message?.includes('MISSION_NOT_FOUND')) throw new Error('MISSION_NOT_FOUND')
    throw new Error(error.message)
  }
}

export function teamMissionToInput(mission: TeamMission): TeamMissionInput {
  return {
    title: mission.title,
    description: mission.description ?? undefined,
    assigneeIds: mission.assigneeIds,
    status: mission.status,
    priority: mission.priority,
    dueDate: mission.dueDate,
    recurrenceType: mission.recurrenceType,
    recurrenceCustom: mission.recurrenceCustom,
    notes: mission.notes ?? undefined
  }
}

export async function reassignTeamMission(mission: TeamMission, assigneeIds: string[]): Promise<void> {
  if (!assigneeIds.length) throw new Error('ASSIGNEES_REQUIRED')
  await updateTeamMission(mission.id, { ...teamMissionToInput(mission), assigneeIds })
}

export async function deleteTeamMission(id: string): Promise<void> {
  const { error } = await requireClient().from('team_missions').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
