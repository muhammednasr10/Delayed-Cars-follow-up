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
    followUpEmployeeIds: [],
    followUpEmployeeNames: null,
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

  it('nests extra issues on a grouped VIN under the report group', () => {
    const items = [
      part({
        id: 'g1',
        vehicleId: 'v1',
        vin: '0087',
        reportGroupId: 'grp-1',
        partDescription: 'بدون كراسي بالكامل',
        createdAt: '2026-01-01T10:00:00Z'
      }),
      part({
        id: 'g2',
        vehicleId: 'v2',
        vin: '0888',
        reportGroupId: 'grp-1',
        partDescription: 'بدون كراسي بالكامل',
        createdAt: '2026-01-01T10:00:00Z'
      }),
      part({
        id: 'g3',
        vehicleId: 'v3',
        vin: '0889',
        reportGroupId: 'grp-1',
        partDescription: 'بدون كراسي بالكامل',
        createdAt: '2026-01-01T10:00:00Z'
      }),
      part({
        id: 'g4',
        vehicleId: 'v4',
        vin: '0890',
        reportGroupId: 'grp-1',
        partDescription: 'بدون كراسي بالكامل',
        createdAt: '2026-01-01T10:00:00Z'
      }),
      part({
        id: 'extra',
        vehicleId: 'v1',
        vin: '0087',
        reportGroupId: null,
        partDescription: 'بدون حزام امان',
        requiredQty: 1,
        installedQty: 0,
        createdAt: '2026-01-02T10:00:00Z'
      })
    ]
    const tableRows = buildMissingPartTableRows(items)
    expect(tableRows.map(r => r.kind)).toEqual(['report-group', 'group-branch'])
    const branch = tableRows[1]
    expect(branch?.kind).toBe('group-branch')
    if (branch?.kind === 'group-branch') {
      expect(branch.vehicleId).toBe('v1')
      expect(branch.parts.map(p => p.id)).toEqual(['extra'])
      expect(branch.parentKey).toBe('g-grp-1')
    }
  })

  it('does not branch when two chassis share the same reasons in different order', () => {
    const items = [
      part({ id: '1', vehicleId: 'v1', vin: '0087', reportGroupId: 'grp-1', partDescription: 'بدون كراسي بالكامل' }),
      part({ id: '2', vehicleId: 'v2', vin: '0088', reportGroupId: 'grp-1', partDescription: 'بدون كراسي بالكامل' }),
      part({
        id: '3',
        vehicleId: 'v3',
        vin: '0092',
        reportGroupId: 'grp-1',
        partDescription: 'بدون اكصدام خلفي \\ بدون كراسي بالكامل'
      }),
      part({
        id: '4',
        vehicleId: 'v4',
        vin: '0096',
        reportGroupId: 'grp-1',
        partDescription: 'بدون كراسي بالكامل \\ بدون اكصدام خلفي'
      })
    ]
    const tableRows = buildMissingPartTableRows(items)
    expect(tableRows.map(r => r.kind)).toEqual(['report-group'])
  })

  it('branches only a chassis with a reason no other group member shares', () => {
    const items = [
      part({ id: '1', vehicleId: 'v1', vin: '0087', reportGroupId: 'grp-1', partDescription: 'Seat' }),
      part({ id: '2', vehicleId: 'v2', vin: '0088', reportGroupId: 'grp-1', partDescription: 'Seat' }),
      part({ id: '3', vehicleId: 'v1', vin: '0087', partDescription: 'Belt', reason: 'other' })
    ]
    const tableRows = buildMissingPartTableRows(items)
    expect(tableRows.filter(r => r.kind === 'group-branch')).toHaveLength(1)
    const branch = tableRows.find(r => r.kind === 'group-branch')
    if (branch?.kind === 'group-branch') {
      expect(branch.parts.map(p => p.id)).toEqual(['3'])
    }
  })
})
