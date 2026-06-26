import type { VehicleModel } from '../Types/settings'

export type ModelKind = VehicleModel['model_kind']

export type ModelFamilyGroup = {
  family: VehicleModel
  variants: VehicleModel[]
}

/** Models that can be assigned to a vehicle / shortage / BOM line (not a family row). */
export function isAssignableModel(m: VehicleModel): boolean {
  return m.model_kind === 'variant'
}

const GD_VARIANT_NAMES = new Set(['K50', 'K51', 'F10', 'K52', 'K53', 'F12'])

/** GD: one aggregate target on the family row. */
export const GD_AGGREGATE_FAMILY = 'GD'

/** T4 / T7 / T8 share one combined plan target (stored in production_plan_group_targets). */
export const T_LINE_FAMILY_NAMES = new Set(['T4', 'T7', 'T8'])

export function isGdAggregateFamily(familyName: string): boolean {
  return familyName.trim().toUpperCase() === GD_AGGREGATE_FAMILY
}

export function isTLineFamily(familyName: string): boolean {
  return T_LINE_FAMILY_NAMES.has(familyName.trim().toUpperCase())
}

export type PlanEntryMode = 'family_aggregate' | 'combined_line_member' | 'per_variant'

export function planEntryModeForFamily(familyName: string): PlanEntryMode {
  if (isGdAggregateFamily(familyName)) return 'family_aggregate'
  if (isTLineFamily(familyName)) return 'combined_line_member'
  return 'per_variant'
}

export function inferParentNameFromVariant(name: string): string | null {
  const n = name.trim().toUpperCase()
  if (GD_VARIANT_NAMES.has(n)) return 'GD'
  const m = n.match(/^(T4|T7|T8)([A-Z0-9]+)$/)
  if (!m || m[1] === n) return null
  return m[1]
}

export function buildModelFamilyGroups(models: VehicleModel[]): {
  groups: ModelFamilyGroup[]
  orphanVariants: VehicleModel[]
} {
  const families = models.filter(m => m.model_kind === 'family').sort((a, b) => a.name.localeCompare(b.name))
  const variants = models.filter(m => m.model_kind === 'variant')
  const familyIds = new Set(families.map(f => f.id))

  const groups: ModelFamilyGroup[] = families.map(family => ({
    family,
    variants: variants
      .filter(v => v.parent_model_id === family.id)
      .sort((a, b) => a.name.localeCompare(b.name))
  }))

  const orphanVariants = variants
    .filter(v => !v.parent_model_id || !familyIds.has(v.parent_model_id))
    .sort((a, b) => a.name.localeCompare(b.name))

  return { groups, orphanVariants }
}

export function variantModelsForLine(models: VehicleModel[], linePrefix: string): VehicleModel[] {
  const p = linePrefix.toUpperCase()
  return models.filter(
    m =>
      isAssignableModel(m) &&
      (m.name.toUpperCase() === p || m.name.toUpperCase().startsWith(p))
  )
}
