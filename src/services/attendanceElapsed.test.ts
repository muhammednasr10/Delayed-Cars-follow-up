import { describe, expect, it } from 'vitest'
import { tallyElapsedMonthDays } from './attendanceService'

describe('tallyElapsedMonthDays', () => {
  it('leaves today out even when it is already saved', () => {
    const tallies = tallyElapsedMonthDays(
      ['emp'],
      2026,
      10,
      [
        { employeeId: 'emp', workDate: '2026-10-01', status: 'sick' },
        { employeeId: 'emp', workDate: '2026-10-11', status: 'sick' }
      ],
      '2026-10-11',
      new Map([
        ['2026-10-01', 'work'],
        ['2026-10-11', 'work']
      ])
    )
    const row = tallies.get('emp')
    expect(row?.sick).toBe(1)
    expect(row?.present).toBeGreaterThan(0)
  })
})
