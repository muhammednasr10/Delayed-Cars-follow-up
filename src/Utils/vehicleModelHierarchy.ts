import type { VehicleModel } from '../Types/settings'

export type ModelKind = VehicleModel['model_kind']

export type ModelFamilyGroup = {
  family: VehicleModel
  variants: VehicleModel[]
}

/** Models that can be assigned to a vehicle / shortage / BOM line (not a family row). */
export function isAssignableModel(m: VehicleModel): boolean {
  return m.model_kind === 'variant' && m.is_active
}

/** Active variant with an active parent family (if any). */
export function isSelectableVehicleModel(m: VehicleModel, allModels: VehicleModel[]): boolean {
  if (!isAssignableModel(m)) return false
  if (!m.parent_model_id) return true
  const parent = allModels.find(p => p.id === m.parent_model_id)
  return Boolean(parent?.is_active)
}

export function selectableVehicleModels(models: VehicleModel[]): VehicleModel[] {
  const seen = new Set<string>()
  return models
    .filter(m => isSelectableVehicleModel(m, models))
    .filter(m => {
      if (seen.has(m.id)) return false
      seen.add(m.id)
      return true
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

const GD_VARIANT_NAMES = new Set(['K50', 'K51', 'F10', 'K52', 'K53', 'F12'])
export { GD_VARIANT_NAMES }

export const GD_AGGREGATE_FAMILY = 'GD'

export const T_LINE_FAMILY_NAMES = new Set(['T4', 'T7', 'T8'])

export function isGdAggregateFamily(familyName: string): boolean {
  return familyName.trim().toUpperCase() === GD_AGGREGATE_FAMILY
}

export function isTLineFamily(familyName: string): boolean {
  return T_LINE_FAMILY_NAMES.has(familyName.trim().toUpperCase())
}

/**
 * وضع إدخال الخطة يُستنتج من البيانات المحفوظة:
 * - family_aggregate: هدف على الموديل الأب (تيجو / GD / T4…)
 * - per_variant: أهداف على الموديلات الفرعية
 * - flexible: لم يُحدَّد بعد — يمكن الإدخال على الأب أو الفروع
 */
export type PlanEntryMode = 'family_aggregate' | 'per_variant' | 'flexible'

/** يُفضَّل الأب إن وُجد هدف عليه، وإلا الفروع، وإلا مرن */
export function resolvePlanEntryMode(
  familyId: string,
  variantIds: string[],
  planTargets: Map<string, number>
): PlanEntryMode {
  const familyTarget = planTargets.get(familyId) ?? 0
  if (familyTarget > 0) return 'family_aggregate'

  const hasVariantTarget = variantIds.some(id => id !== familyId && (planTargets.get(id) ?? 0) > 0)
  if (hasVariantTarget) return 'per_variant'

  return 'flexible'
}

/** @deprecated استخدم resolvePlanEntryMode حسب البيانات */
export function planEntryModeForFamily(_familyName: string): PlanEntryMode {
  return 'flexible'
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
    variants: variants.filter(v => v.parent_model_id === family.id).sort((a, b) => a.name.localeCompare(b.name))
  }))

  const orphanVariants = variants
    .filter(v => !v.parent_model_id || !familyIds.has(v.parent_model_id))
    .sort((a, b) => a.name.localeCompare(b.name))

  return { groups, orphanVariants }
}

export function variantModelsForLine(models: VehicleModel[], linePrefix: string): VehicleModel[] {
  const p = linePrefix.toUpperCase()
  return models.filter(m => isAssignableModel(m) && (m.name.toUpperCase() === p || m.name.toUpperCase().startsWith(p)))
}

/**
 * Sub-models for an operations line tab.
 * Uses the family parent (so T4-PRO L under T4, and K50 under GD) and also
 * names that start with the line, because a hyphen breaks the old T4L-style match.
 */
export function catalogVariantsForLine(models: VehicleModel[], line: string): VehicleModel[] {
  const key = line.trim().toUpperCase()
  if (!key) return []
  const { groups } = buildModelFamilyGroups(models)
  const fromParent = groups
    .filter(g => {
      const name = g.family.name.trim().toUpperCase()
      if (name === key) return true
      if (key === 'FOTON' && name.includes('FOTON')) return true
      if (key === 'GD' && isGdAggregateFamily(name)) return true
      return false
    })
    .flatMap(g => g.variants.filter(v => v.is_active))

  const byName = selectableVehicleModels(models).filter(m => {
    const n = m.name.trim().toUpperCase()
    if (key === 'FOTON') return n.includes('FOTON')
    if (key === 'GD') return GD_VARIANT_NAMES.has(n) || n.startsWith('GD')
    return n.startsWith(key) && n !== key
  })

  const byId = new Map<string, VehicleModel>()
  for (const variant of [...fromParent, ...byName]) byId.set(variant.id, variant)
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'en'))
}

/** Family names left unselected when IPL compare filter initializes (matches default UI). */
const IPL_DEFAULT_EXCLUDED_FAMILIES = new Set(['T70'])

function isIplDefaultExcludedFamily(familyName: string): boolean {
  return IPL_DEFAULT_EXCLUDED_FAMILIES.has(familyName.trim().toUpperCase())
}

/**
 * Default open sub-models for IPL compare:
 * all active variants except those under excluded parent families (e.g. T70).
 */
export function defaultIplCompareModelNames(
  allModels: VehicleModel[],
  assignable: VehicleModel[]
): string[] {
  const { groups } = buildModelFamilyGroups(allModels)
  const excludedIds = new Set<string>()
  for (const g of groups) {
    if (!isIplDefaultExcludedFamily(g.family.name)) continue
    for (const v of g.variants) excludedIds.add(v.id)
  }
  return assignable.filter(m => !excludedIds.has(m.id)).map(m => m.name)
}

