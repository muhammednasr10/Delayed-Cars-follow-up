import { describe, expect, it } from 'vitest'
import { catalogVariantsForLine, defaultIplCompareModelNames } from './vehicleModelHierarchy'
import type { VehicleModel } from '../Types/settings'

function model(
  overrides: Partial<VehicleModel> & Pick<VehicleModel, 'id' | 'name' | 'model_kind'>
): VehicleModel {
  return {
    is_active: true,
    parent_model_id: null,
    sort_order: 0,
    ...overrides
  } as VehicleModel
}

describe('defaultIplCompareModelNames', () => {
  it('selects all variants except T70 family', () => {
    const t8 = model({ id: 'f-t8', name: 'T8', model_kind: 'family' })
    const t70 = model({ id: 'f-t70', name: 'T70', model_kind: 'family' })
    const gd = model({ id: 'f-gd', name: 'GD', model_kind: 'family' })
    const variants = [
      model({ id: 'v1', name: 'T8L7', model_kind: 'variant', parent_model_id: 'f-t8' }),
      model({ id: 'v2', name: 'T8L5', model_kind: 'variant', parent_model_id: 'f-t8' }),
      model({ id: 'v3', name: 'T70A', model_kind: 'variant', parent_model_id: 'f-t70' }),
      model({ id: 'v4', name: 'T70B', model_kind: 'variant', parent_model_id: 'f-t70' }),
      model({ id: 'v5', name: 'F10', model_kind: 'variant', parent_model_id: 'f-gd' })
    ]
    const all = [t8, t70, gd, ...variants]
    expect(defaultIplCompareModelNames(all, variants).sort()).toEqual(['F10', 'T8L5', 'T8L7'])
  })
})

describe('catalogVariantsForLine', () => {
  it('lists T4 children even when the name has a hyphen', () => {
    const t4 = model({ id: 'f-t4', name: 'T4', model_kind: 'family' })
    const variants = [
      model({ id: 'l', name: 'T4-PRO L', model_kind: 'variant', parent_model_id: 'f-t4' }),
      model({ id: 'c', name: 'T4-PRO C', model_kind: 'variant', parent_model_id: 'f-t4' }),
      model({ id: 't8', name: 'T8-PRO', model_kind: 'variant', parent_model_id: 'f-t8' })
    ]
    const t8 = model({ id: 'f-t8', name: 'T8', model_kind: 'family' })
    expect(catalogVariantsForLine([t4, t8, ...variants], 'T4').map(m => m.name)).toEqual([
      'T4-PRO C',
      'T4-PRO L'
    ])
  })
})
