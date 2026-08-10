import type { PlanSection } from './productionPlanSummary'

export function cloneTargetMap(map: Map<string, number>): Map<string, number> {
  return new Map(map)
}

export function mapsEqual(a: Map<string, number>, b: Map<string, number>): boolean {
  const keys = new Set([...a.keys(), ...b.keys()])
  for (const key of keys) {
    if ((a.get(key) ?? 0) !== (b.get(key) ?? 0)) return false
  }
  return true
}

export function setFamilyTarget(
  targets: Map<string, number>,
  familyId: string,
  variantIds: string[],
  quantity: number
): Map<string, number> {
  const qty = Math.max(0, quantity)
  const next = new Map(targets)
  next.set(familyId, qty)
  for (const id of variantIds.filter(v => v !== familyId)) next.set(id, 0)
  return next
}

export function setVariantTarget(
  targets: Map<string, number>,
  familyId: string,
  variantId: string,
  quantity: number
): Map<string, number> {
  const qty = Math.max(0, quantity)
  const next = new Map(targets)
  if (familyId !== variantId) next.set(familyId, 0)
  next.set(variantId, qty)
  return next
}

export function setFamilyWip(
  wip: Map<string, number>,
  familyId: string,
  variantIds: string[],
  quantity: number
): Map<string, number> {
  const qty = Math.max(0, quantity)
  const next = new Map(wip)
  next.set(familyId, qty)
  for (const id of variantIds.filter(v => v !== familyId)) next.delete(id)
  return next
}

export function setVariantWip(
  wip: Map<string, number>,
  familyId: string,
  variantId: string,
  quantity: number
): Map<string, number> {
  const qty = Math.max(0, quantity)
  const next = new Map(wip)
  if (familyId !== variantId) next.delete(familyId)
  next.set(variantId, qty)
  return next
}

export function collectTargetRows(
  sections: PlanSection[],
  targets: Map<string, number>,
  wip: Map<string, number>,
  includeWip: boolean
) {
  const seen = new Set<string>()
  const rows: { modelId: string; targetQty: number; wipCarryover: number }[] = []
  for (const section of sections) {
    const group = section.group
    for (const id of [group.familyId, ...group.variants.map(v => v.modelId)]) {
      if (seen.has(id)) continue
      seen.add(id)
      rows.push({
        modelId: id,
        targetQty: Math.max(0, targets.get(id) ?? 0),
        wipCarryover: includeWip ? Math.max(0, wip.get(id) ?? 0) : 0
      })
    }
  }
  return rows
}
