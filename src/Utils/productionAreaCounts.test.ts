import { describe, expect, it } from 'vitest'
import type { FactoryOrgUnit } from '../Types/factoryOrg'
import {
  attendanceByProductionArea,
  openShortagesByProductionArea,
  productionAreaOrgUnitId,
  shortageVehicleCountsByArea
} from './productionAreaCounts'

function unit(id: string, name: string, parentId: string | null): FactoryOrgUnit {
  return { id, name, parentId, unitKind: parentId ? 'section' : 'administration', sortOrder: 0, isActive: true }
}

const units = [
  unit('prod', 'الإنتاج', null),
  unit('body', 'البودى', 'prod'),
  unit('paint', 'الدهان', 'prod'),
  unit('assembly', 'التجميع', 'prod'),
  unit('trim', 'تريم أ&ب', 'assembly'),
  unit('repair', 'الإصلاح الخارجي', 'prod')
]

describe('productionAreaOrgUnitId', () => {
  it('matches area names under production, including the body alef variant', () => {
    expect(productionAreaOrgUnitId(units, 'body')).toBe('body')
    expect(productionAreaOrgUnitId(units, 'paint')).toBe('paint')
    expect(productionAreaOrgUnitId(units, 'assembly')).toBe('assembly')
    expect(productionAreaOrgUnitId(units, 'externalRepair')).toBe('repair')
  })

  it('returns null when the area is missing from the org tree', () => {
    expect(productionAreaOrgUnitId([units[0], units[3]], 'paint')).toBeNull()
  })
})

describe('attendanceByProductionArea', () => {
  const employees = [
    { id: 'a1', isActive: true, factoryOrgUnitId: 'trim' },
    { id: 'a2', isActive: true, factoryOrgUnitId: 'assembly' },
    { id: 'b1', isActive: true, factoryOrgUnitId: 'body' },
    { id: 'gone', isActive: false, factoryOrgUnitId: 'body' }
  ]

  it('counts present staff inside each area subtree and leaves a missing area empty', () => {
    const counts = attendanceByProductionArea(
      employees,
      units.filter(item => item.id !== 'paint'),
      [{ employeeId: 'a2', workDate: '2026-10-12', status: 'absent' }],
      '2026-10-12',
      'work'
    )
    expect(counts.assembly).toEqual({ present: 1, workforce: 2 })
    expect(counts.body).toEqual({ present: 1, workforce: 1 })
    expect(counts.paint).toBeNull()
    expect(counts.externalRepair).toEqual({ present: 0, workforce: 0 })
  })
})

describe('openShortagesByProductionArea', () => {
  it('counts open vehicles whose org unit sits inside the area', () => {
    const counts = openShortagesByProductionArea(
      [
        { vehicleId: 'v1', factoryOrgUnitId: 'trim', shortageResolvedAt: null },
        { vehicleId: 'v1', factoryOrgUnitId: 'trim', shortageResolvedAt: null },
        { vehicleId: 'v2', factoryOrgUnitId: 'body', shortageResolvedAt: null },
        { vehicleId: 'v3', factoryOrgUnitId: 'assembly', shortageResolvedAt: '2026-10-01' },
        { vehicleId: 'v4', factoryOrgUnitId: null, shortageResolvedAt: null }
      ],
      units
    )
    expect(counts.assembly).toBe(1)
    expect(counts.body).toBe(1)
    expect(counts.paint).toBe(0)
    expect(counts.externalRepair).toBe(0)
  })
})

describe('shortageVehicleCountsByArea', () => {
  it('splits open and archived vehicles inside the body subtree', () => {
    const nested = unit('body-line', 'خط البودي', 'body')
    expect(
      shortageVehicleCountsByArea(
        [
          { vehicleId: 'v1', factoryOrgUnitId: 'body-line', shortageResolvedAt: null },
          { vehicleId: 'v2', factoryOrgUnitId: 'body', shortageResolvedAt: '2026-10-01' },
          { vehicleId: 'v3', factoryOrgUnitId: 'assembly', shortageResolvedAt: null }
        ],
        [...units, nested],
        'body'
      )
    ).toEqual({ active: 1, archive: 1 })
    expect(shortageVehicleCountsByArea([], units.filter(item => item.id !== 'body'), 'body')).toBeNull()
  })
})
