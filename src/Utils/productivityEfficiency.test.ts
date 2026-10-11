import { describe, expect, it } from 'vitest'
import {
  assemblyDeficitFromEntry,
  expectedVehiclesThroughDate,
  lineProductivityEfficiency,
  planEfficiencyAgainstElapsedDays,
  planEfficiencyAgainstFullMonth
} from './productivityEfficiency'

describe('plan efficiency', () => {
  const rows = [
    { workDate: '2026-10-01', dayType: 'work' as const, plannedHours: 8 },
    { workDate: '2026-10-02', dayType: 'vacation' as const, plannedHours: 0 },
    { workDate: '2026-10-03', dayType: 'work' as const, plannedHours: 8 }
  ]

  it('compares exit with the full monthly plan', () => {
    expect(planEfficiencyAgainstFullMonth(1200, 190)).toBe(16)
    expect(planEfficiencyAgainstFullMonth(0, 0)).toBe(0)
  })

  it('keeps cars recorded today and drops today from the expected hours', () => {
    const rows = [
      { workDate: '2026-10-01', dayType: 'work' as const, plannedHours: 8, actualHours: 0, workDespiteVacation: false },
      { workDate: '2026-10-04', dayType: 'work' as const, plannedHours: 8, actualHours: 0, workDespiteVacation: false },
      { workDate: '2026-10-05', dayType: 'work' as const, plannedHours: 8, actualHours: 0, workDespiteVacation: false },
      { workDate: '2026-10-06', dayType: 'work' as const, plannedHours: 8, actualHours: 0, workDespiteVacation: false },
      { workDate: '2026-10-07', dayType: 'work' as const, plannedHours: 8, actualHours: 0, workDespiteVacation: false }
    ]
    const entry = new Map([['2026-10-06', 204]])
    expect(lineProductivityEfficiency(rows, 7.5, entry, '2026-10-07', '2026-10-06')).toBe(85)
    const expected = expectedVehiclesThroughDate(rows, 7.5, '2026-10-06')
    expect(expected).toBe(240)
    expect(assemblyDeficitFromEntry(expected, 204, 31)).toBe(5)
  })

  it('compares exit with the plan share due through the given day', () => {
    expect(planEfficiencyAgainstElapsedDays(160, 40, rows, '2026-10-01')).toBe(50)
    expect(planEfficiencyAgainstElapsedDays(160, 40, rows, '2026-10-02')).toBe(50)
  })
})