import type { MpLookupOption } from '../Types/mpLookup'

const FALLBACK_REASONS: Record<string, string> = {
  production_mistake: 'خطأ إنتاج',
  handling: 'تلف أثناء التداول',
  supplier_defect: 'عيب مورد',
  storage: 'تلف تخزين',
  other: 'أخرى'
}

const FALLBACK_DECISIONS: Record<string, string> = {
  pending: 'قيد المراجعة',
  scrap: 'إعدام',
  rework: 'إعادة تشغيل',
  return_supplier: 'إرجاع للمورد',
  use_as_is: 'استخدام كما هو'
}

export function dpLookupLabel(options: MpLookupOption[], code: string, lang: string): string {
  const hit = options.find(o => o.code === code)
  if (hit) return lang === 'ar' ? hit.labelAr : hit.labelEn
  const fallback = lang === 'ar' ? FALLBACK_REASONS[code] ?? FALLBACK_DECISIONS[code] : code
  return fallback ?? code
}
