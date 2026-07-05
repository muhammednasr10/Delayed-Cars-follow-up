import type { AttendanceDayStatus } from '../Types/attendance'

export type TodayAttendanceStatusCounts = Record<
  Extract<AttendanceDayStatus, 'vacation' | 'sick' | 'absent' | 'permission' | 'late'>,
  number
>

export const EMPTY_TODAY_STATUS_COUNTS: TodayAttendanceStatusCounts = {
  vacation: 0,
  sick: 0,
  absent: 0,
  permission: 0,
  late: 0
}

type AttendanceHubInput = {
  loading: boolean
  efficiency: number | null
  presentTodayCount: number
  workforceCount: number
  statusCounts: TodayAttendanceStatusCounts
}

type Translate = (key: string) => string

export function buildAttendanceHubStats(t: Translate, data: AttendanceHubInput) {
  const { loading, efficiency, presentTodayCount, workforceCount, statusCounts } = data
  const count = (n: number) => (loading ? '…' : String(n))

  return [
    {
      label: t('home.attendanceTodayCount'),
      value: loading ? '…' : workforceCount > 0 ? `${presentTodayCount}/${workforceCount}` : '—'
    },
    {
      label: t('home.attendanceEfficiency'),
      value: loading ? '…' : efficiency == null ? '—' : `${efficiency}%`
    },
    { label: t('attendance.status.vacation'), value: count(statusCounts.vacation) },
    { label: t('attendance.status.sick'), value: count(statusCounts.sick) },
    { label: t('attendance.status.absent'), value: count(statusCounts.absent) },
    { label: t('attendance.status.permission'), value: count(statusCounts.permission) },
    { label: t('attendance.status.late'), value: count(statusCounts.late) }
  ]
}
