import type { ModelPlanTarget } from '../Types/modelProductionPlan'

export type PlanBundle = {
  id: string
  modelIds: string[]
  qty: number
  wip: number
}

function storageKey(year: number, month: number) {
  return `afa-plan-bundles:${year}:${month}`
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function readPlanBundles(year: number, month: number): PlanBundle[] {
  const raw = storage()?.getItem(storageKey(year, month))
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as PlanBundle[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(bundle => ({
        id: String(bundle.id || ''),
        modelIds: [...new Set((bundle.modelIds ?? []).map(String))].filter(Boolean).sort(),
        qty: Math.max(0, Number(bundle.qty) || 0),
        wip: Math.max(0, Number(bundle.wip) || 0)
      }))
      .filter(bundle => bundle.id && bundle.modelIds.length >= 2)
  } catch {
    return []
  }
}

export function writePlanBundles(year: number, month: number, bundles: PlanBundle[]) {
  const store = storage()
  if (!store) return
  const clean = bundles.filter(bundle => bundle.modelIds.length >= 2)
  if (clean.length === 0) {
    store.removeItem(storageKey(year, month))
    return
  }
  store.setItem(storageKey(year, month), JSON.stringify(clean))
}

export function bundlesFromGroupMap(
  groups: Map<string, string>,
  targets: Map<string, number>,
  wip: Map<string, number>
): PlanBundle[] {
  const byId = new Map<string, string[]>()
  for (const [modelId, groupId] of groups) {
    const list = byId.get(groupId) ?? []
    list.push(modelId)
    byId.set(groupId, list)
  }
  const bundles: PlanBundle[] = []
  for (const [id, modelIds] of byId) {
    const members = [...new Set(modelIds)].sort()
    if (members.length < 2) continue
    bundles.push({
      id,
      modelIds: members,
      qty: Math.max(0, targets.get(members[0]) ?? 0),
      wip: Math.max(0, wip.get(members[0]) ?? 0)
    })
  }
  return bundles
}

export function normalizeGroupMap(groups: Map<string, string>): Map<string, string> {
  const counts = new Map<string, number>()
  for (const groupId of groups.values()) counts.set(groupId, (counts.get(groupId) ?? 0) + 1)
  const next = new Map<string, string>()
  for (const [modelId, groupId] of groups) {
    if ((counts.get(groupId) ?? 0) >= 2) next.set(modelId, groupId)
  }
  return next
}

/** Paint a shared quantity onto every member so the cards show one number. */
export function overlayPlanBundles(
  targets: Map<string, number>,
  wip: Map<string, number>,
  bundles: PlanBundle[]
): { targets: Map<string, number>; wip: Map<string, number>; groups: Map<string, string> } {
  const nextTargets = new Map(targets)
  const nextWip = new Map(wip)
  const groups = new Map<string, string>()
  for (const bundle of bundles) {
    if (bundle.modelIds.length < 2) continue
    for (const modelId of bundle.modelIds) {
      nextTargets.set(modelId, bundle.qty)
      if (bundle.wip > 0) nextWip.set(modelId, bundle.wip)
      else nextWip.delete(modelId)
      groups.set(modelId, bundle.id)
    }
  }
  return { targets: nextTargets, wip: nextWip, groups }
}

/** Add the shared quantity onto every member and tag them with the bundle id. */
export function expandPlanTargetsWithBundles(targets: ModelPlanTarget[]): ModelPlanTarget[] {
  const result = targets.map(row => ({ ...row }))
  const index = new Map(result.map(row => [`${row.planYear}:${row.planMonth}:${row.modelId}`, row]))
  const seen = new Set<string>()
  for (const row of targets) {
    const monthKey = `${row.planYear}:${row.planMonth}`
    if (seen.has(monthKey)) continue
    seen.add(monthKey)
    for (const bundle of readPlanBundles(row.planYear, row.planMonth)) {
      for (const modelId of bundle.modelIds) {
        const key = `${row.planYear}:${row.planMonth}:${modelId}`
        const existing = index.get(key)
        if (existing) {
          existing.targetQty = bundle.qty
          existing.wipCarryover = bundle.wip
          existing.planGroupId = bundle.id
          continue
        }
        const created: ModelPlanTarget = {
          modelId,
          targetQty: bundle.qty,
          planYear: row.planYear,
          planMonth: row.planMonth,
          wipCarryover: bundle.wip,
          planGroupId: bundle.id
        }
        result.push(created)
        index.set(key, created)
      }
    }
  }
  return result
}

export function sumPlanTargetsOnce(targets: Pick<ModelPlanTarget, 'targetQty' | 'planGroupId'>[]): number {
  const seen = new Set<string>()
  let sum = 0
  for (const row of targets) {
    if (row.planGroupId) {
      if (seen.has(row.planGroupId)) continue
      seen.add(row.planGroupId)
    }
    sum += Math.max(0, row.targetQty || 0)
  }
  return sum
}

/** Quantity written to the database: the bundle total lives on one model so the month total is not multiplied. */
export function storedQtyForModel(
  modelId: string,
  qty: number,
  groups: Map<string, string>
): number {
  const groupId = groups.get(modelId)
  if (!groupId) return qty
  const members = [...groups.entries()]
    .filter(([, id]) => id === groupId)
    .map(([id]) => id)
    .sort()
  if (members.length < 2) return qty
  return modelId === members[0] ? qty : 0
}
