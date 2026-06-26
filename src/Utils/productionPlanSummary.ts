import type { ProductionPlanGroupCode } from '../Types/productionPlanGroup'
import type { VehicleModel } from '../Types/settings'
import {
  buildModelFamilyGroups,
  inferParentNameFromVariant,
  isTLineFamily,
  planEntryModeForFamily,
  type PlanEntryMode
} from './vehicleModelHierarchy'

export type PlanVariantRow = {
  modelId: string
  label: string
  planned: number
  achieved: number
}

export type PlanFamilyGroup = {
  key: string
  familyId: string
  label: string
  entryMode: PlanEntryMode
  planned: number
  achieved: number
  variants: PlanVariantRow[]
}

export type PlanCombinedLinesSection = {
  kind: 'combined_lines'
  key: ProductionPlanGroupCode
  label: string
  planned: number
  achieved: number
  families: PlanFamilyGroup[]
}

export type PlanFamilySection = {
  kind: 'family'
  group: PlanFamilyGroup
}

export type PlanSection = PlanFamilySection | PlanCombinedLinesSection

/** @deprecated Use buildPlanFamilyGroups — kept for flat exports if needed */
export type PlanSummaryRow = {
  key: string
  kind: 'family' | 'variant'
  modelId?: string
  label: string
  planned: number
  achieved: number
}

function variantRow(
  model: VehicleModel,
  planTargets: Map<string, number>,
  achievedByModelId: Map<string, number>
): PlanVariantRow {
  return {
    modelId: model.id,
    label: model.name,
    planned: planTargets.get(model.id) ?? 0,
    achieved: achievedByModelId.get(model.id) ?? 0
  }
}

function buildFamilyGroup(
  key: string,
  familyId: string,
  label: string,
  variants: VehicleModel[],
  planTargets: Map<string, number>,
  achievedByModelId: Map<string, number>
): PlanFamilyGroup {
  const entryMode = planEntryModeForFamily(label)
  const variantRows = variants.map(v => variantRow(v, planTargets, achievedByModelId))
  const achieved = variantRows.reduce((s, v) => s + v.achieved, 0)
  let planned = 0
  if (entryMode === 'family_aggregate') {
    const familyTarget = planTargets.get(familyId)
    planned = familyTarget != null && familyTarget > 0 ? familyTarget : 0
  } else if (entryMode === 'per_variant') {
    planned = variantRows.reduce((s, v) => s + v.planned, 0)
  }
  return { key, familyId, label, entryMode, planned, achieved, variants: variantRows }
}

function buildRawFamilyGroups(
  allModels: VehicleModel[],
  planTargets: Map<string, number>,
  achievedByModelId: Map<string, number>
): PlanFamilyGroup[] {
  const active = allModels.filter(m => m.is_active)
  const { groups, orphanVariants } = buildModelFamilyGroups(active)
  const result: PlanFamilyGroup[] = []

  for (const { family, variants } of groups) {
    if (variants.length === 0) continue
    result.push(buildFamilyGroup(family.id, family.id, family.name, variants, planTargets, achievedByModelId))
  }

  const orphanBuckets = new Map<string, VehicleModel[]>()
  for (const variant of orphanVariants) {
    const bucket =
      variant.parent_name?.trim() ||
      inferParentNameFromVariant(variant.name) ||
      variant.name
    const list = orphanBuckets.get(bucket) ?? []
    list.push(variant)
    orphanBuckets.set(bucket, list)
  }

  for (const [label, variants] of [...orphanBuckets.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ar'))) {
    const sorted = [...variants].sort((a, b) => a.name.localeCompare(b.name, 'ar'))
    const familyId = sorted.find(v => v.parent_model_id)?.parent_model_id ?? sorted[0].id
    result.push(buildFamilyGroup(`orphan:${label}`, familyId, label, sorted, planTargets, achievedByModelId))
  }

  return result
}

/** GD as one family row; T4+T7+T8 under one combined section; others per variant. */
export function buildPlanSections(
  allModels: VehicleModel[],
  planTargets: Map<string, number>,
  groupTargets: Map<ProductionPlanGroupCode, number>,
  achievedByModelId: Map<string, number>
): PlanSection[] {
  const raw = buildRawFamilyGroups(allModels, planTargets, achievedByModelId)
  const tLineFamilies = raw.filter(g => isTLineFamily(g.label)).sort((a, b) => a.label.localeCompare(b.label, 'ar'))
  const otherFamilies = raw.filter(g => !isTLineFamily(g.label)).sort((a, b) => a.label.localeCompare(b.label, 'ar'))

  const sections: PlanSection[] = []

  if (tLineFamilies.length > 0) {
    const achieved = tLineFamilies.reduce((s, f) => s + f.achieved, 0)
    sections.push({
      kind: 'combined_lines',
      key: 't_lines',
      label: 'T4 + T7 + T8',
      planned: groupTargets.get('t_lines') ?? 0,
      achieved,
      families: tLineFamilies
    })
  }

  for (const group of otherFamilies) {
    sections.push({ kind: 'family', group })
  }

  return sections.sort((a, b) => {
    const labelA = a.kind === 'combined_lines' ? a.label : a.group.label
    const labelB = b.kind === 'combined_lines' ? b.label : b.group.label
    return labelA.localeCompare(labelB, 'ar')
  })
}

/** @deprecated Use buildPlanSections */
export function buildPlanFamilyGroups(
  allModels: VehicleModel[],
  planTargets: Map<string, number>,
  achievedByModelId: Map<string, number>
): PlanFamilyGroup[] {
  return buildRawFamilyGroups(allModels, planTargets, achievedByModelId)
}

export function sumPlanSectionsPlanned(sections: PlanSection[]): number {
  let total = 0
  for (const section of sections) {
    if (section.kind === 'combined_lines') total += section.planned
    else if (section.group.entryMode === 'family_aggregate') total += section.group.planned
    else total += section.group.planned
  }
  return total
}

export function sumPlanSectionsAchieved(sections: PlanSection[]): number {
  return sections.reduce((sum, section) => {
    if (section.kind === 'combined_lines') return sum + section.achieved
    return sum + section.group.achieved
  }, 0)
}

export function flattenPlanFamilyGroups(groups: PlanFamilyGroup[]): PlanSummaryRow[] {
  const rows: PlanSummaryRow[] = []
  for (const group of groups) {
    rows.push({
      key: group.key,
      kind: 'family',
      label: group.label,
      planned: group.planned,
      achieved: group.achieved
    })
    for (const v of group.variants) {
      rows.push({
        key: v.modelId,
        kind: 'variant',
        modelId: v.modelId,
        label: v.label,
        planned: v.planned,
        achieved: v.achieved
      })
    }
  }
  return rows
}

export function buildPlanSummaryRows(
  allModels: VehicleModel[],
  planTargets: Map<string, number>,
  achievedByModelId: Map<string, number>
): PlanSummaryRow[] {
  return flattenPlanFamilyGroups(buildPlanFamilyGroups(allModels, planTargets, achievedByModelId))
}

export function planProgressPercent(planned: number, achieved: number): number {
  if (planned <= 0) return achieved > 0 ? 100 : 0
  return Math.min(100, Math.round((achieved / planned) * 100))
}

export function tallyAchievedByModel(vehicles: { modelId?: string | null }[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const vehicle of vehicles) {
    if (!vehicle.modelId) continue
    map.set(vehicle.modelId, (map.get(vehicle.modelId) ?? 0) + 1)
  }
  return map
}
