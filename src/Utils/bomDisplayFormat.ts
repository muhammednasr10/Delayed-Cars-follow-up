import type { BomItemDetail } from '../Types/bom'
import { DEFAULT_PART_KIND, DEFAULT_SUPPLY_SOURCE, effectivePartKind, effectiveSupplySource } from './bomDefaults'

/** Type column: P / H/W → جزء / هاردوير */
export function formatPartKind(raw: string | null | undefined): string {
  const s = effectivePartKind(raw)
    .toUpperCase()
    .replace(/\s+/g, '')
  if (s === 'P' || s === 'PART' || s === 'PARTS' || s === '1' || s.includes('جزء')) return 'part'
  if (
    s === '2' ||
    s === 'H/W' ||
    s === 'HW' ||
    s === 'H' ||
    s === 'W' ||
    s.includes('HARD') ||
    s.includes('هارد') ||
    s.includes('HW')
  ) {
    return 'hardware'
  }
  if (s === 'PL' || s === 'PLASTICS' || s === 'PLASTIC' || s.includes('PLAST')) {
    return 'plastics'
  }
  return 'other'
}

export function partKindLabel(raw: string | null | undefined, t: (k: string) => string): string {
  const kind = formatPartKind(raw)
  if (kind === 'part') return t('bom.partKindPart')
  if (kind === 'hardware') return t('bom.partKindHardware')
  if (kind === 'plastics') return t('bom.partKindPlastics')
  const trimmed = String(raw ?? '').trim()
  return trimmed || t('bom.partKindPart')
}

/** CKD column → CKD or Local */
export function normalizeSupplySource(raw: string | null | undefined): string {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase()
  if (!s) return ''
  if (s === 'CKD' || s.includes('CKD')) return 'CKD'
  if (s === 'LOCAL' || s === 'L' || s.includes('LOCAL') || s.includes('محلي')) return 'Local'
  return String(raw).trim()
}

export function supplySourceLabel(raw: string | null | undefined, t: (k: string) => string): string {
  const n = effectiveSupplySource(raw)
  if (n === 'CKD') return t('bom.supplyCkd')
  if (n === 'Local') return t('bom.supplyLocal')
  return n
}

export function resolveSupplySource(row: BomItemDetail): string {
  if (row.supply_source?.trim()) return row.supply_source.trim()
  const raw = row.raw_data
  if (raw) {
    for (const key of Object.keys(raw)) {
      if (/^ckd$/i.test(key.trim())) {
        const v = String(raw[key] ?? '').trim()
        if (v) return v
      }
    }
  }
  return DEFAULT_SUPPLY_SOURCE
}

/** Short label for classification column (Common, T, T&L, L&C …) */
export function formatClassificationShort(raw: string | null | undefined): string {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  if (/^(common|t|l|c|t&l|t&c|l&c)$/i.test(s)) {
    return /^common$/i.test(s) ? 'Common' : s.toUpperCase()
  }
  if (/^common/i.test(s)) return 'Common'
  return s.length > 12 ? `${s.slice(0, 10)}…` : s
}

type ModelPartRef = { modelName: string; part_number: string }

function formatModelBracketGroup(models: string[], forceParens: boolean): string {
  if (models.length === 0) return ''
  const sorted = [...models].sort((a, b) => a.localeCompare(b))
  if (models.length === 1 && !forceParens) return sorted[0]
  return `(${sorted.join(', ')})`
}

/** Class column: group models that share the same part number in parentheses. */
export function formatClassByPartNumberGroups(variants: ModelPartRef[]): string {
  const active = variants.filter(v => v.modelName?.trim() && v.part_number?.trim())
  if (active.length === 0) return ''

  const byPn = new Map<string, string[]>()
  for (const v of active) {
    const pn = v.part_number.trim().toUpperCase()
    const list = byPn.get(pn) ?? []
    list.push(v.modelName.trim())
    byPn.set(pn, list)
  }

  const groups = [...byPn.values()].map(models => [...new Set(models)].sort((a, b) => a.localeCompare(b)))
  groups.sort((a, b) => (a[0] ?? '').localeCompare(b[0] ?? ''))

  const multiGroup = groups.length > 1
  return groups.map(g => formatModelBracketGroup(g, multiGroup)).join(' ')
}

/** Class label for one variant row inside the expanded breakdown. */
export function classLabelForVariant(variants: ModelPartRef[], current: ModelPartRef): string {
  const pn = current.part_number?.trim().toUpperCase()
  if (!pn || !current.modelName?.trim()) return ''
  const models = [
    ...new Set(
      variants
        .filter(v => v.part_number?.trim().toUpperCase() === pn && v.modelName?.trim())
        .map(v => v.modelName.trim())
    )
  ].sort((a, b) => a.localeCompare(b))
  if (models.length === 0) return ''
  const multiPn = new Set(variants.map(v => v.part_number?.trim().toUpperCase()).filter(Boolean)).size > 1
  return formatModelBracketGroup(models, multiPn || models.length > 1)
}
