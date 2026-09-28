import { supabase } from '../lib/supabase'
import { STATION_TYPES, type StationType } from '../Types/enums'

export type StationTypeOption = {
  code: string
  labelAr: string
  labelEn: string
  sortOrder: number
}

const FALLBACK_LABELS: Record<StationType, { ar: string; en: string }> = {
  main_line: { ar: 'محطة على الخط', en: 'On-line station' },
  side_assembly: { ar: 'محطة تجميع جانبي', en: 'Side assembly' },
  offline_prep: { ar: 'محطة تحضير', en: 'Offline prep' },
  quality: { ar: 'محطة جودة', en: 'Quality station' }
}

function client() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

export function fallbackStationTypeOptions(): StationTypeOption[] {
  return STATION_TYPES.map((code, index) => ({
    code,
    labelAr: FALLBACK_LABELS[code].ar,
    labelEn: FALLBACK_LABELS[code].en,
    sortOrder: (index + 1) * 10
  }))
}

export function newStationTypeCode(): string {
  return `type_${Date.now().toString(36)}`
}

export async function getStationTypeOptions(): Promise<StationTypeOption[]> {
  const { data, error } = await client()
    .from('station_type_options')
    .select('code, label_ar, label_en, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order')
  if (error) {
    if (/station_type_options/i.test(error.message)) return fallbackStationTypeOptions()
    throw new Error(error.message)
  }
  const rows = (data ?? []) as { code: string; label_ar: string; label_en: string; sort_order: number }[]
  if (rows.length === 0) return fallbackStationTypeOptions()
  return rows.map(row => ({
    code: row.code,
    labelAr: row.label_ar,
    labelEn: row.label_en || row.label_ar,
    sortOrder: row.sort_order
  }))
}

export async function saveStationTypeOptions(options: StationTypeOption[]): Promise<void> {
  const payload = options
    .map((option, index) => ({
      code: option.code.trim(),
      label_ar: option.labelAr.trim(),
      label_en: (option.labelEn || option.labelAr).trim(),
      sort_order: (index + 1) * 10,
      is_active: true
    }))
    .filter(option => option.code && option.label_ar)
  if (payload.length === 0) return
  const { error } = await client().from('station_type_options').upsert(payload, { onConflict: 'code' })
  if (error) throw new Error(error.message)
}
