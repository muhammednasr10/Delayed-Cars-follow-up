export type SystemRole = {
  id: string
  role_code: string
  role_name_ar: string
  role_name_en: string | null
  description: string | null
  is_system: boolean
  is_active: boolean
}

export type SystemPermission = {
  id: string
  module_key: string
  permission_key: string
  permission_name_ar: string
  permission_name_en: string | null
}

export type UserAccountDetail = {
  id: string
  email: string | null
  full_name: string | null
  legacy_role: string
  is_active: boolean
  is_blocked: boolean
  blocked_reason: string | null
  blocked_at: string | null
  employee_id: string | null
  system_role_id: string | null
  system_role_code: string | null
  system_role_name_ar: string | null
  employee_code: string | null
  employee_full_name: string | null
  job_role: string | null
  department: string | null
  employment_status: string | null
  employee_is_active: boolean | null
  last_seen_at?: string | null
  last_seen_path?: string | null
}

export type PermissionMap = Record<string, boolean>

export type EmploymentStatus = 'active' | 'suspended' | 'resigned' | 'terminated' | 'on_leave'
