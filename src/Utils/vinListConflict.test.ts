import { describe, expect, it } from 'vitest'
import type { MissingPartDetail } from '../Types/missingPart'
import {
  duplicateVinIndices,
  findUnresolvedVinConflict,
  foreignActivePartsForVin,
  isRepeatedShortageVin,
  normalizeVinKey,
  partIdsToClearFromList,
  repeatedShortageVinKeys,
  sanitizeChassisDigits,
  vinInActiveList
} from './vinListConflict'

function part(overrides: Partial<MissingPartDetail> & Pick<MissingPartDetail, 'id' | 'vin'>): MissingPartDetail {
  return {
    vehicleId: 'v1',
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
    modelName: 'M',
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
    createdAt: '',
    updatedAt: '',
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

describe('vinListConflict', () => {
  const list = [part({ id: 'a', vin: '7286' }), part({ id: 'b', vin: '7292' })]

  it('sanitizes chassis digits', () => {
    expect(sanitizeChassisDigits('12ab34')).toBe('1234')
    expect(sanitizeChassisDigits('12345')).toBe('1234')
  })

  it('marks duplicate chassis indices', () => {
    expect([...duplicateVinIndices(['7286', '7292', '7286'])].sort()).toEqual([0, 2])
    expect(duplicateVinIndices(['7286', '', '7286']).has(1)).toBe(false)
    expect(duplicateVinIndices(['7286', '7292']).size).toBe(0)
  })

  it('marks vins repeated across open and archive or multiple vehicles', () => {
    expect(
      repeatedShortageVinKeys([
        part({ id: 'a', vin: '6681', vehicleId: 'v1', shortageResolvedAt: null }),
        part({ id: 'b', vin: '6681', vehicleId: 'v1', shortageResolvedAt: '2026-08-01T00:00:00Z' })
      ]).has('6681')
    ).toBe(true)
    expect(
      repeatedShortageVinKeys([
        part({ id: 'a', vin: '6681', vehicleId: 'v1' }),
        part({ id: 'b', vin: '6681', vehicleId: 'v2' })
      ]).has('6681')
    ).toBe(true)
    expect(
      repeatedShortageVinKeys([
        part({ id: 'a', vin: '6681', vehicleId: 'v1' }),
        part({ id: 'b', vin: '6681', vehicleId: 'v1' }),
        part({ id: 'c', vin: '6683', vehicleId: 'v3' })
      ]).has('6681')
    ).toBe(false)
    expect(isRepeatedShortageVin('6683', new Set(['6683']))).toBe(true)
  })

  it('detects foreign active vins', () => {
    const owned = new Set(['a'])
    expect(vinInActiveList('7286', list, owned)).toBe(false)
    expect(vinInActiveList('7292', list, owned)).toBe(true)
    expect(foreignActivePartsForVin('7292', list, owned).map(p => p.id)).toEqual(['b'])
  })

  it('finds unresolved conflicts and clear ids', () => {
    const empty = new Set<string>()
    expect(findUnresolvedVinConflict(['7292'], empty, list, empty)).toBe('7292')
    expect(findUnresolvedVinConflict(['7292'], new Set(['7292']), list, empty)).toBe(null)
    expect(partIdsToClearFromList(new Set(['7292']), ['7292'], list, empty)).toEqual(['b'])
    expect(normalizeVinKey(' 7286 ')).toBe('7286')
  })
})
