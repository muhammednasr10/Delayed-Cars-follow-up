import { describe, expect, it } from 'vitest'
import { achievementPercent, planDueThroughDate, type DailyTrackingSourceRow } from './planningDailyTracking'

const rows: DailyTrackingSourceRow[] = [
  { workDate: '2026-10-01', dayType: 'work', plannedHours: 10 },
  { workDate: '2026-10-02', dayType: 'vacation', plannedHours: 0 },
  { workDate: '2026-10-03', dayType: 'work', plannedHours: 10 },
  { workDate: '2026-10-04', dayType: 'work', plannedHours: 10 }
]

describe('planDueThroughDate', () => {
  it('counts only the plan share of working days up to the given date', () => {
    expect(planDueThroughDate(90, rows, '2026-10-02')).toBe(30)
    expect(planDueThroughDate(90, rows, '2026-10-04')).toBe(90)
  })
})

describe('achievementPercent', () => {
  it('rounds the ratio and stays open above 100', () => {
    expect(achievementPercent(200, 50)).toBe(25)
    expect(achievementPercent(40, 50)).toBe(125)
    expect(achievementPercent(0, 10)).toBeNull()
  })
})
