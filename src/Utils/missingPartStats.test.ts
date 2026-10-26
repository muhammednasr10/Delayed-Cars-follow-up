import { describe, expect, it } from 'vitest'
import type { MissingPartDetail } from '../Types/missingPart'
import { buildStoppageReportByDepartment } from './missingPartStats'

function part(
  overrides: Partial<MissingPartDetail> & Pick<MissingPartDetail, 'id' | 'vehicleId' | 'vin'>
): MissingPartDetail {
  return {
    partDescription: 'بدون كراسي',
    requiredQty: 1,
    installedQty: 0,
    remainingQty: 1,
    reason: 'stock_shortage',
    department: 'stores',
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
    modelName: 'T8',
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
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
    shortageResolvedAt: null,
    transferredAt: null,
    reportGroupId: null,
    stationId: null,
    factoryOrgUnitId: null,
    shortageResolvedByName: null,
    pendingTransferRequestId: null,
    pendingRestoreRequestId: null,
    ...overrides
  }
}

describe('buildStoppageReportByDepartment', () => {
  it('counts a vehicle once per department and lists reasons under it', () => {
    const rows = buildStoppageReportByDepartment([
      part({ id: '1', vehicleId: 'v1', vin: '5052', department: 'stores', partDescription: 'بدون كراسي' }),
      part({ id: '2', vehicleId: 'v1', vin: '5052', department: 'stores', partDescription: 'خرطوم' }),
      part({ id: '3', vehicleId: 'v2', vin: '5053', department: 'body', partDescription: 'بدون صاجة' }),
      part({ id: '4', vehicleId: 'v1', vin: '5052', department: 'body', partDescription: 'بدون صاجة' })
    ])

    expect(rows.map(row => [row.department, row.vehicleCount])).toEqual([
      ['body', 2],
      ['stores', 1]
    ])
    const stores = rows.find(row => row.department === 'stores')
    expect(stores?.reasons).toHaveLength(2)
    expect(stores?.reasons.map(reason => reason.reason).sort()).toEqual(['بدون كراسي', 'خرطوم'])
  })

  it('skips archived and cancelled lines', () => {
    const rows = buildStoppageReportByDepartment([
      part({ id: '1', vehicleId: 'v1', vin: '1', department: 'stores' }),
      part({ id: '2', vehicleId: 'v2', vin: '2', department: 'stores', shortageResolvedAt: '2026-01-02T00:00:00Z' }),
      part({ id: '3', vehicleId: 'v3', vin: '3', department: 'stores', status: 'cancelled' })
    ])
    expect(rows).toEqual([
      {
        department: 'stores',
        vehicleCount: 1,
        lineCount: 1,
        reasons: [{ reason: 'بدون كراسي', reasonClass: 'stock_shortage', vehicleCount: 1, lineCount: 1 }]
      }
    ])
  })
})
