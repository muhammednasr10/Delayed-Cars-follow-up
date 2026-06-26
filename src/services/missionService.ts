import { supabase } from '../lib/supabase'
import type { MissionPerson, TeamMission, TeamMissionInput } from '../Types/mission'

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
  completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  employees?: { full_name: string; employee_code: string } | { full_name: string; employee_code: string }[] | null
  team_mission_assignees?: AssigneeRow[] | null
}

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? value[0] ?? null : value
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
  const emp = relOne(row.employees)
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    assigneeId: primary?.id ?? row.assignee_id,
    assigneeName: primary?.name ?? emp?.full_name ?? '—',
    assigneeCode: primary?.code ?? emp?.employee_code ?? '—',
    assigneeIds: assignees.length > 0 ? assignees.map(a => a.id) : [row.assignee_id],
    assignees: assignees.length > 0 ? assignees : [{ id: row.assignee_id, name: emp?.full_name ?? '—', code: emp?.employee_code ?? '—' }],
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function toPayload(input: TeamMissionInput) {
  const firstId = input.assigneeIds[0]
  if (!firstId) throw new Error('ASSIGNEES_REQUIRED')
  return {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    assignee_id: firstId,
    status: input.status,
    priority: input.priority,
    due_date: input.dueDate || null,
    notes: input.notes?.trim() || null
  }
}

const SELECT = `
  *,
  employees(full_name, employee_code),
  team_mission_assignees(
    employee_id,
    employees(full_name, employee_code)
  )
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

export async function getTeamMissions(): Promise<TeamMission[]> {
  const { data, error } = await requireClient()
    .from('team_missions')
    .select(SELECT)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data ?? []) as Row[]).map(mapRow)
}

export async function createTeamMission(input: TeamMissionInput): Promise<TeamMission> {
  if (!input.assigneeIds.length) throw new Error('ASSIGNEES_REQUIRED')
  const { data, error } = await requireClient().from('team_missions').insert(toPayload(input)).select('id').single()
  if (error) throw new Error(error.message)
  const id = (data as { id: string }).id
  await syncAssignees(id, input.assigneeIds)
  const { data: full, error: loadErr } = await requireClient().from('team_missions').select(SELECT).eq('id', id).single()
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

export async function deleteTeamMission(id: string): Promise<void> {
  const { error } = await requireClient().from('team_missions').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
