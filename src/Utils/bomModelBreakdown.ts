import type { VehicleModel } from '../Types/settings'
import { effectivePartKind } from './bomDefaults'
import { defaultSupplySourceValue } from './bomPresetOptions'
import type { BomDisplayGroup, BomVariantLine } from './bomRowGroups'
import { buildModelFamilyGroups, isAssignableModel } from './vehicleModelHierarchy'
import { inferParentNameFromVariant } from './vehicleModelHierarchy'

export type BomModelBreakdownLine = {
  modelId: string
  modelName: string
  familyName: string
  qty: number
  variant?: BomVariantLine
}

export type BomModelLineDraft = {
  qty: string
  part_number: string
  part_kind: string
  supply_source: string
}

export function lineDraftFromBreakdown(line: BomModelBreakdownLine, group: BomDisplayGroup): BomModelLineDraft {
  return {
    qty: line.qty > 0 ? String(line.qty) : '0',
    part_number: line.variant?.part_number?.trim() || group.primary.part_number || '',
    part_kind: effectivePartKind(line.variant?.part_kind || group.primary.part_type),
    supply_source: defaultSupplySourceValue(line.variant?.supply_source || group.primary.supply_source)
  }
}

export type BomModelBreakdownFamily = {
  familyId: string
  familyName: string
  lines: BomModelBreakdownLine[]
}

function lineFromModel(
  m: VehicleModel,
  familyName: string,
  variantMap: Map<string, BomVariantLine>
): BomModelBreakdownLine {
  const variant = variantMap.get(m.name)
  return {
    modelId: m.id,
    modelName: m.name,
    familyName,
    qty: variant?.qty ?? 0,
    variant
  }
}

export function familyIdsForBomGroup(models: VehicleModel[], group: BomDisplayGroup): string[] {
  const ids = new Set<string>()
  const row = group.primary

  if (row.model_family) {
    const fam = models.find(m => m.model_kind === 'family' && m.name === row.model_family)
    if (fam) ids.add(fam.id)
  }

  for (const v of group.variants) {
    const m = models.find(x => x.name === v.modelName)
    if (m?.parent_model_id) {
      ids.add(m.parent_model_id)
      continue
    }
    const inferred = inferParentNameFromVariant(v.modelName)
    if (inferred) {
      const fam = models.find(x => x.model_kind === 'family' && x.name === inferred)
      if (fam) ids.add(fam.id)
    }
  }

  if (ids.size === 0 && row.applicable_models_text) {
    for (const name of row.applicable_models_text.split(/[,،]/)) {
      const inferred = inferParentNameFromVariant(name.trim())
      if (inferred) {
        const fam = models.find(x => x.model_kind === 'family' && x.name === inferred)
        if (fam) ids.add(fam.id)
      }
    }
  }

  return [...ids]
}

/** Every vehicle family with variant rows; qty 0 when the part does not use that model. */
export function bomModelBreakdownFamilies(
  models: VehicleModel[],
  group: BomDisplayGroup
): BomModelBreakdownFamily[] {
  const variantMap = new Map(group.variants.map(v => [v.modelName, v]))
  const picker = buildModelFamilyGroups(models)
  const families: BomModelBreakdownFamily[] = []

  for (const g of picker.groups) {
    const variants = g.variants.filter(isAssignableModel)
    if (variants.length === 0) continue
    families.push({
      familyId: g.family.id,
      familyName: g.family.name,
      lines: variants.map(m => lineFromModel(m, g.family.name, variantMap))
    })
  }

  if (picker.orphanVariants.length > 0) {
    families.push({
      familyId: '__orphan__',
      familyName: '',
      lines: picker.orphanVariants
        .filter(isAssignableModel)
        .map(m => lineFromModel(m, '', variantMap))
    })
  }

  if (families.length > 0) return families

  return [
    {
      familyId: '__variants__',
      familyName: '',
      lines: group.variants.map(v => ({
        modelId: '',
        modelName: v.modelName,
        familyName: inferParentNameFromVariant(v.modelName) ?? '',
        qty: v.qty,
        variant: v
      }))
    }
  ]
}

/** Flat list of all variant lines across every family. */
export function bomModelBreakdownLines(
  models: VehicleModel[],
  group: BomDisplayGroup
): BomModelBreakdownLine[] {
  return bomModelBreakdownFamilies(models, group).flatMap(f => f.lines)
}
