import { describe, expect, it } from 'vitest'
import type { MissingPartDetail } from '../Types/missingPart'
import type { VehicleModel } from '../Types/settings'
import {
  applyFilters,
  buildFamilyVehicleCounts,
  buildModelVehicleCounts,
  buildVariantVehicleSummaries,
  canCompleteVehicle,
  hasActiveMissingPartFilters,
  isSchemaMissing,
  listResolvedMonths,
  MP_FILTER_UNASSIGNED,
  openVehicleShortageLines,
  uniqueVehicleReps,
  completerNames
} from './missingPartPageUtils'
import type { MissingPartFilters } from '../Types/missingPart'

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

function emptyFilters(overrides: Partial<MissingPartFilters> = {}): MissingPartFilters {
  return {
    search: '',
    modelNames: [],
    departments: [],
    completingDepartments: [],
    followUpEmployeeId: '',
    resolvedMonth: null,
    dateFrom: '',
    dateTo: '',
    ...overrides
  }
}

describe('applyFilters', () => {
  const items = [
    part({ id: '1', vehicleId: 'v1', vin: 'VIN001', modelName: 'SEDAN-A', department: 'body' }),
    part({ id: '2', vehicleId: 'v2', vin: 'VIN002', modelName: 'SUV-B', department: 'paint' }),
    part({
      id: '3',
      vehicleId: 'v3',
      vin: 'VIN003',
      modelName: 'SEDAN-A',
      department: 'body',
      reportGroupId: 'grp-1',
      partDescription: 'Mirror'
    }),
    part({
      id: '4',
      vehicleId: 'v4',
      vin: 'VIN004',
      modelName: 'SEDAN-A',
      department: 'body',
      reportGroupId: 'grp-1',
      partDescription: 'Handle'
    })
  ]

  it('filters by model and department', () => {
    const byModel = applyFilters(items, emptyFilters({ modelNames: ['SEDAN-A'] }))
    expect(byModel).toHaveLength(3)

    const byDept = applyFilters(items, emptyFilters({ departments: ['paint'] }))
    expect(byDept).toHaveLength(1)
    expect(byDept[0].vin).toBe('VIN002')
  })

  it('filters by completing department and follow-up employee', () => {
    const withMeta = [
      part({
        id: '1',
        vehicleId: 'v1',
        vin: 'VIN001',
        completingDepartment: 'paint',
        followUpEmployeeId: 'emp-1'
      }),
      part({
        id: '2',
        vehicleId: 'v2',
        vin: 'VIN002',
        completingDepartment: 'body',
        followUpEmployeeId: 'emp-2'
      }),
      part({
        id: '3',
        vehicleId: 'v3',
        vin: 'VIN003',
        completingDepartment: 'paint',
        followUpEmployeeId: 'emp-2'
      })
    ]
    expect(applyFilters(withMeta, emptyFilters({ completingDepartments: ['paint'] }))).toHaveLength(2)
    expect(applyFilters(withMeta, emptyFilters({ followUpEmployeeId: 'emp-1' }))).toHaveLength(1)
    expect(applyFilters(withMeta, emptyFilters({ completingDepartments: ['paint'], followUpEmployeeId: 'emp-2' }))).toHaveLength(1)
  })

  it('filters rows with no causing/completing department or follow-up employee', () => {
    const withGaps = [
      part({ id: '1', vehicleId: 'v1', vin: 'VIN001', department: '', completingDepartment: null, followUpEmployeeId: null }),
      part({ id: '2', vehicleId: 'v2', vin: 'VIN002', department: 'paint', completingDepartment: 'body', followUpEmployeeId: 'emp-1' }),
      part({ id: '3', vehicleId: 'v3', vin: 'VIN003', department: 'body', completingDepartment: null, followUpEmployeeId: null })
    ]
    expect(applyFilters(withGaps, emptyFilters({ departments: [MP_FILTER_UNASSIGNED] }))).toHaveLength(1)
    expect(applyFilters(withGaps, emptyFilters({ completingDepartments: [MP_FILTER_UNASSIGNED] }))).toHaveLength(2)
    expect(applyFilters(withGaps, emptyFilters({ followUpEmployeeId: MP_FILTER_UNASSIGNED }))).toHaveLength(2)
  })

  it('includes all vehicles in a report group when one member matches search', () => {
    const filtered = applyFilters(items, emptyFilters({ search: 'mirror' }))
    const vins = filtered.map(i => i.vin).sort()
    expect(vins).toEqual(['VIN003', 'VIN004'])
  })

  it('filters archive rows by resolved month', () => {
    const archived = [
      part({ id: 'a1', vehicleId: 'va1', vin: 'A001', shortageResolvedAt: '2026-08-10T12:00:00Z' }),
      part({ id: 'a2', vehicleId: 'va2', vin: 'A002', shortageResolvedAt: '2026-07-05T08:00:00Z' }),
      part({ id: 'a3', vehicleId: 'va3', vin: 'A003', shortageResolvedAt: '2026-08-01T00:00:00Z' })
    ]
    const august = applyFilters(archived, emptyFilters({ resolvedMonth: '2026-08' }))
    expect(august.map(i => i.vin).sort()).toEqual(['A001', 'A003'])

    const months = listResolvedMonths(archived)
    expect(months).toEqual(['2026-08', '2026-07'])
  })

  it('filters by createdAt local date range', () => {
    const dated = [
      part({ id: 'd1', vehicleId: 'vd1', vin: 'D001', createdAt: '2026-08-10T12:00:00Z' }),
      part({ id: 'd2', vehicleId: 'vd2', vin: 'D002', createdAt: '2026-08-16T08:00:00Z' }),
      part({ id: 'd3', vehicleId: 'vd3', vin: 'D003', createdAt: '2026-08-20T00:00:00Z' })
    ]
    const mid = applyFilters(dated, emptyFilters({ dateFrom: '2026-08-16', dateTo: '2026-08-16' }))
    expect(mid.map(i => i.vin)).toEqual(['D002'])

    const range = applyFilters(dated, emptyFilters({ dateFrom: '2026-08-10', dateTo: '2026-08-16' }))
    expect(range.map(i => i.vin).sort()).toEqual(['D001', 'D002'])
  })

  it('filters archive rows by shortageResolvedAt date range', () => {
    const archived = [
      part({
        id: 'd1',
        vehicleId: 'vd1',
        vin: 'D001',
        createdAt: '2026-08-01T12:00:00Z',
        shortageResolvedAt: '2026-08-10T12:00:00Z'
      }),
      part({
        id: 'd2',
        vehicleId: 'vd2',
        vin: 'D002',
        createdAt: '2026-08-01T08:00:00Z',
        shortageResolvedAt: '2026-08-16T08:00:00Z'
      })
    ]
    const today = applyFilters(
      archived,
      emptyFilters({ dateFrom: '2026-08-16', dateTo: '2026-08-16' }),
      { dateField: 'resolved' }
    )
    expect(today.map(i => i.vin)).toEqual(['D002'])
  })
})

