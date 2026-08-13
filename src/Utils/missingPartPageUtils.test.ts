import { describe, expect, it } from 'vitest'
import type { MissingPartDetail } from '../Types/missingPart'
import type { VehicleModel } from '../Types/settings'
import {
  applyFilters,
  buildFamilyVehicleCounts,
  buildModelVehicleCounts,
  buildVariantVehicleSummaries,
  canCompleteVehicle,
  isSchemaMissing,
  listResolvedMonths,
  openVehicleShortageLines,
  uniqueVehicleReps
} from './missingPartPageUtils'

function part(overrides: Partial<MissingPartDetail> & Pick<MissingPartDetail, 'id' | 'vehicleId' | 'vin'>): MissingPartDetail {
  return {
    partDescription: 'Bracket',
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
    modelName: 'SEDAN-A',
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
    const byModel = applyFilters(items, { search: '', modelNames: ['SEDAN-A'], departments: [], resolvedMonth: null })
    expect(byModel).toHaveLength(3)

    const byDept = applyFilters(items, { search: '', modelNames: [], departments: ['paint'], resolvedMonth: null })
    expect(byDept).toHaveLength(1)
    expect(byDept[0].vin).toBe('VIN002')
  })

  it('includes all vehicles in a report group when one member matches search', () => {
    const filtered = applyFilters(items, { search: 'mirror', modelNames: [], departments: [], resolvedMonth: null })
    const vins = filtered.map(i => i.vin).sort()
    expect(vins).toEqual(['VIN003', 'VIN004'])
  })

  it('filters archive rows by resolved month', () => {
    const archived = [
      part({ id: 'a1', vehicleId: 'va1', vin: 'A001', shortageResolvedAt: '2026-08-10T12:00:00Z' }),
      part({ id: 'a2', vehicleId: 'va2', vin: 'A002', shortageResolvedAt: '2026-07-05T08:00:00Z' }),
      part({ id: 'a3', vehicleId: 'va3', vin: 'A003', shortageResolvedAt: '2026-08-01T00:00:00Z' })
    ]
    const august = applyFilters(archived, {
      search: '',
      modelNames: [],
      departments: [],
      resolvedMonth: '2026-08'
    })
    expect(august.map(i => i.vin).sort()).toEqual(['A001', 'A003'])

    const months = listResolvedMonths(archived)
    expect(months).toEqual(['2026-08', '2026-07'])
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

describe('isSchemaMissing', () => {
  it('detects missing schema errors', () => {
    expect(isSchemaMissing('Could not find the table public.missing_parts')).toBe(true)
    expect(isSchemaMissing('network timeout')).toBe(false)
  })
})
