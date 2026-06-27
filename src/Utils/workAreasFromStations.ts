import type { Station, WorkArea } from '../Types/settings'

/** Distinct work areas assigned on stations (Settings → Stations → work area column). */
export function workAreasFromStations(
  stations: Station[],
  fallbackAreas: WorkArea[] = [],
  includeAreaId?: string | null
): WorkArea[] {
  const byId = new Map<string, WorkArea>()

  for (const station of stations) {
    const id = station.work_area_id
    if (!id) continue
    const name =
      station.work_areas?.name?.trim() ||
      fallbackAreas.find(a => a.id === id)?.name?.trim()
    if (!name) continue
    byId.set(id, { id, name, is_active: true })
  }

  if (includeAreaId && !byId.has(includeAreaId)) {
    const extra = fallbackAreas.find(a => a.id === includeAreaId)
    if (extra) byId.set(includeAreaId, extra)
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'ar'))
}