describe('hasActiveMissingPartFilters', () => {
  it('detects active filters including new fields', () => {
    expect(hasActiveMissingPartFilters(emptyFilters())).toBe(false)
    expect(hasActiveMissingPartFilters(emptyFilters({ completingDepartments: ['body'] }))).toBe(true)
    expect(hasActiveMissingPartFilters(emptyFilters({ followUpEmployeeId: 'emp-1' }))).toBe(true)
    expect(hasActiveMissingPartFilters(emptyFilters({ followUpEmployeeId: MP_FILTER_UNASSIGNED }))).toBe(true)
    expect(hasActiveMissingPartFilters(emptyFilters({ departments: [MP_FILTER_UNASSIGNED] }))).toBe(true)
    expect(hasActiveMissingPartFilters(emptyFilters({ dateFrom: '2026-08-01' }))).toBe(true)
  })
})

describe('vehicle shortage helpers', () => {
  const items = [
    part({ id: '1', vehicleId: 'v1', vin: 'VIN001', status: 'open' }),
    part({ id: '2', vehicleId: 'v1', vin: 'VIN001', status: 'closed' }),
    part({ id: '3', vehicleId: 'v2', vin: 'VIN002', status: 'open', shortageResolvedAt: '2026-02-01T00:00:00Z' })
  ]

  it('detects completable vehicles and unique reps', () => {
    expect(canCompleteVehicle('v1', items)).toBe(true)
    expect(canCompleteVehicle('v2', items)).toBe(false)
    expect(uniqueVehicleReps(items)).toHaveLength(2)
  })

  it('returns only open unresolved lines for a vehicle', () => {
    const open = openVehicleShortageLines('v1', items)
    expect(open).toHaveLength(1)
    expect(open[0].status).toBe('open')
  })
})

