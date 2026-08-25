import type { MissingPartDetail } from '../Types/missingPart'

export function shortageIssueKey(part: Pick<MissingPartDetail, 'partDescription' | 'reason' | 'department'>): string {
  return `${part.partDescription.trim()}|${part.reason}|${part.department}`
}

export type MergeShortagePlan =
  | {
      ok: true
      partIds: string[]
      reportGroupId: string
      vehicleCount: number
      lineCount: number
      issueLabel: string
    }
  | {
      ok: false
      error:
        | 'needAtLeastTwo'
        | 'nothingToMerge'
        | 'differentReasons'
        | 'alreadyGrouped'
    }

/** Open current-list lines for the selected vehicles (eligible to join a report group). */
export function mergeablePartsForVehicles(
  selectedVehicleIds: ReadonlySet<string> | string[],
  pool: MissingPartDetail[]
): MissingPartDetail[] {
  const ids = selectedVehicleIds instanceof Set ? selectedVehicleIds : new Set(selectedVehicleIds)
  return pool.filter(
    p =>
      ids.has(p.vehicleId) &&
      !p.shortageResolvedAt &&
      p.status !== 'closed' &&
      p.status !== 'cancelled'
  )
}

/**
 * Build a plan to stamp selected vehicles' open lines onto one report_group_id.
 * Requires ≥2 vehicles and a single shared issue signature (description + reason + department).
 */
export function planMergeSelectedVehicles(
  selectedVehicleIds: ReadonlySet<string> | string[],
  pool: MissingPartDetail[]
): MergeShortagePlan {
  const ids = [...(selectedVehicleIds instanceof Set ? selectedVehicleIds : new Set(selectedVehicleIds))]
  if (ids.length < 2) return { ok: false, error: 'needAtLeastTwo' }

  const parts = mergeablePartsForVehicles(ids, pool)
  if (parts.length === 0) return { ok: false, error: 'nothingToMerge' }

  const vehiclesWithParts = new Set(parts.map(p => p.vehicleId))
  if (vehiclesWithParts.size < 2) return { ok: false, error: 'needAtLeastTwo' }

  const keys = new Set(parts.map(shortageIssueKey))
  if (keys.size !== 1) return { ok: false, error: 'differentReasons' }

  const existingGroupIds = [
    ...new Set(parts.map(p => p.reportGroupId).filter((id): id is string => Boolean(id)))
  ]
  if (
    existingGroupIds.length === 1 &&
    parts.every(p => p.reportGroupId === existingGroupIds[0])
  ) {
    return { ok: false, error: 'alreadyGrouped' }
  }

  const reportGroupId = existingGroupIds[0] ?? crypto.randomUUID()
  const primary = parts[0]!

  return {
    ok: true,
    partIds: parts.map(p => p.id),
    reportGroupId,
    vehicleCount: vehiclesWithParts.size,
    lineCount: parts.length,
    issueLabel: primary.partDescription.trim()
  }
}
