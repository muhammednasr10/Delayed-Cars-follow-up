/** Stored value for «جزء» */
export const DEFAULT_PART_KIND = 'P'

/** Stored value for hardware */
export const HARDWARE_PART_KIND = 'H/W'

/** Stored value for plastics */
export const PLASTICS_PART_KIND = 'PL'

/** Stored value for CKD supplier */
export const DEFAULT_SUPPLY_SOURCE = 'CKD'

/** Normalize IPL / Excel part-type codes to P or H/W. Unknown → جزء (P). */
export function normalizePartKindRaw(raw?: string | null): string {
  const s = String(raw ?? '').trim()
  if (!s) return DEFAULT_PART_KIND

  const u = s.toUpperCase().replace(/\s+/g, '')
  if (u === '1' || u === 'P' || u === 'PART' || u === 'PARTS' || s.includes('جزء')) return DEFAULT_PART_KIND
  if (
    u === '2' ||
    u === 'H/W' ||
    u === 'HW' ||
    u === 'H' ||
    u === 'W' ||
    u.includes('HARD') ||
    s.includes('هارد')
  ) {
    return HARDWARE_PART_KIND
  }
  if (u === 'PL' || u === 'PLASTICS' || u === 'PLASTIC' || u.includes('PLAST') || s.includes('بلاستيك')) {
    return PLASTICS_PART_KIND
  }
  return s
}

export function effectivePartKind(raw?: string | null): string {
  return normalizePartKindRaw(raw)
}

export function effectiveSupplySource(raw?: string | null): string {
  const s = String(raw ?? '').trim()
  if (!s) return DEFAULT_SUPPLY_SOURCE
  const u = s.toUpperCase()
  if (u === 'CKD' || u.includes('CKD')) return 'CKD'
  if (u === 'LOCAL' || u === 'L' || u.includes('LOCAL') || u.includes('محلي')) return 'Local'
  return s
}
