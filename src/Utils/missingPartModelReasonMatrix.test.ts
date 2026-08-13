import { describe, expect, it } from 'vitest'
import type { MissingPartDetail } from '../Types/missingPart'
import { buildModelReasonMatrix } from './missingPartModelReasonMatrix'

function part(
  overrides: Partial<MissingPartDetail> & Pick<MissingPartDetail, 'id' | 'vehicleId' | 'vin' | 'modelName' | 'reason'>
): MissingPartDetail {
  return {
    partDescription: 'x',
    requiredQty: 1,
    installedQty: 0,
    remainingQty: 1,
    department: 'body',
    priority: 'normal',
    status: 'open',
    qcApproved: false,
    isDrItem: false,
    stopperType: 'car_stopper',
    notes: null,
    colorName: null,
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
    ...overrides
  }
}

describe('buildModelReasonMatrix', () => {
  it('counts vehicles and lines per model × reason', () => {
    const items = [
      part({ id: '1', vehicleId: 'v1', vin: '1001', modelName: 'F10', reason: 'paint_delay' }),
      part({ id: '2', vehicleId: 'v1', vin: '1001', modelName: 'F10', reason: 'paint_delay' }),
      part({ id: '3', vehicleId: 'v2', vin: '1002', modelName: 'F10', reason: 'prod_error' }),
      part({ id: '4', vehicleId: 'v3', vin: '1003', modelName: 'K53', reason: 'paint_delay' })
    ]

    const matrix = buildModelReasonMatrix(items, 'active')
    expect(matrix.models).toEqual(['F10', 'K53'])
    expect(matrix.reasonCodes[0]).toBe('paint_delay')
    expect(matrix.grandVehicles).toBe(3)
    expect(matrix.grandLines).toBe(4)

    const f10 = matrix.models.indexOf('F10')
    const paint = matrix.reasonCodes.indexOf('paint_delay')
    const prod = matrix.reasonCodes.indexOf('prod_error')
    expect(matrix.cellVehicles[f10][paint]).toBe(1)
    expect(matrix.cellLines[f10][paint]).toBe(2)
    expect(matrix.cellVehicles[f10][prod]).toBe(1)
    expect(matrix.modelVehicleTotals[f10]).toBe(2)
  })
})
