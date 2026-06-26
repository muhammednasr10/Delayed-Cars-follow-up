export type AttendanceDayStatus = 'present' | 'absent' | 'vacation' | 'sick' | 'permission' | 'late'

export const ATTENDANCE_STATUSES: AttendanceDayStatus[] = [
  'present',
  'absent',
  'vacation',
  'sick',
  'permission',
  'late'
]

/** Statuses that keep check-in / check-out times. */
export function attendanceStatusHasTimes(status: AttendanceDayStatus): boolean {
  return status === 'present' || status === 'late' || status === 'permission'
}

/** Default shift times when day is حاضر */
export { DEFAULT_WORK_SHIFT_START as DEFAULT_ATTENDANCE_CHECK_IN } from '../Utils/workScheduleDefaults'
export { DEFAULT_WORK_SHIFT_END as DEFAULT_ATTENDANCE_CHECK_OUT } from '../Utils/workScheduleDefaults'
export type AttendanceDayEdit = {
  workDate: string
  status: AttendanceDayStatus
  checkIn: string
  checkOut: string
  notes: string
}

export type AttendanceDay = {
  id: string
  employeeId: string
  workDate: string
  status: AttendanceDayStatus
  checkIn: string | null
  checkOut: string | null
  notes: string | null
}

export type AttendanceDayInput = {
  employeeId: string
  workDate: string
  status: AttendanceDayStatus
  checkIn?: string | null
  checkOut?: string | null
  notes?: string | null
}

export type EmployeeAttendanceSummary = {
  employeeId: string
  employeeCode: string
  fullName: string
  jobRole: string
  presentDays: number
  absentDays: number
  vacationDays: number
  sickDays: number
  permissionDays: number
  lateDays: number
  issueDays: number
}

export type AttendanceIssueLeader = EmployeeAttendanceSummary & {
  rankScore: number
}
