import { describe, expect, it } from 'vitest'
import type { FactoryOrgUnit } from '../Types/factoryOrg'
import { externalRepairSections } from './productionAreaCounts'

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

describe('externalRepairSections', () => {
  it('returns active children of الإنتاج / الإصلاح الخارجي', () => {
    const units = [
      unit('prod', 'الإنتاج', null),
      unit('repair', 'الإصلاح الخارجي', 'prod'),
      unit('s2', 'قسم ب', 'repair', 20),
      unit('s1', 'قسم أ', 'repair', 10),
      unit('off', 'موقوف', 'repair', 5)
    ]
    units[4].isActive = false
    expect(externalRepairSections(units).map(u => u.id)).toEqual(['s1', 's2'])
  })

  it('returns empty when external repair is missing', () => {
    expect(externalRepairSections([unit('prod', 'الإنتاج', null)])).toEqual([])
  })
})
