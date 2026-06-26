import type { AttendanceDayStatus } from '../Types/attendance'
import {
  DEFAULT_ATTENDANCE_CHECK_IN,
  DEFAULT_ATTENDANCE_CHECK_OUT,
  attendanceStatusHasTimes
} from '../Types/attendance'
import type { PlanDayType } from '../Types/productionPlanWorkDayDaily'
import { isVacationOrFactoryHoliday } from './productionPlanWorkDayDaily'

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
