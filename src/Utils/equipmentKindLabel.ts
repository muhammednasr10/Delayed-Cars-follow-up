import type { EquipmentKind } from '../Types/equipmentKind'

export function slugEquipmentKindCode(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32)
  return base || `kind_${Date.now().toString(36)}`
}

export function equipmentKindLabel(
  code: string,
  kinds: EquipmentKind[],
  lang: 'ar' | 'en',
  fallback?: string,
): string {
  const kind = kinds.find(k => k.code === code)
  if (!kind) return fallback ?? code
  const label = lang === 'en' ? kind.labelEn || kind.labelAr : kind.labelAr || kind.labelEn
  return label || fallback || code
}
