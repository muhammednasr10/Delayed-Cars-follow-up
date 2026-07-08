import type { AttendanceDayStatus } from '../Types/attendance'
import {
  ATTENDANCE_STATUSES,
  DEFAULT_ATTENDANCE_CHECK_IN,
  DEFAULT_ATTENDANCE_CHECK_OUT,
  attendanceStatusHasTimes
} from '../Types/attendance'
import type { PlanDayType } from '../Types/productionPlanWorkDayDaily'
import { isVacationOrFactoryHoliday } from './productionPlanWorkDayDaily'

/** على يوم أجازة: إجازة افتراضياً، وحضور/تأخير فقط لمن جاء إضافي */
export const HOLIDAY_ATTENDANCE_STATUSES: AttendanceDayStatus[] = ['vacation', 'present', 'late']

export type AttendanceBulkDefaults = {
  status: AttendanceDayStatus
  checkIn: string
  checkOut: string
}

export const DEFAULT_ATTENDANCE_BULK: AttendanceBulkDefaults = {
  status: 'present',
  checkIn: DEFAULT_ATTENDANCE_CHECK_IN,
  checkOut: DEFAULT_ATTENDANCE_CHECK_OUT
}

/** عمل / بدل / إضافي — أو لم يُحدَّد في ملخص الإنتاجية */
export function isProductionAttendanceDay(dayType: PlanDayType | null): boolean {
  if (!dayType) return true
  return dayType === 'work' || dayType === 'substitute' || dayType === 'overtime'
}

export function attendanceDefaultsFromPlanDay(
  dayType: PlanDayType | null,
  configured: AttendanceBulkDefaults = DEFAULT_ATTENDANCE_BULK
): AttendanceBulkDefaults {
  if (isProductionAttendanceDay(dayType)) {
    return {
      status: configured.status,
      checkIn: attendanceStatusHasTimes(configured.status) ? configured.checkIn : '',
      checkOut: attendanceStatusHasTimes(configured.status) ? configured.checkOut : ''
    }
  }
  return { status: 'vacation', checkIn: '', checkOut: '' }
}

export function isHolidayPlanDay(dayType: PlanDayType | null): boolean {
  return dayType !== null && isVacationOrFactoryHoliday(dayType)
}

export function resolvePlanDayType(workDate: string, savedByDate: Map<string, PlanDayType>): PlanDayType {
  return savedByDate.get(workDate) ?? 'work'
}

export function allowedAttendanceStatusesForPlanDay(dayType: PlanDayType | null): AttendanceDayStatus[] {
  if (isHolidayPlanDay(dayType)) return HOLIDAY_ATTENDANCE_STATUSES
  return [...ATTENDANCE_STATUSES]
}

export function defaultAttendanceStatusForPlanDay(dayType: PlanDayType | null): AttendanceDayStatus {
  return attendanceDefaultsFromPlanDay(dayType).status
}
