import { STATION_TYPES, type StationType } from '../Types/enums'

const LEGACY_STATION_TYPE_MAP: Record<string, StationType> = {
  pbs: 'main_line',
  preparation: 'offline_prep',
  other: 'main_line'
}

/** يوحّد الأنواع القديمة ويبقي الأنواع المضافة من الإعدادات كما هي. */
export function normalizeStationType(type: string | null | undefined): string {
  const raw = type?.trim() || 'main_line'
  if ((STATION_TYPES as readonly string[]).includes(raw)) return raw
  return LEGACY_STATION_TYPE_MAP[raw] ?? raw
}

/** Localized station type with fallback when DB has legacy/custom values. */
export function stationTypeLabel(
  t: (key: string) => string,
  type: string | null | undefined,
  options?: { code: string; labelAr: string }[]
): string {
  const normalized = normalizeStationType(type)
  const custom = options?.find(option => option.code === normalized)
  if (custom?.labelAr) return custom.labelAr
  if ((STATION_TYPES as readonly string[]).includes(normalized)) return t(`stationType.${normalized}`)
  return normalized
}
