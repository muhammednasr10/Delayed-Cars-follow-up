import { describe, expect, it } from 'vitest'
import type { MissingPartDetail } from '../Types/missingPart'
import { planMergeSelectedVehicles, shortageIssueKey } from './mergeShortageReportGroup'

function part(
  overrides: Partial<MissingPartDetail> & Pick<MissingPartDetail, 'id' | 'vehicleId' | 'vin'>
): MissingPartDetail {
  return {
    partDescription: 'بدون كراسي بالكامل',
    requiredQty: 1,
    installedQty: 0,
    remainingQty: 1,
    reason: 'stock_shortage',
    department: 'trim',
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
    modelName: 'T7-PRO C',
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

describe('planMergeSelectedVehicles', () => {
  it('plans a merge when two singles share the same issue', () => {
    const pool = [
      part({ id: 'a', vehicleId: 'v1', vin: '0001' }),
      part({ id: 'b', vehicleId: 'v2', vin: '0002' })
    ]
    const plan = planMergeSelectedVehicles(['v1', 'v2'], pool)
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.partIds).toEqual(['a', 'b'])
    expect(plan.vehicleCount).toBe(2)
    expect(plan.issueLabel).toBe('بدون كراسي بالكامل')
    expect(plan.reportGroupId).toBeTruthy()
  })

  it('reuses an existing report group id when merging into a group', () => {
    const pool = [
      part({ id: 'a', vehicleId: 'v1', vin: '0001', reportGroupId: 'grp-1' }),
      part({ id: 'b', vehicleId: 'v2', vin: '0002', reportGroupId: 'grp-1' }),
      part({ id: 'c', vehicleId: 'v3', vin: '0003' })
    ]
    const plan = planMergeSelectedVehicles(['v1', 'v2', 'v3'], pool)
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.reportGroupId).toBe('grp-1')
    expect(plan.partIds).toEqual(['a', 'b', 'c'])
  })

  it('rejects different reasons', () => {
    const pool = [
      part({ id: 'a', vehicleId: 'v1', vin: '0001' }),
      part({ id: 'b', vehicleId: 'v2', vin: '0002', partDescription: 'بدون حزام' })
    ]
    expect(planMergeSelectedVehicles(['v1', 'v2'], pool)).toEqual({
      ok: false,
      error: 'differentReasons'
    })
  })

  it('rejects a single vehicle', () => {
    const pool = [part({ id: 'a', vehicleId: 'v1', vin: '0001' })]
    expect(planMergeSelectedVehicles(['v1'], pool)).toEqual({ ok: false, error: 'needAtLeastTwo' })
  })

  it('rejects when selection is already one complete group', () => {
    const pool = [
      part({ id: 'a', vehicleId: 'v1', vin: '0001', reportGroupId: 'grp-1' }),
      part({ id: 'b', vehicleId: 'v2', vin: '0002', reportGroupId: 'grp-1' })
    ]
    expect(planMergeSelectedVehicles(['v1', 'v2'], pool)).toEqual({
      ok: false,
      error: 'alreadyGrouped'
    })
  })

  it('builds a stable issue key', () => {
    expect(shortageIssueKey(part({ id: 'a', vehicleId: 'v1', vin: '1' }))).toBe(
      'بدون كراسي بالكامل|stock_shortage|trim'
    )
  })
})