describe('model and family counts', () => {
  const items = [
    part({ id: '1', vehicleId: 'v1', vin: 'VIN001', modelName: 'SEDAN-A' }),
    part({ id: '2', vehicleId: 'v1', vin: 'VIN001', modelName: 'SEDAN-A' }),
    part({ id: '3', vehicleId: 'v2', vin: 'VIN002', modelName: 'SEDAN-B' })
  ]

  it('counts unique vehicles per model', () => {
    const { total, byModel } = buildModelVehicleCounts(items)
    expect(total).toBe(2)
    expect(byModel.find(r => r.model === 'SEDAN-A')?.count).toBe(1)
    expect(byModel.find(r => r.model === 'SEDAN-B')?.count).toBe(1)
  })

  it('groups variant vehicles under parent family', () => {
    const models: VehicleModel[] = [
      {
        id: 'fam-1',
        name: 'Family X',
        model_kind: 'family',
        parent_model_id: null,
        parent_company: null,
        agency: null,
        is_active: true
      },
      {
        id: 'var-1',
        name: 'Variant 1',
        model_kind: 'variant',
        parent_model_id: 'fam-1',
        parent_company: null,
        agency: null,
        is_active: true
      }
    ]
    const familyItems = [
      part({ id: '1', vehicleId: 'v1', vin: 'VIN001', modelName: 'Variant 1' }),
      part({ id: '2', vehicleId: 'v2', vin: 'VIN002', modelName: 'Variant 1' })
    ]
    const { total, byFamily } = buildFamilyVehicleCounts(familyItems, models)
    expect(total).toBe(2)
    expect(byFamily).toHaveLength(1)
    expect(byFamily[0].familyName).toBe('Family X')
    expect(byFamily[0].count).toBe(2)
    expect(byFamily[0].variants[0].count).toBe(2)
  })

  it('builds per-variant vehicle summaries', () => {
    const summaries = buildVariantVehicleSummaries(items, 'SEDAN-A')
    expect(summaries).toHaveLength(1)
    expect(summaries[0].vin).toBe('VIN001')
    expect(summaries[0].parts).toHaveLength(2)
  })
})

describe('completerNames', () => {
  it('joins unique completer names', () => {
    expect(
      completerNames([
        part({ id: '1', vehicleId: 'v1', vin: '1', shortageResolvedByName: 'أحمد' }),
        part({ id: '2', vehicleId: 'v1', vin: '1', shortageResolvedByName: ' أحمد ' })
      ])
    ).toBe('أحمد')
  })

  it('shows dash when no completer is stored', () => {
    expect(completerNames([part({ id: '1', vehicleId: 'v1', vin: '1' })])).toBe('—')
  })
})

describe('isSchemaMissing', () => {
  it('detects missing schema errors', () => {
    expect(isSchemaMissing('Could not find the table public.missing_parts')).toBe(true)
    expect(isSchemaMissing('network timeout')).toBe(false)
  })
})
