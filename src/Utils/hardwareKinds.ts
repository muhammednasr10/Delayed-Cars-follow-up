export const HARDWARE_KINDS = ['bolt', 'nut', 'washer', 'clip', 'other'] as const
export type HardwareKind = (typeof HARDWARE_KINDS)[number]

export function hardwareKindLabel(kind: HardwareKind, lang: 'ar' | 'en'): string {
  const labels: Record<HardwareKind, { ar: string; en: string }> = {
    bolt: { ar: 'مسمار', en: 'Bolt' },
    nut: { ar: 'صامولة', en: 'Nut' },
    washer: { ar: 'وردة', en: 'Washer' },
    clip: { ar: 'كلبس', en: 'Clip' },
    other: { ar: 'أخرى', en: 'Other' }
  }
  return labels[kind][lang]
}

export function normalizeHardwareKind(raw: string | null | undefined): HardwareKind | '' {
  const s = (raw ?? '').trim().toLowerCase()
  if ((HARDWARE_KINDS as readonly string[]).includes(s)) return s as HardwareKind
  if (s.includes('مسمار') || s.includes('bolt') || s.includes('screw')) return 'bolt'
  if (s.includes('صامولة') || s.includes('nut')) return 'nut'
  if (s.includes('وردة') || s.includes('washer')) return 'washer'
  if (s.includes('كلبس') || s.includes('clip')) return 'clip'
  return ''
}

export function suggestHardwareKind(partName: string | null | undefined): HardwareKind | '' {
  return normalizeHardwareKind(partName)
}
