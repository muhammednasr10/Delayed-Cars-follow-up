export type AttendanceDayStatus = 'present' | 'absent' | 'vacation' | 'sick'

export const ATTENDANCE_STATUSES: AttendanceDayStatus[] = ['present', 'absent', 'vacation', 'sick']

/** Default shift times when day is حاضر */
export const DEFAULT_ATTENDANCE_CHECK_IN = '07:00'
export const DEFAULT_ATTENDANCE_CHECK_OUT = '15:30'

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
  issueDays: number
}

export type AttendanceIssueLeader = EmployeeAttendanceSummary & {
  rankScore: number
}
