import { describe, expect, it } from 'vitest'
import {
  attendanceDefaultsFromPlanDay,
  allowedAttendanceStatusesForPlanDay,
  defaultAttendanceStatusForPlanDay,
  isHolidayPlanDay,
  resolvePlanDayType
} from './attendanceDefaults'

describe('attendanceDefaultsFromPlanDay', () => {
  it('defaults to present on work days', () => {
    expect(attendanceDefaultsFromPlanDay('work').status).toBe('present')
    expect(attendanceDefaultsFromPlanDay('overtime').status).toBe('present')
    expect(attendanceDefaultsFromPlanDay('substitute').status).toBe('present')
    expect(attendanceDefaultsFromPlanDay(null).status).toBe('present')
  })

  it('defaults to vacation on holidays without times', () => {
    for (const dayType of ['vacation', 'factory_vacation'] as const) {
      const defs = attendanceDefaultsFromPlanDay(dayType)
      expect(defs.status).toBe('vacation')
      expect(defs.checkIn).toBe('')
      expect(defs.checkOut).toBe('')
    }
  })
})

describe('holiday attendance rules', () => {
  it('identifies holiday plan days', () => {
    expect(isHolidayPlanDay('vacation')).toBe(true)
    expect(isHolidayPlanDay('factory_vacation')).toBe(true)
    expect(isHolidayPlanDay('work')).toBe(false)
    expect(isHolidayPlanDay(null)).toBe(false)
  })

  it('restricts statuses on holidays to vacation and overtime-like present/late', () => {
    expect(allowedAttendanceStatusesForPlanDay('vacation')).toEqual(['vacation', 'present', 'late'])
    expect(allowedAttendanceStatusesForPlanDay('work').length).toBeGreaterThan(3)
  })

  it('resolves missing plan rows as work days', () => {
    const map = new Map([['2026-07-01', 'vacation' as const]])
    expect(resolvePlanDayType('2026-07-01', map)).toBe('vacation')
    expect(resolvePlanDayType('2026-07-02', map)).toBe('work')
    expect(defaultAttendanceStatusForPlanDay(resolvePlanDayType('2026-07-01', map))).toBe('vacation')
    expect(defaultAttendanceStatusForPlanDay(resolvePlanDayType('2026-07-02', map))).toBe('present')
  })
})
