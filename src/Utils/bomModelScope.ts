import type { BomItemDetail } from '../Types/bom'
import { modelQtyFromBomRow, parseApplicableModelNames } from './bomQtyByModel'
import {
  GD_AGGREGATE_FAMILY,
  GD_VARIANT_NAMES,
  inferParentNameFromVariant,
  isGdAggregateFamily,
  type ModelFamilyGroup
} from './vehicleModelHierarchy'
import type { VehicleModel } from '../Types/settings'

export type BomLineScope = 'main' | 'gd'

export function isGdModelName(name: string): boolean {
  const n = name.trim().toUpperCase()
  if (!n) return false
  if (n === GD_AGGREGATE_FAMILY) return true
  if (GD_VARIANT_NAMES.has(n)) return true
  return inferParentNameFromVariant(n) === GD_AGGREGATE_FAMILY
}

export function bomItemModelNames(row: BomItemDetail): string[] {
  const names = new Set<string>()
  if (row.vehicle_model_name?.trim()) names.add(row.vehicle_model_name.trim())
  for (const n of parseApplicableModelNames(row.applicable_models_text)) names.add(n)
  for (const e of modelQtyFromBomRow(row)) {
    if (e.modelName?.trim()) names.add(e.modelName.trim())
  }
  return [...names]
}

export function bomItemBelongsToGd(row: BomItemDetail): boolean {
  if (row.model_family && isGdAggregateFamily(row.model_family)) return true
  return bomItemModelNames(row).some(isGdModelName)
}

export function bomItemBelongsToMain(row: BomItemDetail): boolean {
  const names = bomItemModelNames(row)
  if (names.length === 0) return !bomItemBelongsToGd(row)
  return names.some(n => !isGdModelName(n))
}

export function filterBomItemsByLineScope(items: BomItemDetail[], scope: BomLineScope): BomItemDetail[] {
  if (scope === 'gd') return items.filter(bomItemBelongsToGd)
  return items.filter(bomItemBelongsToMain)
}

export function filterModelFamilyPicker(
  picker: { groups: ModelFamilyGroup[]; orphanVariants: VehicleModel[] },
  scope: BomLineScope
): { groups: ModelFamilyGroup[]; orphanVariants: VehicleModel[] } {
  if (scope === 'gd') {
    return {
      groups: picker.groups.filter(g => isGdAggregateFamily(g.family.name)),
      orphanVariants: picker.orphanVariants.filter(m => isGdModelName(m.name))
    }
  }
  return {
    groups: picker.groups.filter(g => !isGdAggregateFamily(g.family.name)),
    orphanVariants: picker.orphanVariants.filter(m => !isGdModelName(m.name))
  }
}
