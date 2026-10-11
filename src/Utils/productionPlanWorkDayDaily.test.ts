import { describe, expect, it } from 'vitest'
import {
  computeProductivityLostCars,
  computeProductivityLossRemainder,
  DAILY_PRODUCTIVITY_TARGET,
  completedWorkThroughDate,
  elapsedWorkTotals,
  monthThroughDate
} from './productionPlanWorkDayDaily'
import { lineProductivityEfficiency } from './productivityEfficiency'

describe('computeProductivityLostCars', () => {
  it('returns 0 when productivity is zero or negative input', () => {
    expect(computeProductivityLostCars(0)).toBe(0)
    expect(computeProductivityLostCars(-1)).toBe(0)
  })

  it('computes lost cars as target minus productivity', () => {
    expect(computeProductivityLostCars(57)).toBe(18)
    expect(computeProductivityLostCars(75)).toBe(0)
  })

  it('never returns negative when productivity exceeds target', () => {
    expect(computeProductivityLostCars(80)).toBe(0)
    expect(computeProductivityLostCars(100)).toBe(0)
  })

  it('uses daily target constant', () => {
    expect(DAILY_PRODUCTIVITY_TARGET).toBe(75)
    expect(computeProductivityLostCars(60)).toBe(15)
  })
})

describe('elapsedWorkTotals', () => {
  const rows = [
    { workDate: '2026-10-01', dayType: 'work' as const, plannedHours: 8, actualHours: 8, workDespiteVacation: false },
    { workDate: '2026-10-02', dayType: 'vacation' as const, plannedHours: 0, actualHours: 0, workDespiteVacation: false },
    { workDate: '2026-10-03', dayType: 'work' as const, plannedHours: 8, actualHours: 6, workDespiteVacation: false },
    { workDate: '2026-10-04', dayType: 'work' as const, plannedHours: 8, actualHours: 8, workDespiteVacation: false }
  ]

  it('counts working days and their hours only through the given date', () => {
    expect(elapsedWorkTotals(rows, '2026-10-03')).toEqual({ days: 2, hours: 14 })
    expect(elapsedWorkTotals(rows, '2026-10-04')).toEqual({ days: 3, hours: 22 })
  })

  it('uses the end of a past month and nothing from a future month', () => {
    expect(monthThroughDate(2026, 9, '2026-10-07')).toBe('2026-09-30')
    expect(monthThroughDate(2026, 11, '2026-10-07')).toBe('')
    expect(monthThroughDate(2026, 10, '2026-10-07')).toBe('2026-10-07')
    expect(completedWorkThroughDate(2026, 10, '2026-10-07')).toBe('2026-10-06')
    expect(completedWorkThroughDate(2026, 10, '2026-10-01')).toBe('')
    expect(completedWorkThroughDate(2026, 9, '2026-10-07')).toBe('2026-09-30')
  })
})

describe('lineProductivityEfficiency', () => {
  const rows = [
    { workDate: '2026-10-01', dayType: 'work' as const, plannedHours: 8, actualHours: 0, workDespiteVacation: false },
    { workDate: '2026-10-02', dayType: 'vacation' as const, plannedHours: 0, actualHours: 0, workDespiteVacation: false },
    { workDate: '2026-10-03', dayType: 'work' as const, plannedHours: 8, actualHours: 0, workDespiteVacation: false },
    { workDate: '2026-10-04', dayType: 'work' as const, plannedHours: 8, actualHours: 8, workDespiteVacation: false }
  ]

  it('uses planned hours when actual hours are still zero, and stops at today', () => {
    const produced = new Map([
      ['2026-10-01', 40],
      ['2026-10-03', 50],
      ['2026-10-04', 80]
    ])
    expect(lineProductivityEfficiency(rows, 7.5, produced, '2026-10-03')).toBe(75)
    expect(lineProductivityEfficiency(rows, 0, produced, '2026-10-03')).toBeNull()
  })
})

describe('computeProductivityLossRemainder', () => {
  it('subtracts stop lost vehicles from total lost', () => {
    expect(computeProductivityLossRemainder(57, 5)).toBe(13)
    expect(computeProductivityLossRemainder(80, 2)).toBe(0)
  })
})
