import { STATION_TYPES, type StationType } from '../Types/enums'

const LEGACY_STATION_TYPE_MAP: Record<string, StationType> = {
  pbs: 'main_line',
  preparation: 'offline_prep',
  other: 'main_line'
}

/** يوحّد أنواع المحطات القديمة (مثل pbs) إلى القيم المعتمدة في الواجهة */
export function normalizeStationType(type: string | null | undefined): StationType {
  const raw = type?.trim() || 'main_line'
  if ((STATION_TYPES as readonly string[]).includes(raw)) return raw as StationType
  return LEGACY_STATION_TYPE_MAP[raw] ?? 'main_line'
}

/** Localized station type with fallback when DB has legacy/custom values. */
export function stationTypeLabel(t: (key: string) => string, type: string | null | undefined): string {
  const normalized = normalizeStationType(type)
  return t(`stationType.${normalized}`)
}
