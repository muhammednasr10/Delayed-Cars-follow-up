import type { Station } from '../Types/settings'
import { composeStationNumber, normalizeStationReferenceCode, workerIndexFromStationCode } from './stationHierarchy'

type StationNameSource = Pick<
  Station,
  'id' | 'station_number' | 'parent_station_id' | 'worker1_operations_summary' | 'is_active'
>

let cachedStations: StationNameSource[] | null = null
let cachedByParent = new Map<string, StationNameSource>()
let cachedByCode = new Map<string, StationNameSource>()

function preferStation(current: StationNameSource | undefined, next: StationNameSource): StationNameSource {
  if (!current) return next
  if (next.is_active && !current.is_active) return next
  return current
}

function nameIndex(stations: StationNameSource[]) {
  if (cachedStations === stations) return { byParent: cachedByParent, byCode: cachedByCode }
  const byParent = new Map<string, StationNameSource>()
  const byCode = new Map<string, StationNameSource>()
  for (const station of stations) {
    const index = workerIndexFromStationCode(station.station_number)
    if (index == null) continue
    const code = composeStationNumber(normalizeStationReferenceCode(station.station_number), `L${index}`).toUpperCase()
    byCode.set(code, preferStation(byCode.get(code), station))
    if (station.parent_station_id) {
      const key = `${station.parent_station_id}:${index}`
      byParent.set(key, preferStation(byParent.get(key), station))
    }
  }
  cachedStations = stations
  cachedByParent = byParent
  cachedByCode = byCode
  return { byParent, byCode }
}

/** الاسم الشائع لخط العامل (PBS01-L2) كما يُحفظ من Line Balancing على خط العامل نفسه. */
export function workerLineCommonName(
  stations: StationNameSource[],
  master: Pick<Station, 'id' | 'station_number'>,
  levelTrack: number
): string {
  const { byParent, byCode } = nameIndex(stations)
  const linked = byParent.get(`${master.id}:${levelTrack}`)
  const code = composeStationNumber(normalizeStationReferenceCode(master.station_number), `L${levelTrack}`).toUpperCase()
  const child = linked ?? byCode.get(code)
  return child?.worker1_operations_summary?.trim() ?? ''
}
