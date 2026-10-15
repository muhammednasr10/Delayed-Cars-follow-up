import type { AttendanceDayStatus } from '../Types/attendance'
import { ATTENDANCE_STATUSES } from '../Types/attendance'
import { employeeAttendanceArea } from './attendanceAreaBreakdown'

/** مجموعات تقرير حضور اليوم. المدير والمهندس يطلعوا من القسم حتى لو تبعيتهم على الخط. */
export const TODAY_REPORT_GROUPS = [
  'trimA',
  'trimB',
  'chassis',
  'final',
  'dm',
  'managers',
  'engineers'
] as const

export type TodayReportGroup = (typeof TODAY_REPORT_GROUPS)[number] | 'other'

export type TodayReportPerson = {
  jobRole?: string | null
  orgUnitLabel?: string | null
  workAreaName?: string | null
}

export type TodayReportBucket = {
  group: TodayReportGroup
  total: number
  /** حاضر + تأخير من الإجمالي. فاضية لما المجموعة صفر. */
  efficiency: number | null
  byStatus: Record<AttendanceDayStatus, number>
}

const EMPTY_STATUS = (): Record<AttendanceDayStatus, number> =>
  Object.fromEntries(ATTENDANCE_STATUSES.map(status => [status, 0])) as Record<AttendanceDayStatus, number>

function segmentIsDm(name: string): boolean {
  const trimmed = name.trim()
  return /^dm\b/i.test(trimmed) || /^دي\s*[اإ]م$/.test(trimmed)
}

export function labelIsDm(label: string | null | undefined): boolean {
  if (!label?.trim()) return false
  return label.split('/').some(segmentIsDm)
}

export function todayReportGroup(person: TodayReportPerson | null | undefined): TodayReportGroup {
  if (!person) return 'other'
  if (person.jobRole === 'engineer') return 'engineers'
  if (person.jobRole === 'manager' || person.jobRole === 'general_manager') return 'managers'
  if (labelIsDm(person.orgUnitLabel) || labelIsDm(person.workAreaName)) return 'dm'
  const area = employeeAttendanceArea(person)
  if (area === 'other') return 'other'
  return area
}

function bucket(group: TodayReportGroup, rows: { status: AttendanceDayStatus }[]): TodayReportBucket {
  const byStatus = EMPTY_STATUS()
  for (const row of rows) byStatus[row.status] += 1
  const total = rows.length
  const onDuty = byStatus.present + byStatus.late
  return {
    group,
    total,
    efficiency: total > 0 ? Math.round((onDuty / total) * 100) : null,
    byStatus
  }
}

export function buildTodayAttendanceReport(
  people: { group: TodayReportGroup; status: AttendanceDayStatus }[]
): { groups: TodayReportBucket[]; total: TodayReportBucket } {
  const groups = TODAY_REPORT_GROUPS.map(group => bucket(group, people.filter(person => person.group === group)))
  const otherRows = people.filter(person => person.group === 'other')
  if (otherRows.length > 0) groups.push(bucket('other', otherRows))
  return { groups, total: bucket('other', people) }
}
