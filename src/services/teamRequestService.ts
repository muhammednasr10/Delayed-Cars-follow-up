import { supabase } from '../lib/supabase'
import type { TeamRequest, TeamRequestInput, TeamRequestStatus } from '../Types/teamRequest'
import type { MissionPriority } from '../Types/mission'

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

type ManagerRow = {
  manager_id: string
  manager?: { full_name: string; employee_code: string } | { full_name: string; employee_code: string }[] | null
}

type Row = {
  id: string
  requester_id: string
  manager_id: string
  title: string
  description: string | null
  status: TeamRequestStatus
  manager_response: string | null
  converted_mission_id: string | null
  created_at: string
  updated_at: string
  requester?: { full_name: string; employee_code: string } | { full_name: string; employee_code: string }[] | null
  manager?: { full_name: string; employee_code: string } | { full_name: string; employee_code: string }[] | null
  team_request_managers?: ManagerRow[] | null
}

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function mapManagers(
  rows: ManagerRow[] | null | undefined,
  fallbackManagerId: string,
  fallbackManager: { full_name: string; employee_code: string } | null
) {
  if (rows?.length) {
    return rows.map(r => {
      const m = relOne(r.manager)
      return {
        id: r.manager_id,
        name: m?.full_name ?? '—',
        code: m?.employee_code ?? '—'
      }
    })
  }
  return [{
    id: fallbackManagerId,
    name: fallbackManager?.full_name ?? '—',
    code: fallbackManager?.employee_code ?? '—'
  }]
}

function mapRow(row: Row): TeamRequest {
  const requester = relOne(row.requester)
  const manager = relOne(row.manager)
  const managers = mapManagers(row.team_request_managers, row.manager_id, manager)
  const primary = managers[0]
  return {
    id: row.id,
    requesterId: row.requester_id,
    requesterName: requester?.full_name ?? '—',
    requesterCode: requester?.employee_code ?? '—',
    managerId: primary?.id ?? row.manager_id,
    managerName: primary?.name ?? manager?.full_name ?? '—',
    managerCode: primary?.code ?? manager?.employee_code ?? '—',
    managerIds: managers.map(m => m.id),
    managers,
    title: row.title,
    description: row.description,
    status: row.status,
    managerResponse: row.manager_response,
    convertedMissionId: row.converted_mission_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

const SELECT = `
  *,
  requester:employees!team_requests_requester_id_fkey(full_name, employee_code),
  manager:employees!team_requests_manager_id_fkey(full_name, employee_code),
  team_request_managers(
    manager_id,
    manager:employees!team_request_managers_manager_id_fkey(full_name, employee_code)
  )
`

export async function getTeamRequests(): Promise<TeamRequest[]> {
  const { data, error } = await requireClient()
    .from('team_requests')
    .select(SELECT)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data ?? []) as Row[]).map(mapRow)
}

export async function createTeamRequest(_requesterId: string, input: TeamRequestInput): Promise<TeamRequest> {
  if (!input.managerIds.length) throw new Error('MANAGERS_REQUIRED')
  const { data, error } = await requireClient().rpc('create_team_request_with_managers', {
    p_manager_ids: input.managerIds,
    p_title: input.title.trim(),
    p_description: input.description?.trim() || null
  })
  if (error) {
    if (error.message?.includes('NO_EMPLOYEE_LINK')) throw new Error('NO_EMPLOYEE_LINK')
    if (error.message?.includes('NOT_DIRECT_MANAGER')) throw new Error('NOT_DIRECT_MANAGER')
    if (error.message?.includes('MANAGERS_REQUIRED')) throw new Error('MANAGERS_REQUIRED')
    throw new Error(error.message)
  }
  const id = data as string
  const { data: full, error: loadErr } = await requireClient().from('team_requests').select(SELECT).eq('id', id).single()
  if (loadErr) throw new Error(loadErr.message)
  return mapRow(full as Row)
}

export async function respondTeamRequest(
  id: string,
  status: 'accepted' | 'rejected',
  managerResponse?: string | null
): Promise<TeamRequest> {
  const { data, error } = await requireClient()
    .from('team_requests')
    .update({
      status,
      manager_response: managerResponse?.trim() || null
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select(SELECT)
    .single()
  if (error) throw new Error(error.message)
  return mapRow(data as Row)
}

export async function convertTeamRequestToMission(
  requestId: string,
  assigneeIds: string[],
  options?: { priority?: MissionPriority; dueDate?: string | null; notes?: string | null }
): Promise<string> {
  if (!assigneeIds.length) throw new Error('ASSIGNEES_REQUIRED')
  const { data, error } = await requireClient().rpc('convert_team_request_to_mission', {
    p_request_id: requestId,
    p_assignee_ids: assigneeIds,
    p_priority: options?.priority ?? 'normal',
    p_due_date: options?.dueDate || null,
    p_notes: options?.notes?.trim() || null
  })
  if (error) {
    if (error.message?.includes('NO_EMPLOYEE_LINK')) throw new Error('NO_EMPLOYEE_LINK')
    if (error.message?.includes('NOT_REQUEST_MANAGER')) throw new Error('NOT_REQUEST_MANAGER')
    if (error.message?.includes('ASSIGNEE_NOT_SUBORDINATE')) throw new Error('ASSIGNEE_NOT_SUBORDINATE')
    if (error.message?.includes('REQUEST_NOT_PENDING')) throw new Error('REQUEST_NOT_PENDING')
    if (error.message?.includes('ASSIGNEES_REQUIRED')) throw new Error('ASSIGNEES_REQUIRED')
    throw new Error(error.message)
  }
  return data as string
}
