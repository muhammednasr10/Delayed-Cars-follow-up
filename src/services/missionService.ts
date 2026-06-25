import { supabase } from '../lib/supabase'
import type { TeamMission, TeamMissionInput } from '../Types/mission'

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
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
}

function mapRow(row: Row): TeamMission {
  const emp = Array.isArray(row.employees) ? row.employees[0] : row.employees
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    assigneeId: row.assignee_id,
    assigneeName: emp?.full_name ?? '—',
    assigneeCode: emp?.employee_code ?? '—',
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
  return {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    assignee_id: input.assigneeId,
    status: input.status,
    priority: input.priority,
    due_date: input.dueDate || null,
    notes: input.notes?.trim() || null
  }
}

const SELECT = '*, employees(full_name, employee_code)'

export async function getTeamMissions(): Promise<TeamMission[]> {
  const { data, error } = await requireClient()
    .from('team_missions')
    .select(SELECT)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data ?? []) as Row[]).map(mapRow)
}

export async function createTeamMission(input: TeamMissionInput): Promise<TeamMission> {
  const { data, error } = await requireClient().from('team_missions').insert(toPayload(input)).select(SELECT).single()
  if (error) throw new Error(error.message)
  return mapRow(data as Row)
}

export async function updateTeamMission(id: string, input: TeamMissionInput): Promise<TeamMission> {
  const { data, error } = await requireClient()
    .from('team_missions')
    .update(toPayload(input))
    .eq('id', id)
    .select(SELECT)
    .single()
  if (error) throw new Error(error.message)
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

export async function deleteTeamMission(id: string): Promise<void> {
  const { error } = await requireClient().from('team_missions').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
