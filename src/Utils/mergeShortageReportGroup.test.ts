import { describe, expect, it } from 'vitest'
import type { MissingPartDetail } from '../Types/missingPart'
import {
  branchPartsForGroupVehicle,
  listMergeIssueOptions,
  mainPartsForReportGroup,
  planMergeSelectedVehicles,
  shortageIssueKey
} from './mergeShortageReportGroup'

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
    expect(plan.attachIds).toEqual(['a', 'b'])
    expect(plan.detachIds).toEqual([])
    expect(plan.vehicleCount).toBe(2)
    expect(plan.issueLabel).toBe('بدون كراسي بالكامل')
    expect(plan.reportGroupId).toBeTruthy()
  })

  it('asks for a primary reason when issues differ', () => {
    const pool = [
      part({ id: 'a', vehicleId: 'v1', vin: '0001' }),
      part({ id: 'b', vehicleId: 'v2', vin: '0002', partDescription: 'بدون حزام' })
    ]
    const plan = planMergeSelectedVehicles(['v1', 'v2'], pool)
    expect(plan.ok).toBe(false)
    if (plan.ok) return
    expect(plan.error).toBe('needPrimaryReason')
    expect(plan.options).toHaveLength(2)
  })

  it('merges mixed reasons with a chosen primary; display branches only unique issues', () => {
    const seat = 'بدون كراسي بالكامل|stock_shortage|trim'
    const pool = [
      part({ id: 'a', vehicleId: 'v1', vin: '0001' }),
      part({ id: 'a2', vehicleId: 'v1', vin: '0001', partDescription: 'بدون حزام', reason: 'other' }),
      part({ id: 'b', vehicleId: 'v2', vin: '0002' }),
      part({ id: 'c', vehicleId: 'v3', vin: '0003' }),
      part({ id: 'c2', vehicleId: 'v3', vin: '0003', partDescription: 'بدون صاجة', reason: 'damage' })
    ]
    const plan = planMergeSelectedVehicles(['v1', 'v2', 'v3'], pool, seat)
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.attachIds.sort()).toEqual(['a', 'a2', 'b', 'c', 'c2'].sort())
    expect(plan.detachIds).toEqual([])
    expect(plan.issueLabel).toBe('بدون كراسي بالكامل')
    // Seats shared by all 3; belt on v1 and صاجة on v3 branch.
    expect(plan.branchLineCount).toBe(2)
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
    expect(plan.attachIds).toEqual(['a', 'b', 'c'])
  })

  it('rejects a single vehicle', () => {
    const pool = [part({ id: 'a', vehicleId: 'v1', vin: '0001' })]
    expect(planMergeSelectedVehicles(['v1'], pool)).toEqual({ ok: false, error: 'needAtLeastTwo' })
  })

  it('rejects when selection is already one complete group with one issue', () => {
    const pool = [
      part({ id: 'a', vehicleId: 'v1', vin: '0001', reportGroupId: 'grp-1' }),
      part({ id: 'b', vehicleId: 'v2', vin: '0002', reportGroupId: 'grp-1' })
    ]
    expect(planMergeSelectedVehicles(['v1', 'v2'], pool)).toEqual({
      ok: false,
      error: 'alreadyGrouped'
    })
  })

  it('lists merge options by vehicle coverage', () => {
    const parts = [
      part({ id: 'a', vehicleId: 'v1', vin: '1' }),
      part({ id: 'b', vehicleId: 'v2', vin: '2' }),
      part({ id: 'c', vehicleId: 'v3', vin: '3', partDescription: 'بدون حزام' })
    ]
    const options = listMergeIssueOptions(parts)
    expect(options[0]?.label).toBe('بدون كراسي بالكامل')
    expect(options[0]?.vehicleCount).toBe(2)
  })

  it('builds a stable issue key', () => {
    expect(shortageIssueKey(part({ id: 'a', vehicleId: 'v1', vin: '1' }))).toBe(
      'بدون كراسي بالكامل|stock_shortage|trim'
    )
  })

  it('treats reversed combined descriptions as the same when every chassis has them', () => {
    const a = part({
      id: 'a',
      vehicleId: 'v1',
      vin: '0092',
      partDescription: 'بدون اكصدام خلفي \\ بدون كراسي بالكامل'
    })
    const b = part({
      id: 'b',
      vehicleId: 'v2',
      vin: '0096',
      partDescription: 'بدون كراسي بالكامل \\ بدون اكصدام خلفي'
    })
    expect(branchPartsForGroupVehicle('v1', [a, b])).toEqual([])
    expect(branchPartsForGroupVehicle('v2', [a, b])).toEqual([])
    expect(mainPartsForReportGroup([a, b]).map(p => p.partDescription).sort()).toEqual([
      'بدون اكصدام خلفي',
      'بدون كراسي بالكامل'
    ])
  })

  it('keeps only all-shared reasons on the main row and branches the rest', () => {
    const seats = Array.from({ length: 8 }, (_, i) =>
      part({
        id: `s${i}`,
        vehicleId: `v${i}`,
        vin: `100${i}`,
        reportGroupId: 'grp-10',
        partDescription: 'بدون كراسي بالكامل'
      })
    )
    const withBumpers = [
      part({
        id: 'b1',
        vehicleId: 'v8',
        vin: '0092',
        reportGroupId: 'grp-10',
        partDescription: 'بدون اكصدام خلفي \\ بدون كراسي بالكامل'
      }),
      part({
        id: 'b2',
        vehicleId: 'v9',
        vin: '0096',
        reportGroupId: 'grp-10',
        partDescription: 'بدون كراسي بالكامل \\ بدون اكصدام امامي'
      })
    ]
    const scope = [...seats, ...withBumpers]
    expect(mainPartsForReportGroup(scope).map(p => p.partDescription)).toEqual(['بدون كراسي بالكامل'])
    expect(branchPartsForGroupVehicle('v0', scope)).toEqual([])
    expect(branchPartsForGroupVehicle('v8', scope).map(p => p.partDescription)).toEqual(['بدون اكصدام خلفي'])
    expect(branchPartsForGroupVehicle('v9', scope).map(p => p.partDescription)).toEqual(['بدون اكصدام امامي'])
  })
})
