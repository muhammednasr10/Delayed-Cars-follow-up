import type { VehicleModel } from '../Types/settings'
import { buildModelFamilyGroups, inferParentNameFromVariant } from './vehicleModelHierarchy'

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
  planned: number
  achieved: number
  variants: PlanVariantRow[]
}

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

function sumVariants(variants: PlanVariantRow[]): { planned: number; achieved: number } {
  return {
    planned: variants.reduce((s, v) => s + v.planned, 0),
    achieved: variants.reduce((s, v) => s + v.achieved, 0)
  }
}

/** All active models from settings, grouped by parent family (collapsible in UI). */
export function buildPlanFamilyGroups(
  allModels: VehicleModel[],
  planTargets: Map<string, number>,
  achievedByModelId: Map<string, number>
): PlanFamilyGroup[] {
  const active = allModels.filter(m => m.is_active)
  const { groups, orphanVariants } = buildModelFamilyGroups(active)
  const result: PlanFamilyGroup[] = []

  for (const { family, variants } of groups) {
    if (variants.length === 0) continue
    const variantRows = variants.map(v => variantRow(v, planTargets, achievedByModelId))
    const totals = sumVariants(variantRows)
    result.push({
      key: family.id,
      familyId: family.id,
      label: family.name,
      ...totals,
      variants: variantRows
    })
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
    const variantRows = sorted.map(v => variantRow(v, planTargets, achievedByModelId))
    const totals = sumVariants(variantRows)
    result.push({
      key: `orphan:${label}`,
      familyId: sorted[0].id,
      label,
      ...totals,
      variants: variantRows
    })
  }

  return result.sort((a, b) => a.label.localeCompare(b.label, 'ar'))
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
