/** Normalize Arabic part names so near-identical labels group together in the BOM list. */
export function normalizeArabicPartNameForGrouping(raw: string | null | undefined): string {
  let s = String(raw ?? '').trim()
  if (!s) return ''

  s = s
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\dA-Za-z\u0600-\u06FF\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

  return s
}

export function normalizeEnglishPartNameForGrouping(raw: string | null | undefined): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^\dA-Za-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
