import { describe, expect, it } from 'vitest'
import { attendanceAreaFromLabel, classifyAttendanceAreaName, employeeAttendanceArea } from './attendanceAreaBreakdown'

describe('classifyAttendanceAreaName', () => {
  it('maps the four assembly areas', () => {
    expect(classifyAttendanceAreaName('تريم أ')).toBe('trimA')
    expect(classifyAttendanceAreaName('تريم ب')).toBe('trimB')
    expect(classifyAttendanceAreaName('الشاسيه')).toBe('chassis')
    expect(classifyAttendanceAreaName('الفاينال')).toBe('final')
  })

  it('does not treat the combined trim parent as team A or B', () => {
    expect(classifyAttendanceAreaName('تريم أ&ب')).toBeNull()
  })
})

describe('attendanceAreaFromLabel', () => {
  it('uses the deepest matching section', () => {
    expect(attendanceAreaFromLabel('التجميع / تريم أ&ب / تريم أ')).toBe('trimA')
    expect(attendanceAreaFromLabel('التجميع / الشاسيه / خط 1')).toBe('chassis')
  })
})

describe('employeeAttendanceArea', () => {
  it('falls back to the work area name', () => {
    expect(employeeAttendanceArea({ orgUnitLabel: null, workAreaName: 'فاينال' })).toBe('final')
    expect(employeeAttendanceArea(null)).toBe('other')
  })
})
