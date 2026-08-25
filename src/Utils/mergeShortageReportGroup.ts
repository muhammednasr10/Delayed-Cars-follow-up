import type { MissingPartDetail } from '../Types/missingPart'

export function shortageIssueKey(part: Pick<MissingPartDetail, 'partDescription' | 'reason' | 'department'>): string {
  return `${part.partDescription.trim()}|${part.reason}|${part.department}`
}

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
      /** Lines that join the shared report group (main reason + orphan VINs without that reason). */
      attachIds: string[]
      /** Lines kept out of the group so they nest as branches under member VINs. */
      detachIds: string[]
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

const PRIMARY_STORAGE_KEY = 'mp.reportGroupPrimary'

/** Remember which issue key is the main row for a report group (same browser). */
export function rememberReportGroupPrimary(reportGroupId: string, issueKey: string) {
  try {
    const raw = sessionStorage.getItem(PRIMARY_STORAGE_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {}
    map[reportGroupId] = issueKey
    sessionStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* ignore quota / private mode */
  }
}

export function recalledReportGroupPrimary(reportGroupId: string | null | undefined): string | null {
  if (!reportGroupId) return null
  try {
    const raw = sessionStorage.getItem(PRIMARY_STORAGE_KEY)
    if (!raw) return null
    const map = JSON.parse(raw) as Record<string, string>
    return map[reportGroupId] ?? null
  } catch {
    return null
  }
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

export function listMergeIssueOptions(parts: MissingPartDetail[]): MergeIssueOption[] {
  const byKey = new Map<string, { sample: MissingPartDetail; vehicles: Set<string>; lineCount: number }>()
  for (const part of parts) {
    const key = shortageIssueKey(part)
    const cur = byKey.get(key)
    if (!cur) {
      byKey.set(key, { sample: part, vehicles: new Set([part.vehicleId]), lineCount: 1 })
    } else {
      cur.vehicles.add(part.vehicleId)
      cur.lineCount += 1
    }
  }
  return [...byKey.entries()]
    .map(([key, v]) => ({
      key,
      label: v.sample.partDescription.trim(),
      reason: v.sample.reason,
      department: v.sample.department,
      vehicleCount: v.vehicles.size,
      lineCount: v.lineCount
    }))
    .sort((a, b) => b.vehicleCount - a.vehicleCount || a.label.localeCompare(b.label, 'ar'))
}

/** Most common issue key in a group (by distinct vehicles, then line count). */
export function dominantIssueKey(parts: MissingPartDetail[]): string {
  const options = listMergeIssueOptions(parts)
  return options[0]?.key ?? (parts[0] ? shortageIssueKey(parts[0]) : '')
}

/** Main-row issue key for a report group: recalled choice, else dominant. */
export function primaryIssueKeyForGroup(parts: MissingPartDetail[], reportGroupId?: string | null): string {
  const recalled = recalledReportGroupPrimary(reportGroupId)
  if (recalled && parts.some(p => shortageIssueKey(p) === recalled)) return recalled
  return dominantIssueKey(parts)
}

/**
 * Build a plan to merge selected vehicles into one report group.
 * Pass `primaryIssueKey` when the selection has more than one issue (from the picker).
 */
export function planMergeSelectedVehicles(
  selectedVehicleIds: ReadonlySet<string> | string[],
  pool: MissingPartDetail[],
  primaryIssueKey?: string | null
): MergeShortagePlan {
  const ids = [...(selectedVehicleIds instanceof Set ? selectedVehicleIds : new Set(selectedVehicleIds))]
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

  const vehiclesWithPrimary = new Set(
    parts.filter(p => shortageIssueKey(p) === chosenKey).map(p => p.vehicleId)
  )

  const attachIds: string[] = []
  const detachIds: string[] = []
  for (const part of parts) {
    const key = shortageIssueKey(part)
    if (key === chosenKey) {
      attachIds.push(part.id)
      continue
    }
    // VIN has the main reason → keep extra reasons out of the group (branch rows).
    if (vehiclesWithPrimary.has(part.vehicleId)) {
      detachIds.push(part.id)
      continue
    }
    // VIN has no main reason → still join the chassis group; display will branch non-primary keys.
    attachIds.push(part.id)
  }

  const reportGroupId = existingGroupIds[0] ?? crypto.randomUUID()
  const chosen = options.find(o => o.key === chosenKey)!

  return {
    ok: true,
    attachIds,
    detachIds,
    reportGroupId,
    vehicleCount: vehiclesWithParts.size,
    lineCount: attachIds.length,
    issueLabel: chosen.label,
    primaryIssueKey: chosenKey,
    branchLineCount: detachIds.length
  }
}
