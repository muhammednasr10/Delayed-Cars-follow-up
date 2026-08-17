import { describe, expect, it } from 'vitest'
import type { MissingPartDetail } from '../Types/missingPart'
import {
  buildMissingPartSearchSuggestions,
  findMissingPartSearchSuggestions
} from './missingPartSearch'

function part(overrides: Partial<MissingPartDetail> & Pick<MissingPartDetail, 'id' | 'vehicleId' | 'vin'>): MissingPartDetail {
  return {
    partDescription: 'Bracket',
    requiredQty: 1,
    installedQty: 0,
    remainingQty: 1,
    reason: 'stock_shortage',
    department: 'body',
    completingDepartment: null,
    followUpEmployeeId: null,
    followUpEmployeeName: null,
    priority: 'normal',
    status: 'open',
    qcApproved: false,
    isDrItem: false,
    stopperType: 'car_stopper',
    notes: null,
    modelName: 'SEDAN-A',
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

describe('missingPartSearch', () => {
  const items = [
    part({ id: '1', vehicleId: 'v1', vin: 'ABC123', partDescription: 'Door handle', modelName: 'SEDAN-A' }),
    part({ id: '2', vehicleId: 'v2', vin: 'XYZ999', partDescription: 'Mirror', modelName: 'SUV-B' })
  ]

  it('deduplicates search suggestions', () => {
    const pool = buildMissingPartSearchSuggestions([
      ...items,
      part({ id: '3', vehicleId: 'v1', vin: 'ABC123', partDescription: 'Other', modelName: 'SEDAN-A' })
    ])
    expect(pool.filter(s => s.kind === 'vin' && s.value === 'ABC123')).toHaveLength(1)
    expect(pool.some(s => s.kind === 'model' && s.value === 'SUV-B')).toBe(true)
  })

  it('ranks exact matches above partial matches', () => {
    const pool = buildMissingPartSearchSuggestions(items)
    const hits = findMissingPartSearchSuggestions(pool, 'ABC123')
    expect(hits[0]?.value).toBe('ABC123')

    const partial = findMissingPartSearchSuggestions(pool, 'mir')
    expect(partial[0]?.value).toBe('Mirror')
  })

  it('returns empty list for blank query', () => {
    const pool = buildMissingPartSearchSuggestions(items)
    expect(findMissingPartSearchSuggestions(pool, '   ')).toEqual([])
  })
})
