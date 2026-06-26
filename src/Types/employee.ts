import type { JobRole, ResponsibleDepartment } from './enums'
import type { EmploymentStatus } from './permissions'

/** حالة التعيين من كشف العمالة — منفصلة عن تفعيل السجل */
export type AssignmentStatus = 'متعين' | 'كاجوال'

export const ASSIGNMENT_STATUSES: AssignmentStatus[] = ['متعين', 'كاجوال']

// Row shape returned from the `employees` table (with embedded names resolved
// by the service). Manager name is resolved client-side from the loaded list.
export type Employee = {
  id: string
  employeeCode: string
  fullName: string
  jobRole: JobRole
  department: ResponsibleDepartment | null
  workAreaId: string | null
  workAreaName: string | null
  stationId: string | null
  stationLabel: string | null
  lineName: string | null
  /** Primary direct manager (first in directManagerIds). */
  directManagerId: string | null
  directManagerName: string | null
  directManagerIds: string[]
  directManagerNames: string[]
  profileId: string | null
  phone: string | null
  email: string | null
  notes: string | null
  /** حالة التعيين من كشف العمالة (مثل متعين) — منفصلة عن نشط/موقوف */
  assignmentStatus: AssignmentStatus | null
  isActive: boolean
  employmentStatus: EmploymentStatus
  stoppedReason: string | null
  createdAt: string
  updatedAt: string
}

export type EmployeeInput = {
  employeeCode: string
  fullName: string
  jobRole: JobRole
  department: ResponsibleDepartment | null
  workAreaId: string | null
  stationId: string | null
  lineName: string | null
  directManagerIds: string[]
  phone: string | null
  email: string | null
  notes: string | null
  assignmentStatus: AssignmentStatus | null
  isActive: boolean
}
