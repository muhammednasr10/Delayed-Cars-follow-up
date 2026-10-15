import type { Station } from '../Types/settings'
import { composeStationNumber, normalizeStationReferenceCode, workerIndexFromStationCode } from './stationHierarchy'

type StationNameSource = Pick<
  Station,
  'id' | 'station_number' | 'parent_station_id' | 'worker1_operations_summary' | 'is_active'
>

/** الاسم الشائع لخط العامل (PBS01-L2) كما يُحفظ من Line Balancing على خط العامل نفسه. */
export function workerLineCommonName(
  stations: StationNameSource[],
  master: Pick<Station, 'id' | 'station_number'>,
  levelTrack: number
): string {
  const code = composeStationNumber(normalizeStationReferenceCode(master.station_number), `L${levelTrack}`)
  const matches = stations.filter(station => {
    const index = workerIndexFromStationCode(station.station_number)
    if (index !== levelTrack) return false
    if (station.parent_station_id === master.id) return true
    const stationCode = composeStationNumber(normalizeStationReferenceCode(station.station_number), `L${index}`)
    return stationCode.toUpperCase() === code.toUpperCase()
  })
  const child =
    matches.find(station => station.is_active && station.parent_station_id === master.id) ??
    matches.find(station => station.parent_station_id === master.id) ??
    matches.find(station => station.is_active) ??
    matches[0]
  return child?.worker1_operations_summary?.trim() ?? ''
}
