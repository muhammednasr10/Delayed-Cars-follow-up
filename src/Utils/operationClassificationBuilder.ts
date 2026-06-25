import { parseClassificationGroups } from './lineClassifications'
import { modelBelongsToLine, type ModelLine } from './modelLines'
import { buildModelFamilyGroups, isAssignableModel } from './vehicleModelHierarchy'
import type { VehicleModel } from '../Types/settings'

export function familiesForModelLine(models: VehicleModel[], modelLine?: ModelLine | null): VehicleModel[] {
  const { groups } = buildModelFamilyGroups(models)
  const families = groups.map(g => g.family).filter(f => f.is_active)
  if (!modelLine) return families.sort((a, b) => a.name.localeCompare(b.name))
  return families
    .filter(f => modelBelongsToLine(f.name, modelLine))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function variantsForFamily(models: VehicleModel[], familyId: string): VehicleModel[] {
  const { groups, orphanVariants } = buildModelFamilyGroups(models)
  const group = groups.find(g => g.family.id === familyId)
  const fromGroup = (group?.variants ?? []).filter(isAssignableModel).filter(v => v.is_active)
  if (fromGroup.length > 0) return fromGroup

  const direct = models.filter(
    m => m.parent_model_id === familyId && m.model_kind !== 'family' && m.is_active
  )
  if (direct.length > 0) return direct

  return orphanVariants.filter(isAssignableModel).filter(v => v.is_active)
}

export function variantNamesForFamily(models: VehicleModel[], familyId: string): string[] {
  return variantsForFamily(models, familyId).map(v => v.name.trim()).filter(Boolean)
}

export type VariantPickerGroup = {
  familyId: string
  familyName: string
  variants: VehicleModel[]
}

/** كل المتغيرات القابلة للاختيار — مع تجميع حسب العائلة (اختيار عبر T4 و T8 معاً) */
export function variantGroupsForPicker(
  models: VehicleModel[],
  modelLine?: ModelLine | null
): VariantPickerGroup[] {
  const { groups, orphanVariants } = buildModelFamilyGroups(models)
  const result: VariantPickerGroup[] = []

  for (const g of groups) {
    if (modelLine && !modelBelongsToLine(g.family.name, modelLine)) continue
    const variants = g.variants.filter(isAssignableModel).filter(v => v.is_active)
    if (variants.length > 0) {
      result.push({ familyId: g.family.id, familyName: g.family.name, variants })
    }
  }

  const orphans = orphanVariants.filter(isAssignableModel).filter(v => v.is_active)
  const filteredOrphans = modelLine ? orphans.filter(v => modelBelongsToLine(v.name, modelLine)) : orphans
  if (filteredOrphans.length > 0) {
    result.push({ familyId: '_orphan', familyName: '—', variants: filteredOrphans })
  }

  return result.sort((a, b) => a.familyName.localeCompare(b.familyName))
}

export function allVariantNamesInScope(models: VehicleModel[], modelLine?: ModelLine | null): string[] {
  const seen = new Set<string>()
  const names: string[] = []
  for (const g of variantGroupsForPicker(models, modelLine)) {
    for (const v of g.variants) {
      const key = v.name.trim().toUpperCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      names.push(v.name.trim())
    }
  }
  return names.sort((a, b) => a.localeCompare(b))
}

export function familyModelIdForLine(models: VehicleModel[], line: ModelLine): string | null {
  const fam = familiesForModelLine(models, line)[0]
  return fam?.id ?? null
}

export function familyModelName(models: VehicleModel[], familyId: string | null): string | null {
  if (!familyId) return null
  return models.find(m => m.id === familyId)?.name ?? null
}

export function initClassificationState(
  models: VehicleModel[],
  operationType: string,
  parentModelId: string | null
): { selectedVariantNames: string[]; classification: string } {
  const allNames = parentModelId ? variantNamesForFamily(models, parentModelId) : []
  const selected = decodeOperationClassification(operationType, allNames)
  const classification = encodeOperationClassification(allNames, selected)
  return { selectedVariantNames: selected, classification }
}

/** يحوّل اختيار المتغيرات إلى قيمة operation_type المخزّنة */
export function encodeOperationClassification(allVariantNames: string[], selected: string[]): string {
  const all = [...new Set(allVariantNames.map(v => v.trim().toUpperCase()).filter(Boolean))].sort()
  const sel = [...new Set(selected.map(v => v.trim().toUpperCase()).filter(Boolean))].sort()
  if (all.length === 0) return 'common'
  if (sel.length === 0 || sel.length >= all.length) return 'common'
  if (sel.length === 1) return `${sel[0].toLowerCase()}-only`
  return `${sel.map(s => s.toLowerCase()).join('-')}-only`
}

/** يسترجع المتغيرات المختارة من قيمة التصنيف المخزّنة */
export function decodeOperationClassification(classification: string, variantNames: string[]): string[] {
  const codes = variantNames.map(v => v.trim().toUpperCase()).filter(Boolean)
  if (codes.length === 0) return []
  const parsed = parseClassificationGroups(classification, codes)
  if (parsed === 'all') return [...codes]
  const union = [...new Set(parsed.flat())].filter(v => codes.includes(v))
  return union.sort((a, b) => codes.indexOf(a) - codes.indexOf(b))
}

export function guessFamilyIdForClassification(
  models: VehicleModel[],
  classification: string,
  modelLine?: ModelLine | null
): string {
  const families = familiesForModelLine(models, modelLine)
  for (const family of families) {
    const names = variantNamesForFamily(models, family.id)
    if (names.length === 0) continue
    const selected = decodeOperationClassification(classification, names)
    if (selected.length > 0 || classification === 'common') return family.id
  }
  return families[0]?.id ?? ''
}

export function secondsToMinutes(seconds: number | null): number | null {
  if (seconds == null || !Number.isFinite(seconds)) return null
  return Math.round((seconds / 60) * 10000) / 10000
}

export function minutesToSeconds(minutes: number | null): number | null {
  if (minutes == null || !Number.isFinite(minutes)) return null
  return Math.round(minutes * 60 * 100) / 100
}
