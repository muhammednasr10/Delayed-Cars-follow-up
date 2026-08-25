import type { MissingPartDetail } from '../Types/missingPart'
import {
  dominantIssueLabel,
  issueLabelVehicleCounts,
  issueLabelsForPart,
  partSampleForLabel,
  sharedIssueLabels
} from './shortageIssueKeys'

export function scopePartsForVehicles(
  pool: MissingPartDetail[],
  vehicleIds: Iterable<string>
): MissingPartDetail[] {
  const ids = vehicleIds instanceof Set ? vehicleIds : new Set(vehicleIds)
  return pool.filter(p => ids.has(p.vehicleId))
}

/** Lines shown on the main group row — only reasons present on every chassis. */
export function mainPartsForReportGroup(scopeParts: MissingPartDetail[]): MissingPartDetail[] {
  if (scopeParts.length === 0) return []

  const shared = sharedIssueLabels(scopeParts)
  const labels = shared.length > 0 ? shared : [dominantIssueLabel(scopeParts)].filter(Boolean)

  const reps: MissingPartDetail[] = []
  for (const label of labels) {
    const sample = partSampleForLabel(scopeParts, label) ?? scopeParts[0]!
    const matching = scopeParts.filter(p => issueLabelsForPart(p).includes(label))
    const installed = matching.reduce((s, p) => s + p.installedQty, 0)
    const required = matching.reduce((s, p) => s + p.requiredQty, 0)
    reps.push({
      ...sample,
      partDescription: label,
      installedQty: installed,
      requiredQty: required,
      remainingQty: Math.max(0, required - installed)
    })
  }
  return reps
}

/**
 * Extra shortages for one chassis — labels not shared by the whole group.
 * Shared wording stays on the main row only.
 */
export function branchPartsForGroupVehicle(
  vehicleId: string,
  scopeParts: MissingPartDetail[]
): MissingPartDetail[] {
  const vehicleCount = new Set(scopeParts.map(p => p.vehicleId)).size
  const counts = issueLabelVehicleCounts(scopeParts)
  const vehicleParts = scopeParts.filter(p => p.vehicleId === vehicleId)
  const branches: MissingPartDetail[] = []

  for (const part of vehicleParts) {
    const labels = issueLabelsForPart(part)
    const localOnly = labels.filter(label => (counts.get(label) ?? 0) < vehicleCount)
    if (localOnly.length === 0) continue

    if (localOnly.length === labels.length) {
      branches.push(part)
      continue
    }

    branches.push({
      ...part,
      partDescription: localOnly.join(' \\ ')
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
