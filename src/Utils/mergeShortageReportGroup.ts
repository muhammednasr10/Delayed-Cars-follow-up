import type { MissingPartDetail } from '../Types/missingPart'

const ISSUE_SEP = /\\|\||\/|\n|·|؛/

export function shortageIssueKey(part: Pick<MissingPartDetail, 'partDescription' | 'reason' | 'department'>): string {
  return `${part.partDescription.trim()}|${part.reason}|${part.department}`
}

/** Split combined shortage text (e.g. «A \ B») into comparable issue fragments. */
export function issueFragments(description: string): string[] {
  const trimmed = description.trim()
  if (!trimmed) return []
  const parts = trimmed.split(ISSUE_SEP).map(s => s.trim()).filter(Boolean)
  return parts.length > 0 ? parts : [trimmed]
}

/** One or more comparable keys per line (multi-reason descriptions count separately). */
export function issueKeysForPart(part: Pick<MissingPartDetail, 'partDescription' | 'reason' | 'department'>): string[] {
  const frags = issueFragments(part.partDescription)
  if (frags.length <= 1) return [shortageIssueKey(part)]
  return frags.map(f => `${f}|${part.reason}|${part.department}`)
}

export function issueKeyVehicleCounts(parts: MissingPartDetail[]): Map<string, number> {
  const byKey = new Map<string, Set<string>>()
  for (const p of parts) {
    for (const k of issueKeysForPart(p)) {
      if (!byKey.has(k)) byKey.set(k, new Set())
      byKey.get(k)!.add(p.vehicleId)
    }
  }
  const counts = new Map<string, number>()
  for (const [k, vids] of byKey) counts.set(k, vids.size)
  return counts
}

/** Issue keys shared by every chassis in the group (or at least `minVehicles` if passed). */
export function sharedIssueKeys(parts: MissingPartDetail[], minVehicles?: number): string[] {
  const vehicleCount = new Set(parts.map(p => p.vehicleId)).size
  const threshold = minVehicles ?? Math.max(vehicleCount, 1)
  const counts = issueKeyVehicleCounts(parts)
  return [...counts.entries()]
    .filter(([, n]) => n >= threshold)
    .map(([k]) => k)
}

function parseIssueKey(key: string): { label: string; reason: string; department: string } {
  const parts = key.split('|')
  const department = parts.pop() ?? ''
  const reason = parts.pop() ?? ''
  return { label: parts.join('|'), reason, department }
}

function partRepForIssueKey(parts: MissingPartDetail[], key: string): MissingPartDetail | undefined {
  return parts.find(p => issueKeysForPart(p).includes(key))
}

/** Lines shown on the main group row — only reasons present on every chassis. */
export function mainPartsForReportGroup(scopeParts: MissingPartDetail[]): MissingPartDetail[] {
  const shared = sharedIssueKeys(scopeParts)
  const keys =
    shared.length > 0
      ? shared
      : (() => {
          const dominant = dominantIssueKey(scopeParts)
          return dominant ? [dominant] : []
        })()

  const reps: MissingPartDetail[] = []
  const seen = new Set<string>()
  for (const key of keys) {
    if (seen.has(key)) continue
    seen.add(key)
    const { label, reason, department } = parseIssueKey(key)
    const sample = partRepForIssueKey(scopeParts, key) ?? scopeParts[0]
    if (!sample) continue
    // Keep one clean row per shared issue (avoid combined «A \ B» text and duplicates).
    const matching = scopeParts.filter(p => issueKeysForPart(p).includes(key))
    const installed = matching.reduce((s, p) => s + p.installedQty, 0)
    const required = matching.reduce((s, p) => s + p.requiredQty, 0)
    reps.push({
      ...sample,
      partDescription: label,
      reason,
      department,
      installedQty: installed,
      requiredQty: required,
      remainingQty: Math.max(0, required - installed)
    })
  }
  return reps
}

/**
 * Branch lines for one chassis — reasons not shared by the whole group.
 * Same reasons on every member stay on the main row only.
 */
export function branchPartsForGroupVehicle(vehicleId: string, scopeParts: MissingPartDetail[]): MissingPartDetail[] {
  const vehicleCount = new Set(scopeParts.map(p => p.vehicleId)).size
  const counts = issueKeyVehicleCounts(scopeParts)
  const vehicleParts = scopeParts.filter(p => p.vehicleId === vehicleId)
  const branches: MissingPartDetail[] = []

  for (const p of vehicleParts) {
    const keys = issueKeysForPart(p)
    const localOnly = keys.filter(k => (counts.get(k) ?? 0) < vehicleCount)
    if (localOnly.length === 0) continue

    if (localOnly.length === keys.length) {
      branches.push(p)
      continue
    }

    const label = localOnly.map(k => parseIssueKey(k).label).join(' \\ ')
    branches.push({ ...p, partDescription: label })
  }

  return branches
}

export function hasGroupBranchForVehicle(vehicleId: string, scopeParts: MissingPartDetail[]): boolean {
  return branchPartsForGroupVehicle(vehicleId, scopeParts).length > 0
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
    parts.filter(p => issueKeysForPart(p).includes(chosenKey)).map(p => p.vehicleId)
  )

  const attachIds: string[] = parts.map(p => p.id)
  const detachIds: string[] = []

  const reportGroupId = existingGroupIds[0] ?? crypto.randomUUID()
  const chosen = options.find(o => o.key === chosenKey)!

  const branchLineCount = [...vehiclesWithParts].reduce(
    (n, vid) => n + branchPartsForGroupVehicle(vid, parts).length,
    0
  )

  return {
    ok: true,
    attachIds,
    detachIds,
    reportGroupId,
    vehicleCount: vehiclesWithParts.size,
    lineCount: attachIds.length,
    issueLabel: chosen.label,
    primaryIssueKey: chosenKey,
    branchLineCount
  }
}
