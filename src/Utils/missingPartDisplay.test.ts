import { describe, expect, it } from 'vitest'
import type { MissingPartDetail } from '../Types/missingPart'
import {
  aggregateQty,
  buildMissingPartTableRows,
  hasPendingInstall,
  isReportGroup,
  toDisplayRows,
  vehicleIdsFromTableRow
} from './missingPartDisplay'

function part(overrides: Partial<MissingPartDetail> & Pick<MissingPartDetail, 'id' | 'vehicleId' | 'vin'>): MissingPartDetail {
  return {
    partDescription: 'Bracket',
    requiredQty: 2,
    installedQty: 1,
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

describe('missingPartDisplay', () => {
  it('groups rows with the same reportGroupId', () => {
    const items = [
      part({ id: '1', vehicleId: 'v1', vin: 'VIN001', reportGroupId: 'grp-1' }),
      part({ id: '2', vehicleId: 'v2', vin: 'VIN002', reportGroupId: 'grp-1' }),
      part({ id: '3', vehicleId: 'v3', vin: 'VIN003' })
    ]
    const rows = toDisplayRows(items)
    expect(rows.some(r => r.kind === 'group' && r.items.length === 2)).toBe(true)
    expect(isReportGroup(items[0], items)).toBe(true)
  })

  it('collapses multi-reason lines into one vehicle row', () => {
    const items = [
      part({ id: '1', vehicleId: 'v1', vin: 'VIN001', reason: 'stock_shortage', createdAt: '2026-01-02T10:00:00Z' }),
      part({
        id: '2',
        vehicleId: 'v1',
        vin: 'VIN001',
        reason: 'quality_rejection',
        partDescription: 'Mirror',
        createdAt: '2026-01-01T10:00:00Z'
      }),
      part({ id: '3', vehicleId: 'v2', vin: 'VIN002' })
    ]
    const tableRows = buildMissingPartTableRows(items)
    const vehicleRow = tableRows.find(r => r.kind === 'vehicle')
    expect(vehicleRow?.kind).toBe('vehicle')
    if (vehicleRow?.kind === 'vehicle') {
      expect(vehicleRow.parts).toHaveLength(2)
      expect(vehicleIdsFromTableRow(vehicleRow)).toEqual(['v1'])
    }
    expect(tableRows.filter(r => r.kind === 'single')).toHaveLength(1)
  })

  it('sorts active shortages oldest first and archive newest resolved first', () => {
    const older = part({ id: '1', vehicleId: 'v1', vin: '1001', createdAt: '2026-01-01T08:00:00Z' })
    const newer = part({ id: '2', vehicleId: 'v2', vin: '1002', createdAt: '2026-01-03T08:00:00Z' })
    const active = buildMissingPartTableRows([newer, older], 'created-asc')
    expect(active.map(r => (r.kind === 'single' ? r.item.id : ''))).toEqual(['1', '2'])

    const finishedOld = part({
      id: '3',
      vehicleId: 'v3',
      vin: '1003',
      createdAt: '2026-01-01T08:00:00Z',
      shortageResolvedAt: '2026-02-01T10:00:00Z'
    })
    const finishedNew = part({
      id: '4',
      vehicleId: 'v4',
      vin: '1004',
      createdAt: '2026-01-02T08:00:00Z',
      shortageResolvedAt: '2026-03-01T10:00:00Z'
    })
    const archive = buildMissingPartTableRows([finishedOld, finishedNew], 'resolved-desc')
    expect(archive.map(r => (r.kind === 'single' ? r.item.id : ''))).toEqual(['4', '3'])
  })

  it('sorts current shortages by model then oldest date', () => {
    const laterF10 = part({
      id: '1',
      vehicleId: 'v1',
      vin: '1001',
      modelName: 'F10',
      createdAt: '2026-03-01T08:00:00Z'
    })
    const earlierT4 = part({
      id: '2',
      vehicleId: 'v2',
      vin: '1002',
      modelName: 'T4-PRO L',
      createdAt: '2026-01-01T08:00:00Z'
    })
    const earlierF10 = part({
      id: '3',
      vehicleId: 'v3',
      vin: '1003',
      modelName: 'F10',
      createdAt: '2026-02-01T08:00:00Z'
    })
    const rows = buildMissingPartTableRows([laterF10, earlierT4, earlierF10], 'created-asc')
    expect(rows.map(r => (r.kind === 'single' ? r.item.id : ''))).toEqual(['3', '1', '2'])
  })

  it('aggregates install quantities and pending state', () => {
    const items = [
      part({ id: '1', vehicleId: 'v1', vin: 'VIN001', requiredQty: 2, installedQty: 2 }),
      part({ id: '2', vehicleId: 'v1', vin: 'VIN001', requiredQty: 1, installedQty: 0 })
    ]
    expect(hasPendingInstall(items)).toBe(true)
    expect(aggregateQty(items)).toEqual({ installed: 2, required: 3 })
  })
})
