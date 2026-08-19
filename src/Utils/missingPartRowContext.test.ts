import { describe, expect, it } from 'vitest'
import type { MissingPartDetail } from '../Types/missingPart'
import { editableMembers, followUpPartsForRow, notesTargetFromPart, vehicleIssuesContext } from './missingPartRowContext'

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

describe('missingPartRowContext', () => {
  const open = part({ id: '1', vehicleId: 'v1', vin: 'VIN1', status: 'open' })
  const closed = part({ id: '2', vehicleId: 'v1', vin: 'VIN1', status: 'closed' })
  const grouped = [
    part({ id: 'a', vehicleId: 'v1', vin: 'VIN1', reportGroupId: 'g1', status: 'open' }),
    part({ id: 'b', vehicleId: 'v2', vin: 'VIN2', reportGroupId: 'g1', status: 'closed' })
  ]

  it('keeps closed report-group members only on the archive tab', () => {
    expect(editableMembers(grouped[0], grouped, 'active').map(p => p.id)).toEqual(['a'])
    expect(editableMembers(grouped[0], grouped, 'history').map(p => p.id)).toEqual(['a', 'b'])
  })

  it('builds vehicle context from the current tab', () => {
    const ctx = vehicleIssuesContext(open, [open, closed], 'active')
    expect(ctx.vehicleId).toBe('v1')
    expect(ctx.parts.map(p => p.id)).toEqual(['1'])
    expect(ctx.allowArchived).toBe(false)
  })

  it('uses the whole open report group for follow-up', () => {
    const openGroup = grouped.map(p => ({ ...p, status: 'open' as const }))
    expect(followUpPartsForRow(openGroup[0], openGroup, 'active').map(p => p.id)).toEqual(['a', 'b'])
  })

  it('maps a part to a notes target', () => {
    expect(notesTargetFromPart(open)).toEqual({
      vehicleId: 'v1',
      vin: 'VIN1',
      modelName: 'SEDAN-A',
      colorName: null,
      colorHex: null
    })
  })
})
