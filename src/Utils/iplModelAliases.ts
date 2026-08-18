/** IPL sheet codes (T4T) ↔ catalog variant names (T4-PRO T). */

function compactModelToken(name: string): string {
  return String(name ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, '')
}

/** T4T / T4-PRO T → turbo, T4L / T4-PRO L → luxury, T4C / T4-PRO C → comfort. */
export function t4IplVariantKey(name: string): 'T4T' | 'T4L' | 'T4C' | null {
  const c = compactModelToken(name)
  if (!c || c === 'T4' || c === 'T4PRO') return null
  if (c === 'T4T' || c === 'T4PROT' || c === 'T4PROTURBO' || c === 'TURBO') return 'T4T'
  if (c === 'T4L' || c === 'T4PROL') return 'T4L'
  if (c === 'T4C' || c === 'T4PROC') return 'T4C'
  return null
}

export function iplModelNamesMatch(a: string, b: string): boolean {
  const ca = compactModelToken(a)
  const cb = compactModelToken(b)
  if (!ca || !cb) return false
  if (ca === cb) return true
  const ka = t4IplVariantKey(a)
  const kb = t4IplVariantKey(b)
  return ka != null && ka === kb
}

/** Prefer the name that exists in vehicle_models when writing BOM qty. */
export function resolveIplModelName(importName: string, catalogNames: string[]): string {
  const raw = importName.trim()
  if (!raw) return raw
  const exact = catalogNames.find(n => compactModelToken(n) === compactModelToken(raw))
  if (exact) return exact
  const key = t4IplVariantKey(raw)
  if (!key) return raw
  const aliased = catalogNames.find(n => t4IplVariantKey(n) === key)
  return aliased ?? raw
}

/** IPL opens this model alone so the imported list shows (not compare-all). */
export function preferredIplModelName(catalogNames: string[]): string {
  return catalogNames.find(n => t4IplVariantKey(n) === 'T4T') ?? catalogNames[0] ?? ''
}
