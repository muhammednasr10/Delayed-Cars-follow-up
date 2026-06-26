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

function compareMasterStations(a: Station, b: Station): number {
  const sortDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0)
  if (sortDiff !== 0) return sortDiff
  return a.station_number.localeCompare(b.station_number, undefined, { numeric: true, sensitivity: 'base' })
}

export function pickCanonicalMasterStation(group: Station[]): Station {
  return [...group].sort(compareMasterStations)[0]
}

export function findDuplicateMasterGroups(stations: Station[]): Station[][] {
  const masters = filterMasterReferenceStations(stations)
  const byKey = new Map<string, Station[]>()
  for (const s of masters) {
    const key = normalizeStationReferenceCode(s.station_number)
    const list = byKey.get(key) ?? []
    list.push(s)
    byKey.set(key, list)
  }
  return [...byKey.values()].filter(group => group.length > 1)
}

/** عرض محطة مرجعية واحدة لكل كود (PBS-01) — بدون تكرار خطوط العمال */
export function dedupeMasterStationsForDisplay(stations: Station[]): Station[] {
  const masters = filterMasterReferenceStations(stations)
  const byKey = new Map<string, Station>()
  for (const s of masters) {
    const key = normalizeStationReferenceCode(s.station_number)
    const existing = byKey.get(key)
    byKey.set(key, existing ? pickCanonicalMasterStation([existing, s]) : s)
  }
  return [...byKey.values()].sort(compareMasterStations)
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
