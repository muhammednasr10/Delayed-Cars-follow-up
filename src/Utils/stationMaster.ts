import type { Station } from '../Types/settings'
import type { ParentStationOperationsGroup } from '../Types/timeStudy'
import { normalizeStationReferenceCode, workerIndexFromStationCode } from './stationHierarchy'

/** محطة مرجعية في الإعدادات — كود أساسي بدون لاحقة عامل */
export function isMasterReferenceStation(
  s: Pick<Station, 'station_number' | 'parent_station_id'>
): boolean {
  if (s.parent_station_id) return false
  return !/-L\d+$/i.test(s.station_number.trim())
}

export function filterMasterReferenceStations(stations: Station[]): Station[] {
  return stations.filter(isMasterReferenceStation)
}

export function masterStationCode(s: Pick<Station, 'station_number'>): string {
  return normalizeStationReferenceCode(s.station_number)
}

export function countWorkerLines(parent: ParentStationOperationsGroup): number {
  return parent.workers.filter(w => workerIndexFromStationCode(w.stationNumber) != null).length
}

/** المحطة المرجعية (PBS-01) وليس خط العامل (PBS01-L1) */
export function resolveMasterStationRecord(
  parent: ParentStationOperationsGroup,
  allStations: Station[]
): Station | null {
  if (parent.stationId) {
    const byId = allStations.find(s => s.id === parent.stationId)
    if (byId) {
      if (isMasterReferenceStation(byId)) return byId
      if (byId.parent_station_id) {
        const master = allStations.find(s => s.id === byId.parent_station_id)
        if (master) return master
      }
    }
  }

  const code = masterStationCode({ station_number: parent.stationNumber }).toUpperCase()
  const byCode = allStations.find(
    s => masterStationCode(s).toUpperCase() === code && isMasterReferenceStation(s)
  )
  if (byCode) return byCode

  for (const worker of parent.workers) {
    if (!worker.stationId) continue
    const row = allStations.find(s => s.id === worker.stationId)
    if (!row) continue
    if (row.parent_station_id) {
      const master = allStations.find(s => s.id === row.parent_station_id)
      if (master) return master
    }
    const workerCode = masterStationCode(row).toUpperCase()
    const master = allStations.find(
      s => masterStationCode(s).toUpperCase() === workerCode && isMasterReferenceStation(s)
    )
    if (master) return master
  }

  return null
}
