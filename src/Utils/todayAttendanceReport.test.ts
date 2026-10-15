import { describe, expect, it } from 'vitest'
import { buildTodayAttendanceReport, labelIsDm, todayReportGroup } from './todayAttendanceReport'

describe('todayReportGroup', () => {
  it('keeps line sections and pulls managers, engineers, and DM out of them', () => {
    expect(todayReportGroup({ jobRole: 'technician', orgUnitLabel: 'التجميع / تريم أ' })).toBe('trimA')
    expect(todayReportGroup({ jobRole: 'technician', orgUnitLabel: 'التجميع / تريم ب' })).toBe('trimB')
    expect(todayReportGroup({ jobRole: 'leader', workAreaName: 'الشاسيه' })).toBe('chassis')
    expect(todayReportGroup({ jobRole: 'technician', orgUnitLabel: 'الفاينال' })).toBe('final')
    expect(todayReportGroup({ jobRole: 'technician', orgUnitLabel: 'التجميع / DM / وردية 1' })).toBe('dm')
    expect(todayReportGroup({ jobRole: 'manager', orgUnitLabel: 'التجميع / تريم أ' })).toBe('managers')
    expect(todayReportGroup({ jobRole: 'general_manager', orgUnitLabel: 'الفاينال' })).toBe('managers')
    expect(todayReportGroup({ jobRole: 'engineer', orgUnitLabel: 'التجميع / DM' })).toBe('engineers')
  })

  it('recognizes a DM section without swallowing nearby names', () => {
    expect(labelIsDm('الإنتاج / DM')).toBe(true)
    expect(labelIsDm('دي إم')).toBe(true)
    expect(labelIsDm('التجميع / تريم أ')).toBe(false)
  })
})

describe('buildTodayAttendanceReport', () => {
  it('counts headcount, efficiency, and each status per group', () => {
    const report = buildTodayAttendanceReport([
      { group: 'trimA', status: 'present' },
      { group: 'trimA', status: 'late' },
      { group: 'trimA', status: 'absent' },
      { group: 'trimA', status: 'vacation' },
      { group: 'engineers', status: 'present' },
      { group: 'other', status: 'sick' }
    ])
    const trimA = report.groups.find(row => row.group === 'trimA')
    expect(trimA).toMatchObject({
      total: 4,
      efficiency: 50,
      byStatus: { present: 1, late: 1, absent: 1, vacation: 1, sick: 0, permission: 0 }
    })
    expect(report.groups.find(row => row.group === 'trimB')?.total).toBe(0)
    expect(report.groups.find(row => row.group === 'trimB')?.efficiency).toBeNull()
    expect(report.groups.some(row => row.group === 'other')).toBe(true)
    expect(report.total).toMatchObject({ total: 6, efficiency: 50 })
  })
})
