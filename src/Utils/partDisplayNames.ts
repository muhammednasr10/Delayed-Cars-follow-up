export function partNamesEquivalent(a?: string | null, b?: string | null): boolean {
  const x = (a ?? '').trim().toLowerCase()
  const y = (b ?? '').trim().toLowerCase()
  return Boolean(x && y && x === y)
}

/** Common name cell — hide when identical to Arabic. */
export function displayCommonName(part: { part_name_ar?: string | null; common_name?: string | null }): string {
  const cn = part.common_name?.trim()
  if (!cn) return ''
  if (partNamesEquivalent(part.part_name_ar, cn)) return ''
  return cn
}

/** Join labels without repeating Arabic / common / English when equal. */
export function joinDistinctPartLabels(
  ar?: string | null,
  en?: string | null,
  common?: string | null
): string {
  const parts: string[] = []
  const a = ar?.trim()
  const c = common?.trim()
  const e = en?.trim()
  if (a) parts.push(a)
  if (c && !partNamesEquivalent(a, c)) parts.push(c)
  if (e && !partNamesEquivalent(a, e) && !partNamesEquivalent(c, e)) parts.push(e)
  return parts.join(' · ')
}
