import { describe, expect, it } from 'vitest'
import { summarizeCausingDepartments } from './missingPartDailyReportExcel'

describe('summarizeCausingDepartments', () => {
  it('counts a vehicle once per department and keeps each shortage line', () => {
    const summary = summarizeCausingDepartments([
      { vehicleId: 'a', modelName: 'T4-PRO', department: 'الدهان' },
      { vehicleId: 'a', modelName: 'T4-PRO', department: 'الدهان' },
      { vehicleId: 'a', modelName: 'T4-PRO', department: 'التجميع' },
      { vehicleId: 'b', modelName: 'GD', department: 'الدهان' }
    ])

    expect(summary.byDepartment).toEqual([
      { department: 'الدهان', vehicles: 2, lines: 3 },
      { department: 'التجميع', vehicles: 1, lines: 1 }
    ])
    expect(summary.byModel).toEqual([
      { model: 'T4-PRO', department: 'الدهان', vehicles: 1, lines: 2 },
      { model: 'GD', department: 'الدهان', vehicles: 1, lines: 1 },
      { model: 'T4-PRO', department: 'التجميع', vehicles: 1, lines: 1 }
    ])
  })
})
