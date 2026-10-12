import { describe, expect, it } from 'vitest'
import { countPresentToday } from './attendanceService'

const ids = ['a', 'b', 'c', 'd']

describe('countPresentToday', () => {
  it('counts unmarked workers as present on a work day', () => {
    const records = [
      { employeeId: 'b', workDate: '2026-10-11', status: 'vacation' as const },
      { employeeId: 'c', workDate: '2026-10-11', status: 'absent' as const }
    ]
    expect(countPresentToday(ids, records, '2026-10-11', 'work')).toBe(2)
  })

  it('counts an explicit late mark and ignores a holiday default', () => {
    const records = [{ employeeId: 'a', workDate: '2026-10-11', status: 'late' as const }]
    expect(countPresentToday(ids, records, '2026-10-11', 'vacation')).toBe(1)
  })
})
