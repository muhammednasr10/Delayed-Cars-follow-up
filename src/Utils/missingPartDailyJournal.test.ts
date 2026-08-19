import { describe, expect, it } from 'vitest'
import type { MissingPartDetail } from '../Types/missingPart'
import { buildMissingPartDiary, listDiaryMonthOptions, localMonthKey } from './missingPartDailyJournal'

function part(
  overrides: Partial<MissingPartDetail> & Pick<MissingPartDetail, 'id' | 'vehicleId' | 'vin' | 'createdAt'>
): MissingPartDetail {
  return {
    partDescription: 'x',
    requiredQty: 1,
    installedQty: 0,
    remainingQty: 1,
    reason: 'stock_shortage',
    department: 'body',
    completingDepartment: null,
    followUpEmployeeId: null,
    followUpEmployeeName: null,
    followUpEmployeeIds: [],
    followUpEmployeeNames: null,
    priority: 'normal',
    status: 'open',
    qcApproved: false,
    isDrItem: false,
    stopperType: 'car_stopper',
    notes: null,
    modelName: 'F10',
    colorName: null,
    colorCode: null,
    colorHex: null,
    stationNumber: null,
    stationName: null,
    stationLineName: null,
    stationArea: null,
    stationDepartment: null,
    stationPerson: null,
    createdBy: null,
    createdByName: null,
    createdByEmail: null,
    updatedAt: overrides.createdAt,
    shortageResolvedAt: null,
    shortageResolvedByName: null,
    transferredAt: null,
    pendingTransferRequestId: null,
    pendingRestoreRequestId: null,
    reportGroupId: null,
    stationId: null,
    factoryOrgUnitId: null,
    ...overrides
  }
}

describe('buildMissingPartDiary', () => {
  const now = new Date(2026, 7, 16, 12, 0, 0)

  it('counts opening stock, new vehicles, and finished vehicles per local day', () => {
    const items = [
      part({
        id: 'a1',
        vehicleId: 'va',
        vin: '1001',
        createdAt: new Date(2026, 7, 10, 9, 0, 0).toISOString()
      }),
      part({
        id: 'b1',
        vehicleId: 'vb',
        vin: '1002',
        createdAt: new Date(2026, 7, 15, 8, 0, 0).toISOString(),
        shortageResolvedAt: new Date(2026, 7, 16, 11, 0, 0).toISOString()
      }),
      part({
        id: 'c1',
        vehicleId: 'vc',
        vin: '1003',
        createdAt: new Date(2026, 7, 16, 7, 0, 0).toISOString()
      })
    ]

    const rows = buildMissingPartDiary(items, '2026-08', now)
    expect(rows).toHaveLength(16)

    const day10 = rows.find(r => r.day === 10)
    expect(day10).toMatchObject({ opening: 0, newVehicles: 1, finished: 0 })

    const day15 = rows.find(r => r.day === 15)
    expect(day15).toMatchObject({ opening: 1, newVehicles: 1, finished: 0 })

    const day16 = rows.find(r => r.day === 16)
    expect(day16).toMatchObject({ opening: 2, newVehicles: 1, finished: 1 })
  })

  it('does not count extra lines on the same vehicle as a new vehicle', () => {
    const items = [
      part({
        id: 'a1',
        vehicleId: 'va',
        vin: '1001',
        createdAt: new Date(2026, 7, 10, 9, 0, 0).toISOString()
      }),
      part({
        id: 'a2',
        vehicleId: 'va',
        vin: '1001',
        createdAt: new Date(2026, 7, 16, 9, 0, 0).toISOString()
      })
    ]
    const day16 = buildMissingPartDiary(items, '2026-08', now).find(r => r.day === 16)
    expect(day16).toMatchObject({ opening: 1, newVehicles: 0, finished: 0 })
  })

  it('lists months through the current month only', () => {
    const items = [
      part({
        id: 'a1',
        vehicleId: 'va',
        vin: '1001',
        createdAt: new Date(2026, 5, 1, 9, 0, 0).toISOString()
      })
    ]
    expect(listDiaryMonthOptions(items, now)[0]).toBe(localMonthKey(now))
    expect(listDiaryMonthOptions(items, now)).toContain('2026-06')
    expect(listDiaryMonthOptions(items, now).every(k => k <= '2026-08')).toBe(true)
  })
})
