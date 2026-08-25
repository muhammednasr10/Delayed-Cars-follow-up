import type { MissingPartDetail } from '../Types/missingPart'
import { branchPartsForGroupVehicle } from './shortageGroupDisplay'
import { issueLabelsForPart, normalizeIssueLabel } from './shortageIssueKeys'

export type MergeIssueOption = {
  key: string
  label: string
  reason: string
  department: string
  vehicleCount: number
  lineCount: number
}

export type MergeShortagePlan =
  | {
      ok: true
      attachIds: string[]
      reportGroupId: string
      vehicleCount: number
      lineCount: number
      issueLabel: string
      primaryIssueKey: string
      branchLineCount: number
    }
  | {
      ok: false
      error: 'needAtLeastTwo' | 'nothingToMerge' | 'alreadyGrouped' | 'needPrimaryReason' | 'unknownPrimary'
      options?: MergeIssueOption[]
    }

function asIdSet(selectedVehicleIds: ReadonlySet<string> | string[]): Set<string> {
  return selectedVehicleIds instanceof Set ? selectedVehicleIds : new Set(selectedVehicleIds)
}

/** Open current-list lines for the selected vehicles. */
export function mergeablePartsForVehicles(
  selectedVehicleIds: ReadonlySet<string> | string[],
  pool: MissingPartDetail[]
): MissingPartDetail[] {
  const ids = asIdSet(selectedVehicleIds)
  return pool.filter(
    p =>
      ids.has(p.vehicleId) &&
      !p.shortageResolvedAt &&
      p.status !== 'closed' &&
      p.status !== 'cancelled'
  )
}

/** Unique shortage wordings in the selection (for the merge primary picker). */
export function listMergeIssueOptions(parts: MissingPartDetail[]): MergeIssueOption[] {
  const byLabel = new Map<
    string,
    { sample: MissingPartDetail; vehicles: Set<string>; lineCount: number }
  >()

  for (const part of parts) {
    const labels = issueLabelsForPart(part)
    const keys = labels.length > 0 ? labels : [normalizeIssueLabel(part.partDescription)]
    for (const label of keys) {
      const cur = byLabel.get(label)
      if (!cur) {
        byLabel.set(label, { sample: part, vehicles: new Set([part.vehicleId]), lineCount: 1 })
      } else {
        cur.vehicles.add(part.vehicleId)
        cur.lineCount += 1
      }
    }
  }

  return [...byLabel.entries()]
    .map(([label, v]) => ({
      key: label,
      label,
      reason: v.sample.reason,
      department: v.sample.department,
      vehicleCount: v.vehicles.size,
      lineCount: v.lineCount
    }))
    .sort((a, b) => b.vehicleCount - a.vehicleCount || a.label.localeCompare(b.label, 'ar'))
}

/**
 * Plan merging selected vehicles into one report_group_id.
 * Pass `primaryIssueKey` (issue label) when the selection has more than one wording.
 */
export function planMergeSelectedVehicles(
  selectedVehicleIds: ReadonlySet<string> | string[],
  pool: MissingPartDetail[],
  primaryIssueKey?: string | null
): MergeShortagePlan {
  const ids = [...asIdSet(selectedVehicleIds)]
  if (ids.length < 2) return { ok: false, error: 'needAtLeastTwo' }

  const parts = mergeablePartsForVehicles(ids, pool)
  if (parts.length === 0) return { ok: false, error: 'nothingToMerge' }

  const vehiclesWithParts = new Set(parts.map(p => p.vehicleId))
  if (vehiclesWithParts.size < 2) return { ok: false, error: 'needAtLeastTwo' }

  const options = listMergeIssueOptions(parts)
  const existingGroupIds = [
    ...new Set(parts.map(p => p.reportGroupId).filter((id): id is string => Boolean(id)))
  ]

  if (
    existingGroupIds.length === 1 &&
    parts.every(p => p.reportGroupId === existingGroupIds[0]) &&
    options.length === 1
  ) {
    return { ok: false, error: 'alreadyGrouped' }
  }

  let chosenKey = primaryIssueKey?.trim() || ''
  if (!chosenKey) {
    if (options.length === 1) chosenKey = options[0]!.key
    else return { ok: false, error: 'needPrimaryReason', options }
  }
  if (!options.some(o => o.key === chosenKey)) {
    return { ok: false, error: 'unknownPrimary', options }
  }

  const reportGroupId = existingGroupIds[0] ?? crypto.randomUUID()
  const chosen = options.find(o => o.key === chosenKey)!
  const branchLineCount = [...vehiclesWithParts].reduce(
    (n, vid) => n + branchPartsForGroupVehicle(vid, parts).length,
    0
  )

  return {
    ok: true,
    attachIds: parts.map(p => p.id),
    reportGroupId,
    vehicleCount: vehiclesWithParts.size,
    lineCount: parts.length,
    issueLabel: chosen.label,
    primaryIssueKey: chosenKey,
    branchLineCount
  }
}
