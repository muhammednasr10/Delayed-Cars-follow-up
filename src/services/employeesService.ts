import { supabase } from '../lib/supabase'
import type { Employee, EmployeeInput } from '../Types/employee'
import type { JobRole, ResponsibleDepartment } from '../Types/enums'

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
  is_active: boolean
  employment_status?: string
  stopped_reason?: string | null
  created_at: string
  updated_at: string
  work_areas?: { name: string } | null
  stations?: { station_number: string; station_name: string } | null
}

const SELECT = '*, work_areas(name), stations(station_number, station_name)'

function mapRow(row: EmployeeRow, byId: Map<string, EmployeeRow>): Employee {
  const manager = row.direct_manager_id ? byId.get(row.direct_manager_id) : null
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
    directManagerId: row.direct_manager_id,
    directManagerName: manager ? manager.full_name : null,
    profileId: row.profile_id,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    isActive: row.is_active,
    employmentStatus: (row.employment_status as Employee['employmentStatus']) ?? 'active',
    stoppedReason: row.stopped_reason ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export async function getEmployees(): Promise<Employee[]> {
  const { data, error } = await requireClient()
    .from('employees')
    .select(SELECT)
    .order('full_name')

  if (error) throw new Error(error.message)
  const rows = (data ?? []) as EmployeeRow[]
  const byId = new Map(rows.map(r => [r.id, r]))
  return rows.map(r => mapRow(r, byId))
}

function toPayload(input: EmployeeInput): Record<string, unknown> {
  return {
    employee_code: input.employeeCode.trim(),
    full_name: input.fullName.trim(),
    job_role: input.jobRole,
    department: input.department || null,
    work_area_id: input.workAreaId || null,
    station_id: input.stationId || null,
    line_name: input.lineName?.trim() || null,
    direct_manager_id: input.directManagerId || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    notes: input.notes?.trim() || null,
    is_active: input.isActive
  }
}

export async function createEmployee(input: EmployeeInput): Promise<void> {
  const { error } = await requireClient().from('employees').insert(toPayload(input))
  if (error) throw new Error(translateError(error))
}

export async function updateEmployee(id: string, input: EmployeeInput): Promise<void> {
  const { error } = await requireClient().from('employees').update(toPayload(input)).eq('id', id)
  if (error) throw new Error(translateError(error))
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
  if (error.code === '23505' || msg.toLowerCase().includes('employees_employee_code_key') || msg.toLowerCase().includes('duplicate')) {
    return 'DUPLICATE_CODE'
  }
  return msg
}
