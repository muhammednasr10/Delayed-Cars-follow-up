import { describe, expect, it } from 'vitest'
import type { FactoryOrgUnit } from '../Types/factoryOrg'
import {
  externalRepairDepartments,
  externalRepairSections,
  externalRepairSiteForSelection,
  externalRepairSites,
  resolveExternalRepairWorkforceUnitId
} from './productionAreaCounts'

function unit(
  id: string,
  name: string,
  parentId: string | null,
  sortOrder = 0
): FactoryOrgUnit {
  return {
    id,
    name,
    parentId,
    unitKind: parentId ? 'section' : 'administration',
    sortOrder,
    isActive: true
  }
}

describe('externalRepairSites / departments', () => {
  const units = [
    unit('prod', 'الإنتاج', null),
    unit('repair', 'الإصلاح الخارجي', 'prod'),
    unit('ghab', 'غبور', 'repair', 1),
    unit('qasr', 'القصراوى', 'repair', 2),
    unit('g-final', 'ريبير نهائى', 'ghab', 1),
    unit('g-paint', 'إصلاح الدهان', 'ghab', 2),
    unit('g-delivery', 'التسليم النهائى', 'ghab', 3),
    unit('q-final', 'ريبير نهائى', 'qasr', 1),
    unit('legacy', 'C.S', 'repair', 9)
  ]
  units[8]!.isActive = false

  it('returns غبور / القصراوى as top tabs under الإصلاح الخارجي', () => {
    expect(externalRepairSites(units).map(u => u.id)).toEqual(['ghab', 'qasr'])
    expect(externalRepairSections(units).map(u => u.id)).toEqual(['ghab', 'qasr'])
  })

  it('returns the three departments under a site', () => {
    expect(externalRepairDepartments(units, 'ghab').map(u => u.id)).toEqual([
      'g-final',
      'g-paint',
      'g-delivery'
    ])
  })

  it('resolves site from a selected department', () => {
    expect(externalRepairSiteForSelection(units, 'g-paint')?.id).toBe('ghab')
    expect(externalRepairSiteForSelection(units, 'ghab')?.id).toBe('ghab')
  })

  it('resolves workforce unit to the first department when a site is selected', () => {
    expect(resolveExternalRepairWorkforceUnitId(units, 'ghab')).toBe('g-final')
    expect(resolveExternalRepairWorkforceUnitId(units, 'g-paint')).toBe('g-paint')
  })

  it('matches legacy الإصلاح الخارجى parent name', () => {
    const legacy = [
      unit('prod', 'الإنتاج', null),
      unit('repair', 'الإصلاح الخارجى', 'prod'),
      unit('ghab', 'غبور', 'repair', 1)
    ]
    expect(externalRepairSites(legacy).map(u => u.id)).toEqual(['ghab'])
  })

  it('prefers top-level إدارة الإصلاح النهائي', () => {
    const topLevel = [
      unit('prod', 'الإنتاج', null),
      unit('final', 'الإصلاح النهائي', null),
      unit('ghab', 'غبور', 'final', 1),
      unit('qasr', 'القصراوى', 'final', 2),
      unit('g-final', 'ريبير نهائى', 'ghab', 1)
    ]
    topLevel[1]!.unitKind = 'administration'
    expect(externalRepairSites(topLevel).map(u => u.id)).toEqual(['ghab', 'qasr'])
    expect(externalRepairDepartments(topLevel, 'ghab').map(u => u.id)).toEqual(['g-final'])
  })

  it('returns empty when external repair is missing', () => {
    expect(externalRepairSites([unit('prod', 'الإنتاج', null)])).toEqual([])
  })
})
