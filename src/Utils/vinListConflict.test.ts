import { describe, expect, it } from 'vitest'
import type { MissingPartDetail } from '../Types/missingPart'
import {
  findUnresolvedVinConflict,
  foreignActivePartsForVin,
  normalizeVinKey,
  partIdsToClearFromList,
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
    priority: 'normal',
    status: 'open',
    qcApproved: false,
    isDrItem: false,
    stopperType: 'car_stopper',
    notes: null,
    modelName: 'M',
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
    createdAt: '',
    updatedAt: '',
    shortageResolvedAt: null,
    reportGroupId: null,
    stationId: null,
    factoryOrgUnitId: null,
    ...overrides
  }
}

describe('vinListConflict', () => {
  const list = [part({ id: 'a', vin: '7286' }), part({ id: 'b', vin: '7292' })]

  it('sanitizes chassis digits', () => {
    expect(sanitizeChassisDigits('12ab34')).toBe('1234')
    expect(sanitizeChassisDigits('12345')).toBe('1234')
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
