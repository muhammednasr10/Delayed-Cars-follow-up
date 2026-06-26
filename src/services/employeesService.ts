import { supabase } from '../lib/supabase'
import type { AssignmentStatus } from '../Types/employee'
import type { Employee, EmployeeInput } from '../Types/employee'
import { JOB_ROLES, type JobRole, type ResponsibleDepartment } from '../Types/enums'

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured. Check .env')
  return supabase
}

type EmployeeRow = {
  id: string
  employee_code: string
  full_name: string
  job_role: JobRole
  department: ResponsibleDepartment | null
  work_area_id: string | null
  station_id: string | null
  line_name: string | null
  direct_manager_id: string | null
  profile_id: string | null
  phone: string | null
  email: string | null
  notes: string | null
  assignment_status: string | null
  is_active: boolean
  employment_status?: string
  stopped_reason?: string | null
  created_at: string
  updated_at: string
  work_areas?: { name: string } | null
  stations?: { station_number: string; station_name: string } | null
}

type ManagerLinkRow = {
  employee_id: string
  manager_id: string
  sort_order: number
}

const SELECT = '*, work_areas(name), stations(station_number, station_name)'

const JOB_ROLE_RANK = new Map<JobRole, number>(JOB_ROLES.map((role, index) => [role, index]))

/** Factory hierarchy first, then employee code (numeric-aware). */
export function compareEmployees(a: Employee, b: Employee): number {
  const ra = JOB_ROLE_RANK.get(a.jobRole) ?? JOB_ROLES.length
  const rb = JOB_ROLE_RANK.get(b.jobRole) ?? JOB_ROLES.length
  if (ra !== rb) return ra - rb
  return a.employeeCode.localeCompare(b.employeeCode, undefined, { numeric: true, sensitivity: 'base' })
}

function sortEmployees(list: Employee[]): Employee[] {
  return [...list].sort(compareEmployees)
}

function mapRow(row: EmployeeRow, byId: Map<string, EmployeeRow>, managerIds: string[]): Employee {
  const manager = row.direct_manager_id ? byId.get(row.direct_manager_id) : null
  const managerNames = managerIds
    .map(id => byId.get(id)?.full_name)
    .filter((name): name is string => Boolean(name))
  const station = row.stations
  return {
    id: row.id,
    employeeCode: row.employee_code,
    fullName: row.full_name,
    jobRole: row.job_role,
    department: row.department,
    workAreaId: row.work_area_id,
    workAreaName: row.work_areas?.name ?? null,
    stationId: row.station_id,
    stationLabel: station ? `${station.station_number} - ${station.station_name}` : null,
    lineName: row.line_name,
    directManagerId: managerIds[0] ?? row.direct_manager_id,
    directManagerName: managerNames[0] ?? (manager ? manager.full_name : null),
    directManagerIds: managerIds,
    directManagerNames: managerNames,
    profileId: row.profile_id,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    assignmentStatus: (row.assignment_status as AssignmentStatus | null) ?? null,
    isActive: row.is_active,
    employmentStatus: (row.employment_status as Employee['employmentStatus']) ?? 'active',
    stoppedReason: row.stopped_reason ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export async function getEmployees(): Promise<Employee[]> {
  const client = requireClient()
  const { data, error } = await client.from('employees').select(SELECT)

  if (error) throw new Error(error.message)
  const rows = (data ?? []) as EmployeeRow[]
  const byId = new Map(rows.map(r => [r.id, r]))

  const managersByEmployee = new Map<string, string[]>()
  const { data: linkData, error: linkError } = await client
    .from('employee_direct_managers')
    .select('employee_id, manager_id, sort_order')
    .order('sort_order')

  if (!linkError && linkData) {
    for (const link of linkData as ManagerLinkRow[]) {
      const list = managersByEmployee.get(link.employee_id) ?? []
      list.push(link.manager_id)
      managersByEmployee.set(link.employee_id, list)
    }
  }

  return sortEmployees(
    rows.map(r => {
      const managerIds =
        managersByEmployee.get(r.id) ?? (r.direct_manager_id ? [r.direct_manager_id] : [])
      return mapRow(r, byId, managerIds)
    })
  )
}

async function saveEmployeeDirectManagers(employeeId: string, managerIds: string[]): Promise<void> {
  const client = requireClient()
  const uniqueIds = [...new Set(managerIds.filter(id => id && id !== employeeId))]

  const { error: deleteError } = await client
    .from('employee_direct_managers')
    .delete()
    .eq('employee_id', employeeId)
  if (deleteError) throw new Error(translateError(deleteError))

  if (uniqueIds.length === 0) return

  const { error: insertError } = await client.from('employee_direct_managers').insert(
    uniqueIds.map((managerId, index) => ({
      employee_id: employeeId,
      manager_id: managerId,
      sort_order: index
    }))
  )
  if (insertError) throw new Error(translateError(insertError))
}

function toPayload(input: EmployeeInput): Record<string, unknown> {
  const primaryManagerId = input.directManagerIds[0] ?? null
  return {
    employee_code: input.employeeCode.trim(),
    full_name: input.fullName.trim(),
    job_role: input.jobRole,
    department: input.department || null,
    work_area_id: input.workAreaId || null,
    station_id: input.stationId || null,
    line_name: input.lineName?.trim() || null,
    direct_manager_id: primaryManagerId,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    notes: input.notes?.trim() || null,
    assignment_status: input.assignmentStatus?.trim() || null,
    is_active: input.isActive
  }
}

export async function createEmployee(input: EmployeeInput): Promise<void> {
  const client = requireClient()
  const { data, error } = await client.from('employees').insert(toPayload(input)).select('id').single()
  if (error) throw new Error(translateError(error))
  await saveEmployeeDirectManagers(data.id, input.directManagerIds)
}

export async function bulkCreateEmployees(
  inputs: EmployeeInput[]
): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = []
  let imported = 0
  const batchSize = 50
  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize).map(toPayload)
    const { error } = await requireClient().from('employees').insert(batch)
    if (error) {
      errors.push(translateError(error))
      break
    }
    imported += batch.length
  }
  return { imported, errors }
}

export async function updateEmployee(id: string, input: EmployeeInput): Promise<void> {
  const { error } = await requireClient().from('employees').update(toPayload(input)).eq('id', id)
  if (error) throw new Error(translateError(error))
  await saveEmployeeDirectManagers(id, input.directManagerIds)
}

export async function setEmployeeActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await requireClient()
    .from('employees')
    .update({
      is_active: isActive,
      employment_status: isActive ? 'active' : 'suspended'
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function suspendEmployee(
  employeeId: string,
  reason: string,
  blockLinkedUser = true
): Promise<void> {
  const { error } = await requireClient().rpc('suspend_employee', {
    p_employee_id: employeeId,
    p_reason: reason,
    p_block_linked_user: blockLinkedUser
  })
  if (error) throw new Error(error.message)
}

export async function reactivateEmployee(employeeId: string): Promise<void> {
  const { error } = await requireClient().rpc('reactivate_employee', { p_employee_id: employeeId })
  if (error) throw new Error(error.message)
}

function translateError(error: { code?: string; message?: string }): string {
  const msg = error.message || 'Request failed'
  if (msg.includes('Circular management hierarchy')) return 'MANAGER_CYCLE'
  if (error.code === '23505' || msg.toLowerCase().includes('employees_employee_code_key') || msg.toLowerCase().includes('duplicate')) {
    return 'DUPLICATE_CODE'
  }
  return msg
}
