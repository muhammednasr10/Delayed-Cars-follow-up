import type { VehicleModel } from '../Types/settings'

export type PlanSummaryRow = {
  key: string
  kind: 'family' | 'variant'
  modelId?: string
  label: string
  planned: number
  achieved: number
}

function variantDisplayName(model: VehicleModel): string {
  return model.name
}

function familyDisplayName(model: VehicleModel): string {
  return model.parent_name ?? model.name
}

export function buildPlanSummaryRows(
  allModels: VehicleModel[],
  planTargets: Map<string, number>,
  achievedByModelId: Map<string, number>
): PlanSummaryRow[] {
  const modelById = new Map(allModels.map(m => [m.id, m]))
  const variants = new Map<string, { label: string; family: string; planned: number; achieved: number }>()

  for (const [modelId, planned] of planTargets) {
    const model = modelById.get(modelId)
    if (!model) continue
    variants.set(modelId, {
      label: variantDisplayName(model),
      family: familyDisplayName(model),
      planned,
      achieved: achievedByModelId.get(modelId) ?? 0
    })
  }

  for (const [modelId, achieved] of achievedByModelId) {
    if (variants.has(modelId) || achieved <= 0) continue
    const model = modelById.get(modelId)
    if (!model) continue
    variants.set(modelId, {
      label: variantDisplayName(model),
      family: familyDisplayName(model),
      planned: planTargets.get(modelId) ?? 0,
      achieved
    })
  }

  const byFamily = new Map<string, Array<{ modelId: string; label: string; planned: number; achieved: number }>>()
  for (const [modelId, data] of variants) {
    const list = byFamily.get(data.family) ?? []
    list.push({ modelId, label: data.label, planned: data.planned, achieved: data.achieved })
    byFamily.set(data.family, list)
  }

  const rows: PlanSummaryRow[] = []
  for (const [family, items] of [...byFamily.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ar'))) {
    const sorted = [...items].sort((a, b) => a.label.localeCompare(b.label, 'ar'))
    rows.push({
      key: `family:${family}`,
      kind: 'family',
      label: family,
      planned: sorted.reduce((sum, item) => sum + item.planned, 0),
      achieved: sorted.reduce((sum, item) => sum + item.achieved, 0)
    })
    for (const item of sorted) {
      rows.push({
        key: item.modelId,
        kind: 'variant',
        modelId: item.modelId,
        label: item.label,
        planned: item.planned,
        achieved: item.achieved
      })
    }
  }
  return rows
}

export function planProgressPercent(planned: number, achieved: number): number {
  if (planned <= 0) return achieved > 0 ? 100 : 0
  return Math.min(100, Math.round((achieved / planned) * 100))
}

export function tallyAchievedByModel(
  vehicles: { modelId?: string | null }[]
): Map<string, number> {
  const map = new Map<string, number>()
  for (const vehicle of vehicles) {
    if (!vehicle.modelId) continue
    map.set(vehicle.modelId, (map.get(vehicle.modelId) ?? 0) + 1)
  }
  return map
}
