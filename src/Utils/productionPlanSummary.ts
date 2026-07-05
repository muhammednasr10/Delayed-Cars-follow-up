import type { VehicleModel } from '../Types/settings'
import {
  buildModelFamilyGroups,
  inferParentNameFromVariant,
  resolvePlanEntryMode,
  type PlanEntryMode
} from './vehicleModelHierarchy'

export type PlanVariantRow = {
  modelId: string
  label: string
  planned: number
  achieved: number
  wipCarryover: number
}

export type PlanFamilyGroup = {
  key: string
  familyId: string
  label: string
  entryMode: PlanEntryMode
  planned: number
  achieved: number
  wipCarryover: number
  variants: PlanVariantRow[]
}

export type PlanFamilySection = {
  kind: 'family'
  group: PlanFamilyGroup
}

export type PlanSection = PlanFamilySection

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
  achievedByModelId: Map<string, number>,
  wipCarryover: Map<string, number>
): PlanVariantRow {
  return {
    modelId: model.id,
    label: model.name,
    planned: planTargets.get(model.id) ?? 0,
    achieved: achievedByModelId.get(model.id) ?? 0,
    wipCarryover: wipCarryover.get(model.id) ?? 0
  }
}

function groupWipCarryover(
  familyId: string,
  entryMode: PlanEntryMode,
  variantRows: PlanVariantRow[]
): number {
  if (entryMode === 'family_aggregate') {
    return variantRows.find(v => v.modelId === familyId)?.wipCarryover ?? 0
  }
  return variantRows.reduce((s, v) => s + v.wipCarryover, 0)
}

function buildFamilyGroup(
  key: string,
  familyId: string,
  label: string,
  variants: VehicleModel[],
  planTargets: Map<string, number>,
  achievedByModelId: Map<string, number>,
  wipCarryover: Map<string, number>
): PlanFamilyGroup {
  const variantIds = variants.map(v => v.id)
  const entryMode = resolvePlanEntryMode(familyId, variantIds, planTargets)
  const variantRows = variants.map(v => variantRow(v, planTargets, achievedByModelId, wipCarryover))
  const achieved = variantRows.reduce((s, v) => s + v.achieved, 0)
  const familyTarget = planTargets.get(familyId) ?? 0
  const variantSum = variantRows.reduce((s, v) => s + (v.modelId === familyId ? 0 : v.planned), 0)
  const planned =
    entryMode === 'family_aggregate'
      ? familyTarget
      : entryMode === 'per_variant'
        ? variantSum + (variantRows.find(v => v.modelId === familyId)?.planned ?? 0)
        : familyTarget || variantSum

  return {
    key,
    familyId,
    label,
    entryMode,
    planned,
    achieved,
    wipCarryover: groupWipCarryover(familyId, entryMode, variantRows),
    variants: variantRows
  }
}

function buildRawFamilyGroups(
  allModels: VehicleModel[],
  planTargets: Map<string, number>,
  achievedByModelId: Map<string, number>,
  wipCarryover: Map<string, number>
): PlanFamilyGroup[] {
  const active = allModels.filter(m => m.is_active)
  const { groups, orphanVariants } = buildModelFamilyGroups(active)
  const result: PlanFamilyGroup[] = []

  for (const { family, variants } of groups) {
    if (variants.length === 0) continue
    result.push(buildFamilyGroup(family.id, family.id, family.name, variants, planTargets, achievedByModelId, wipCarryover))
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
    result.push(buildFamilyGroup(`orphan:${label}`, familyId, label, sorted, planTargets, achievedByModelId, wipCarryover))
  }

  return result
}

/** GD / T4 / T7 / T8: one target per family; other lines per variant. */
export function buildPlanSections(
  allModels: VehicleModel[],
  planTargets: Map<string, number>,
  achievedByModelId: Map<string, number>,
  wipCarryover: Map<string, number> = new Map()
): PlanSection[] {
  return buildRawFamilyGroups(allModels, planTargets, achievedByModelId, wipCarryover)
    .sort((a, b) => a.label.localeCompare(b.label, 'ar'))
    .map(group => ({ kind: 'family' as const, group }))
}

/** @deprecated Use buildPlanSections */
export function buildPlanFamilyGroups(
  allModels: VehicleModel[],
  planTargets: Map<string, number>,
  achievedByModelId: Map<string, number>,
  wipCarryover: Map<string, number> = new Map()
): PlanFamilyGroup[] {
  return buildRawFamilyGroups(allModels, planTargets, achievedByModelId, wipCarryover)
}

export function sumPlanSectionsWip(sections: PlanSection[]): number {
  return sections.reduce((sum, section) => sum + section.group.wipCarryover, 0)
}

export function sumPlanSectionsPlanned(sections: PlanSection[]): number {
  return sections.reduce((sum, section) => sum + section.group.planned, 0)
}

export function sumPlanSectionsAchieved(sections: PlanSection[]): number {
  return sections.reduce((sum, section) => sum + section.group.achieved, 0)
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
