import type { MissingPartDetail } from '../Types/missingPart'
import { rememberedPrimaryForGroup } from './reportGroupPrimary'
import {
  displayLabelForKey,
  issueLabelsForPart,
  labelMatchesMain,
  mainIssueLabels,
  partHasDistinctAction,
  partSampleForLabel
} from './shortageIssueKeys'

export function scopePartsForVehicles(
  pool: MissingPartDetail[],
  vehicleIds: Iterable<string>
): MissingPartDetail[] {
  const ids = vehicleIds instanceof Set ? vehicleIds : new Set(vehicleIds)
  return pool.filter(p => ids.has(p.vehicleId))
}

function preferredPrimaryForScope(scopeParts: MissingPartDetail[], override?: string | null): string | null {
  if (override?.trim()) return override
  const groupId = scopeParts.find(p => p.reportGroupId)?.reportGroupId
  return rememberedPrimaryForGroup(groupId)
}

/** Lines shown on the main group row — shared (or chosen/dominant) reasons only. */
export function mainPartsForReportGroup(
  scopeParts: MissingPartDetail[],
  preferredPrimary?: string | null
): MissingPartDetail[] {
  if (scopeParts.length === 0) return []

  const labelSource = scopeParts.some(p => !partHasDistinctAction(p))
    ? scopeParts.filter(p => !partHasDistinctAction(p))
    : scopeParts
  const labels = mainIssueLabels(labelSource, preferredPrimaryForScope(scopeParts, preferredPrimary))
  const reps: MissingPartDetail[] = []
  for (const label of labels) {
    const sample = partSampleForLabel(scopeParts, label) ?? scopeParts[0]!
    const matching = scopeParts.filter(p => {
      const labels = issueLabelsForPart(p)
      if (partHasDistinctAction(p)) return false
      return labels.some(item => item === label || labelMatchesMain(item, [label]))
    })
    const installed = matching.reduce((s, p) => s + p.installedQty, 0)
    const required = matching.reduce((s, p) => s + p.requiredQty, 0)
    reps.push({
      ...sample,
      partDescription: displayLabelForKey(scopeParts, label),
      installedQty: installed,
      requiredQty: required,
      remainingQty: Math.max(0, required - installed)
    })
  }
  return reps
}

/**
 * Extra shortages for one chassis — anything not already on the main group row.
 * The main/shared (or chosen) wording never repeats as a branch.
 */
export function branchPartsForGroupVehicle(
  vehicleId: string,
  scopeParts: MissingPartDetail[],
  preferredPrimary?: string | null
): MissingPartDetail[] {
  const labelSource = scopeParts.some(p => !partHasDistinctAction(p))
    ? scopeParts.filter(p => !partHasDistinctAction(p))
    : scopeParts
  const mainLabels = new Set(mainIssueLabels(labelSource, preferredPrimaryForScope(scopeParts, preferredPrimary)))
  const vehicleParts = scopeParts.filter(p => p.vehicleId === vehicleId)
  const branches: MissingPartDetail[] = []

  for (const part of vehicleParts) {
    const labels = issueLabelsForPart(part)
    const localOnly = labels.filter(label => !labelMatchesMain(label, mainLabels))
    if (localOnly.length === 0) {
      if (partHasDistinctAction(part)) branches.push(part)
      continue
    }

    if (localOnly.length === labels.length) {
      branches.push(part)
      continue
    }

    branches.push({
      ...part,
      partDescription: localOnly.map(l => displayLabelForKey([part], l)).join(' \\ ')
    })
  }

  return branches
}

export function branchBlocksForGroup(scopeParts: MissingPartDetail[]): {
  vehicleId: string
  vin: string
  modelName: string
  parts: MissingPartDetail[]
}[] {
  const vehicles = [...new Map(scopeParts.map(p => [p.vehicleId, p])).values()].sort((a, b) =>
    a.vin.localeCompare(b.vin)
  )
  return vehicles
    .map(v => ({
      vehicleId: v.vehicleId,
      vin: v.vin,
      modelName: v.modelName,
      parts: branchPartsForGroupVehicle(v.vehicleId, scopeParts)
    }))
    .filter(b => b.parts.length > 0)
}
