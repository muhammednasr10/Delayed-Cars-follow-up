import type { Station } from '../Types/settings'
import { normalizeStationReferenceCode, workerIndexFromStationCode } from './stationHierarchy'

/** Upper bound for training matrix tracks (DB check + UI). */
export const MAX_STATION_LEVEL_TRACK = 20

type MasterLike = Pick<Station, 'id' | 'station_number' | 'headcount_workers'>
type StationLike = Pick<Station, 'station_number' | 'parent_station_id' | 'is_active'>

/** عدد أعمدة العمال في المصفوفة = عدد العمال من Line Balancing (headcount)، مع احتياطي بعد خطوط العمال الفعلية. */
export function stationWorkerTrackCount(master: MasterLike, allStations: StationLike[]): number {
  if (master.headcount_workers != null && Number.isFinite(master.headcount_workers) && master.headcount_workers >= 1) {
    return Math.min(Math.floor(master.headcount_workers), MAX_STATION_LEVEL_TRACK)
  }

  const base = normalizeStationReferenceCode(master.station_number)
  let maxIdx = 0
  for (const station of allStations) {
    if (station.is_active === false) continue
    const idx = workerIndexFromStationCode(station.station_number)
    if (idx == null || idx < 1) continue
    const sameParent = station.parent_station_id === master.id
    const sameCode = normalizeStationReferenceCode(station.station_number) === base
    if (!sameParent && !sameCode) continue
    if (idx > maxIdx) maxIdx = idx
  }

  return Math.min(Math.max(maxIdx, 1), MAX_STATION_LEVEL_TRACK)
}

export function stationWorkerTrackLabel(stationNumber: string, levelTrack: number): string {
  return `${stationNumber}-L${levelTrack}`
}

export function stationWorkerTrackIndexes(trackCount: number): number[] {
  const n = Math.min(Math.max(Math.floor(trackCount), 1), MAX_STATION_LEVEL_TRACK)
  return Array.from({ length: n }, (_, i) => i + 1)
}
