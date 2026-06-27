import type { Station } from '../Types/settings'
import { formatStationReferenceCode } from './stationHierarchy'
import {
  dedupeMasterStationsForDisplay,
  isMasterReferenceStation,
  masterStationCode
} from './stationMaster'

/** Same label as Settings → Stations table (code + common name). */
export function formatStationSettingsLabel(station: Pick<Station, 'station_number' | 'station_name'>): string {
  return `${formatStationReferenceCode(station.station_number)} — ${station.station_name}`
}

/** Resolve worker-line or duplicate row to the master station shown in Settings. */
export function resolveMasterStation(station: Station, allStations: Station[]): Station {
  if (isMasterReferenceStation(station)) return station
  if (station.parent_station_id) {
    const parent = allStations.find(s => s.id === station.parent_station_id)
    if (parent) return resolveMasterStation(parent, allStations)
  }
  const code = masterStationCode(station).toUpperCase()
  const master = allStations.find(
    s => isMasterReferenceStation(s) && masterStationCode(s).toUpperCase() === code
  )
  return master ?? station
}

/** Stations listed in Settings → Stations (master reference rows, sorted). */
export function stationsFromSettings(
  stations: Station[],
  options?: { workAreaId?: string | null; includeStationId?: string | null }
): Station[] {
  let list = dedupeMasterStationsForDisplay(stations)

  if (options?.workAreaId) {
    list = list.filter(s => s.work_area_id === options.workAreaId)
  }

  if (options?.includeStationId) {
    const current = stations.find(s => s.id === options.includeStationId)
    if (current) {
      const master = resolveMasterStation(current, stations)
      if (!list.some(s => s.id === master.id)) {
        list = dedupeMasterStationsForDisplay([...list, master])
        if (options.workAreaId) {
          list = list.filter(s => s.work_area_id === options.workAreaId || s.id === master.id)
        }
      }
    }
  }

  return list
}
