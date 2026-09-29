import type { VehicleModel } from '../Types/settings'

export function childIdsOf(models: VehicleModel[], familyId: string) {
  return models.filter(m => m.parent_model_id === familyId && m.id !== familyId).map(m => m.id)
}

export function rolledQty(models: VehicleModel[], id: string, targets: Map<string, number>) {
  const own = targets.get(id) ?? 0
  if (own > 0) return own
  return childIdsOf(models, id).reduce((sum, vid) => sum + (targets.get(vid) ?? 0), 0)
}

/** Shared bundles count once. */
export function sumVisibleParentQty(
  parents: VehicleModel[],
  groups: Map<string, string>,
  models: VehicleModel[],
  targets: Map<string, number>
) {
  const seen = new Set<string>()
  let sum = 0
  for (const parent of parents) {
    const groupId = groups.get(parent.id)
    if (groupId) {
      if (seen.has(groupId)) continue
      seen.add(groupId)
    }
    sum += rolledQty(models, parent.id, targets)
  }
  return sum
}
