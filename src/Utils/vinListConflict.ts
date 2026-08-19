import type { MissingPartDetail } from '../Types/missingPart'
import { CHASSIS_VIN_LENGTH, isValidVinLength, normalizeChassisVin } from './vinValidation'

export type VinConflictChoice = 'move' | 'keep' | 'skip'

export function sanitizeChassisDigits(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, CHASSIS_VIN_LENGTH)
}

export function normalizeVinKey(vin: string): string {
  return normalizeChassisVin(vin).toUpperCase()
}

/** Indices whose non-empty VIN key appears more than once in the list. */
export function duplicateVinIndices(vins: readonly string[]): Set<number> {
  const keys = vins.map(v => normalizeVinKey(v))
  const counts = new Map<string, number>()
  for (const key of keys) {
    if (!key) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const dup = new Set<number>()
  keys.forEach((key, i) => {
    if (key && (counts.get(key) ?? 0) > 1) dup.add(i)
  })
  return dup
}

/** Active shortage lines for a VIN that are not part of the current edit context. */
export function foreignActivePartsForVin(
  vin: string,
  activeListParts: MissingPartDetail[],
  excludePartIds: ReadonlySet<string>
): MissingPartDetail[] {
  const key = normalizeVinKey(vin)
  if (!isValidVinLength(key)) return []
  return activeListParts.filter(
    p => normalizeVinKey(p.vin) === key && !excludePartIds.has(p.id)
  )
}

export function vinInActiveList(
  vin: string,
  activeListParts: MissingPartDetail[],
  excludePartIds: ReadonlySet<string>
): boolean {
  return foreignActivePartsForVin(vin, activeListParts, excludePartIds).length > 0
}

/** First new VIN that still needs a move/keep/skip choice against the active list. */
export function findUnresolvedVinConflict(
  candidateVins: string[],
  resolvedConflicts: ReadonlySet<string>,
  activeListParts: MissingPartDetail[],
  excludePartIds: ReadonlySet<string>
): string | null {
  for (const vin of candidateVins) {
    const key = normalizeVinKey(vin)
    if (!isValidVinLength(key) || resolvedConflicts.has(key)) continue
    if (vinInActiveList(key, activeListParts, excludePartIds)) return key
  }
  return null
}

/** Part ids to delete when the user chose “move” for those VINs. */
export function partIdsToClearFromList(
  vinsMarkedMove: ReadonlySet<string>,
  candidateVins: string[],
  activeListParts: MissingPartDetail[],
  excludePartIds: ReadonlySet<string>
): string[] {
  const ids = new Set<string>()
  for (const vin of candidateVins) {
    const key = normalizeVinKey(vin)
    if (!vinsMarkedMove.has(key)) continue
    for (const p of foreignActivePartsForVin(key, activeListParts, excludePartIds)) {
      ids.add(p.id)
    }
  }
  return [...ids]
}
