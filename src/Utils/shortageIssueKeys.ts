import type { MissingPartDetail } from '../Types/missingPart'

const ISSUE_SEP = /\\|\||\/|\n|·|؛|\+/

/** Normalize Arabic shortage text for comparison (hamza, alef, yeh, spaces). */
export function normalizeIssueLabel(text: string): string {
  return text
    .replace(/["«»„“”']/g, '')
    .replace(/[\u064B-\u065F\u0670]/g, '') // tashkeel
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Split combined shortage text (e.g. «A \ B» or «A+B») into comparable labels. */
export function issueFragments(description: string): string[] {
  const trimmed = normalizeIssueLabel(description)
  if (!trimmed) return []
  const parts = trimmed.split(ISSUE_SEP).map(s => normalizeIssueLabel(s)).filter(Boolean)
  return parts.length > 0 ? parts : [trimmed]
}

/** Compare shortages by wording only — ignore reason/department codes. */
export function issueLabelsForPart(part: Pick<MissingPartDetail, 'partDescription'>): string[] {
  return [...new Set(issueFragments(part.partDescription))]
}

export function shortageIssueKey(
  part: Pick<MissingPartDetail, 'partDescription' | 'reason' | 'department'>
): string {
  return `${normalizeIssueLabel(part.partDescription)}|${part.reason}|${part.department}`
}

export function issueLabelVehicleCounts(parts: MissingPartDetail[]): Map<string, number> {
  const byLabel = new Map<string, Set<string>>()
  for (const p of parts) {
    for (const label of issueLabelsForPart(p)) {
      if (!byLabel.has(label)) byLabel.set(label, new Set())
      byLabel.get(label)!.add(p.vehicleId)
    }
  }
  const counts = new Map<string, number>()
  for (const [label, vids] of byLabel) counts.set(label, vids.size)
  return counts
}

/** Labels present on every chassis in the set (or at least `minVehicles`). */
export function sharedIssueLabels(parts: MissingPartDetail[], minVehicles?: number): string[] {
  const vehicleCount = new Set(parts.map(p => p.vehicleId)).size
  const threshold = minVehicles ?? Math.max(vehicleCount, 1)
  return [...issueLabelVehicleCounts(parts).entries()]
    .filter(([, n]) => n >= threshold)
    .map(([label]) => label)
    .sort((a, b) => a.localeCompare(b, 'ar'))
}

export function dominantIssueLabel(parts: MissingPartDetail[]): string {
  let best = ''
  let bestCount = -1
  for (const [label, count] of issueLabelVehicleCounts(parts)) {
    if (count > bestCount || (count === bestCount && label.localeCompare(best, 'ar') < 0)) {
      best = label
      bestCount = count
    }
  }
  return best
}

/**
 * Labels for the group main row: all-shared reasons, else the user-picked
 * primary (if still present), else the dominant wording.
 */
export function mainIssueLabels(parts: MissingPartDetail[], preferredPrimary?: string | null): string[] {
  if (parts.length === 0) return []
  const shared = sharedIssueLabels(parts)
  if (shared.length > 0) return shared

  const preferred = preferredPrimary?.trim() ? normalizeIssueLabel(preferredPrimary) : ''
  if (preferred && issueLabelVehicleCounts(parts).has(preferred)) return [preferred]

  const dominant = dominantIssueLabel(parts)
  return dominant ? [dominant] : []
}

export function partSampleForLabel(parts: MissingPartDetail[], label: string): MissingPartDetail | undefined {
  return parts.find(p => issueLabelsForPart(p).includes(label))
}

/** Prefer a human-facing label that still normalizes to the same key. */
export function displayLabelForKey(parts: MissingPartDetail[], key: string): string {
  for (const p of parts) {
    for (const frag of p.partDescription.split(ISSUE_SEP)) {
      const raw = frag.replace(/["«»„“”']/g, '').replace(/\s+/g, ' ').trim()
      if (raw && normalizeIssueLabel(raw) === key) return raw
    }
  }
  return key
}
