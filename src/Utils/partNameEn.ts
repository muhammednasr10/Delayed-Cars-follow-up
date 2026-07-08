/** Arabic → English helpers for BOM part names (display + import cleanup). */

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F]/

export function isMostlyArabic(text: string): boolean {
  const s = String(text ?? '').trim()
  if (!s) return false
  const ar = (s.match(ARABIC_RE) || []).length
  const lat = (s.match(/[A-Za-z]/g) || []).length
  return ar > 0 && ar >= lat
}

export function isLatinPartName(text: string): boolean {
  const s = String(text ?? '').trim()
  if (!s) return false
  return /[A-Za-z]/.test(s) && !isMostlyArabic(s)
}

function normRawKey(k: string): string {
  return String(k)
    .trim()
    .toLowerCase()
    .replace(/[\s_.]+/g, '_')
    .replace(/[()#]/g, '')
}

/** English column from IPL raw row (Part Name(EN), etc.). */
export function englishFromRaw(raw: Record<string, string> | null | undefined): string {
  if (!raw) return ''
  let best = ''
  for (const [key, val] of Object.entries(raw)) {
    const v = String(val ?? '').trim()
    if (!v || isMostlyArabic(v)) continue
    const n = normRawKey(key)
    if (/part_name.*en|part_nameen|english|انجليز/i.test(n) && !/^part_name$/.test(n)) {
      return v
    }
    if (/^part_name_en$/.test(n)) return v
  }
  return best
}

const AR_EN_RULES: [string, string][] = [
  ['قاعدة الاكر الخارجية الخلفي', 'rear outer axle bracket'],
  ['قاعدة الاكر الخارجية الأمامي', 'front outer axle bracket'],
  ['مسمار صب الاكصدام الخلفي', 'rear bumper cast screw'],
  ['مسمار صب الاكصدام الأمامي', 'front bumper cast screw'],
  ['الاكصدام الخلفي', 'rear bumper'],
  ['الاكصدام الأمامي', 'front bumper'],
  ['صب الاكصدام', 'bumper cast'],
  ['الخارجية الخلفي', 'rear outer'],
  ['الخارجية الأمامي', 'front outer'],
  ['الخلفي', 'rear'],
  ['الخلفية', 'rear'],
  ['الأمامي', 'front'],
  ['الأمامية', 'front'],
  ['الخارجية', 'outer'],
  ['الخارجي', 'outer'],
  ['الداخلي', 'inner'],
  ['الداخلية', 'inner'],
  ['العلوي', 'upper'],
  ['العلوية', 'upper'],
  ['السفلي', 'lower'],
  ['السفلية', 'lower'],
  ['الجانبي', 'side'],
  ['الجانبية', 'side'],
  ['الاكر', 'axle'],
  ['اكر', 'axle'],
  ['الاكصدام', 'bumper'],
  ['اكصدام', 'bumper'],
  ['قاعدة', 'bracket'],
  ['مسمار', 'screw'],
  ['برغي', 'bolt'],
  ['صامولة', 'nut'],
  ['واشر', 'washer'],
  ['جلبة', 'bushing'],
  ['مقبض', 'handle'],
  ['باب', 'door'],
  ['مرآة', 'mirror'],
  ['مراة', 'mirror'],
  ['زجاج', 'glass'],
  ['سقف', 'roof'],
  ['محرك', 'engine'],
  ['فلتر', 'filter'],
  ['زيت', 'oil'],
  ['ماء', 'water'],
  ['تبريد', 'cooling'],
  ['تكييف', 'A/C'],
  ['مكيف', 'A/C'],
  ['كهرباء', 'electrical'],
  ['سلك', 'wire'],
  ['أسلاك', 'wiring'],
  ['حساس', 'sensor'],
  ['صمام', 'valve'],
  ['أنبوب', 'pipe'],
  ['خرطوم', 'hose'],
  ['خزان', 'tank'],
  ['طقم', 'kit'],
  ['مجموعة', 'set'],
  ['غطاء', 'cover'],
  ['حماية', 'guard'],
  ['دعامة', 'support'],
  ['قوس', 'arch'],
  ['إطار', 'frame'],
  ['هيكل', 'body'],
  ['صب', 'cast'],
  ['بلاستيك', 'plastic'],
  ['معدن', 'metal'],
  ['مطاط', 'rubber'],
  ['جلد', 'leather'],
  ['قماش', 'fabric'],
  ['داخلي', 'interior'],
  ['خارجي', 'exterior'],
  ['يمين', 'right'],
  ['يسار', 'left'],
  ['أمام', 'front'],
  ['خلف', 'rear'],
  ['علوي', 'upper'],
  ['سفلي', 'lower']
] as [string, string][]

const AR_EN_SORTED = [...AR_EN_RULES].sort((a, b) => b[0].length - a[0].length)

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Translate Arabic part description to English (word-order reversed for readability). */
export function translateArabicPartName(arabic: string): string {
  let rest = String(arabic ?? '')
    .trim()
    .replace(/\s+/g, ' ')
  if (!rest || !isMostlyArabic(rest)) return rest

  const tokens: string[] = []
  let guard = 0
  while (rest.length > 0 && guard++ < 200) {
    let matched = false
    for (const [ar, en] of AR_EN_SORTED) {
      if (rest.startsWith(ar)) {
        tokens.push(en)
        rest = rest.slice(ar.length).trim()
        matched = true
        break
      }
    }
    if (!matched) rest = rest.slice(1)
  }

  if (tokens.length === 0) return ''
  const ordered = [...tokens].reverse()
  return ordered.map((w, i) => (i === 0 ? capitalize(w) : w)).join(' ')
}

const EN_AR_SORTED: [string, string][] = [...AR_EN_RULES]
  .map(([ar, en]) => [en.toLowerCase(), ar] as [string, string])
  .sort((a, b) => b[0].length - a[0].length)

/** Suggest Arabic part description from English (rule-based; user can edit). */
export function translateEnglishPartName(english: string): string {
  let rest = String(english ?? '')
    .trim()
    .toLowerCase()
  if (!rest || isMostlyArabic(rest)) return rest

  const tokens: string[] = []
  let guard = 0
  while (rest.length > 0 && guard++ < 200) {
    let matched = false
    for (const [en, ar] of EN_AR_SORTED) {
      if (rest.startsWith(en)) {
        tokens.push(ar)
        rest = rest.slice(en.length).trim()
        matched = true
        break
      }
    }
    if (!matched) {
      const word = rest.match(/^[\w/*.+()-]+/)?.[0]
      if (word) {
        tokens.push(word)
        rest = rest.slice(word.length).trim()
      } else {
        rest = rest.slice(1).trim()
      }
    }
  }

  if (tokens.length === 0) return ''
  return tokens.join(' ')
}

export function resolvePartNameEn(row: {
  part_name_ar?: string | null
  part_name_en?: string | null
  raw_data?: Record<string, string> | null
}): string {
  const stored = row.part_name_en?.trim() || ''
  if (stored && isLatinPartName(stored)) return stored

  const fromRaw = englishFromRaw(row.raw_data)
  if (fromRaw) return fromRaw

  const ar = row.part_name_ar?.trim() || ''
  if (ar && isMostlyArabic(ar)) {
    const translated = translateArabicPartName(ar)
    if (translated) return translated
  }

  if (stored && !isMostlyArabic(stored)) return stored
  return ''
}

/** Pick English name for import (never store Arabic in part_name_en). */
export function sanitizePartNameEn(
  partNameAr: string,
  partNameEn: string,
  raw?: Record<string, string>
): string {
  const en = partNameEn.trim()
  if (en && isLatinPartName(en)) return en
  const fromRaw = englishFromRaw(raw)
  if (fromRaw) return fromRaw
  const ar = partNameAr.trim()
  if (ar && isMostlyArabic(ar)) {
    const translated = translateArabicPartName(ar)
    if (translated) return translated
  }
  return ''
}
