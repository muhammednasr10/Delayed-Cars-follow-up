import { departmentLabel, reasonLabel } from '../Types/enums'
import type { MpDepartmentReasonLink, MpLookupOption } from '../Types/mpLookup'

/** Survives remounts / brief empty option arrays so the table never flashes raw codes. */
const labelCache = new Map<string, { ar: string; en: string }>()

export function normalizeLookupCode(code: string): string {
  return code.trim().replace(/\./g, '_').toLowerCase()
}

export function isOpaqueLookupCode(code: string): boolean {
  const c = code.trim()
  if (!c) return false
  if (/^opt[._]\d+$/i.test(c)) return true
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(c)) return true
  return false
}

export function ingestMpLookupOptions(options: MpLookupOption[]): void {
  for (const o of options) {
    const ar = (o.labelAr || o.labelEn || '').trim()
    const en = (o.labelEn || o.labelAr || '').trim()
    if (!ar && !en) continue
    const entry = { ar: ar || en, en: en || ar }
    labelCache.set(o.code, entry)
    const norm = normalizeLookupCode(o.code)
    if (norm !== o.code) labelCache.set(norm, entry)
  }
}

function findOption(options: MpLookupOption[], code: string): MpLookupOption | undefined {
  const exact = options.find(o => o.code === code)
  if (exact) return exact
  const norm = normalizeLookupCode(code)
  return options.find(o => normalizeLookupCode(o.code) === norm)
}

export function mpLookupLabel(options: MpLookupOption[], code: string, lang: string): string {
  const key = (code ?? '').trim()
  if (!key) return '—'

  const hit = findOption(options, key)
  if (hit) {
    const label = lang === 'ar' ? hit.labelAr || hit.labelEn : hit.labelEn || hit.labelAr
    if (label?.trim()) return label.trim()
  }

  const cached = labelCache.get(key) ?? labelCache.get(normalizeLookupCode(key))
  if (cached) return lang === 'ar' ? cached.ar : cached.en

  const reason = reasonLabel[key as keyof typeof reasonLabel]
  if (reason) return reason
  const dept = departmentLabel[key as keyof typeof departmentLabel]
  if (dept) return dept

  // Never show generator codes / UUIDs in the UI.
  if (isOpaqueLookupCode(key)) return '—'
  return key
}

export function defaultReasonCode(options: MpLookupOption[]): string {
  return options.find(o => o.isActive)?.code ?? options[0]?.code ?? 'stock_shortage'
}

export function defaultDepartmentCode(options: MpLookupOption[]): string {
  return options.find(o => o.isActive)?.code ?? options[0]?.code ?? 'warehouse'
}

export const MP_STOCK_SHORTAGE_CODE = 'stock_shortage'

export function isStockShortageReason(code: string): boolean {
  return code === MP_STOCK_SHORTAGE_CODE
}

export function reasonsForDepartment(
  reasons: MpLookupOption[],
  links: MpDepartmentReasonLink[],
  departmentCode: string,
  currentReason?: string
): MpLookupOption[] {
  if (!departmentCode) return reasons
  const forDept = links.filter(l => l.departmentCode === departmentCode)
  let list =
    forDept.length === 0 ? reasons : reasons.filter(r => forDept.some(l => l.reasonCode === r.code))
  if (currentReason && !list.some(r => r.code === currentReason)) {
    const extra = reasons.find(r => r.code === currentReason)
    list = extra ? [extra, ...list] : list
  }
  return list
}

export function pickReasonForDepartment(
  reasons: MpLookupOption[],
  links: MpDepartmentReasonLink[],
  departmentCode: string,
  currentReason: string
): string {
  const list = reasonsForDepartment(reasons, links, departmentCode)
  if (list.some(r => r.code === currentReason)) return currentReason
  return list[0]?.code ?? ''
}
