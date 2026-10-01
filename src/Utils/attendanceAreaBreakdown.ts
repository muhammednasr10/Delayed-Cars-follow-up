export const ATTENDANCE_AREA_KEYS = ['trimA', 'trimB', 'chassis', 'final'] as const

export type AttendanceAreaKey = (typeof ATTENDANCE_AREA_KEYS)[number] | 'other'

const COMBINED_TRIM = /تريم\s*[أا]\s*[&و+]\s*[بb]|trim\s*a\s*[&/+]\s*b/i

export function classifyAttendanceAreaName(name: string | null | undefined): AttendanceAreaKey | null {
  const text = name?.trim()
  if (!text) return null
  if (/فاينال|final/i.test(text)) return 'final'
  if (/شاسيه|chassis/i.test(text)) return 'chassis'
  if (COMBINED_TRIM.test(text)) return null
  if (/تريم\s*[بb]|trim\s*b/i.test(text)) return 'trimB'
  if (/تريم\s*[أا]|trim\s*a/i.test(text)) return 'trimA'
  return null
}

/** Walk org path from the leaf upward so «تريم أ» wins over a parent like «تريم أ&ب». */
export function attendanceAreaFromLabel(label: string | null | undefined): AttendanceAreaKey | null {
  if (!label) return null
  const parts = label
    .split('/')
    .map(part => part.trim())
    .filter(Boolean)
    .reverse()
  for (const part of parts) {
    const area = classifyAttendanceAreaName(part)
    if (area) return area
  }
  return null
}

export function employeeAttendanceArea(employee: {
  orgUnitLabel?: string | null
  workAreaName?: string | null
} | null | undefined): AttendanceAreaKey {
  if (!employee) return 'other'
  return attendanceAreaFromLabel(employee.orgUnitLabel) ?? classifyAttendanceAreaName(employee.workAreaName) ?? 'other'
}
