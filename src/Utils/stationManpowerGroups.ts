import {
  formatStationDisplayCode,
  normalizeStationReferenceCode,
  workerIndexFromStationCode
} from './stationHierarchy'
import type { StationManpowerDayEdit } from '../Types/stationManpowerDaily'
import type { Station } from '../Types/settings'

export type ManpowerStationGroup = {
  parentCode: string
  displayCode: string
  parentName: string
  workers: StationManpowerDayEdit[]
}

function isWorkerLineNumber(stationNumber: string): boolean {
  return /-L\d+$/i.test(stationNumber.trim())
}

/** محطات العمال فقط — مع إزالة تكرار رقم المحطة */
export function stationsForManpowerDaily(stations: Station[]): Station[] {
  const active = stations.filter(s => s.is_active)
  const byNumber = new Map<string, Station>()
  for (const station of active) {
    const key = station.station_number.trim().toUpperCase()
    const existing = byNumber.get(key)
    if (!existing || (station.sort_order ?? 0) < (existing.sort_order ?? 0)) {
      byNumber.set(key, station)
    }
  }
  const deduped = [...byNumber.values()]
  const workerLines = deduped.filter(s => isWorkerLineNumber(s.station_number))
  if (workerLines.length > 0) return workerLines.sort(compareStations)
  return deduped
    .filter(s => !deduped.some(other => other.parent_station_id === s.id))
    .sort(compareStations)
}

function compareStations(a: Station, b: Station): number {
  const ao = a.sort_order ?? 0
  const bo = b.sort_order ?? 0
  if (ao !== bo) return ao - bo
  return a.station_number.localeCompare(b.station_number, undefined, { numeric: true, sensitivity: 'base' })
}

function compareWorkerRows(a: StationManpowerDayEdit, b: StationManpowerDayEdit): number {
  const ia = workerIndexFromStationCode(a.stationNumber) ?? 999
  const ib = workerIndexFromStationCode(b.stationNumber) ?? 999
  if (ia !== ib) return ia - ib
  return a.stationNumber.localeCompare(b.stationNumber, undefined, { numeric: true, sensitivity: 'base' })
}

export function groupManpowerDayRows(rows: StationManpowerDayEdit[]): ManpowerStationGroup[] {
  const byParent = new Map<string, StationManpowerDayEdit[]>()
  for (const row of rows) {
    const parentCode = normalizeStationReferenceCode(row.stationNumber)
    const list = byParent.get(parentCode) ?? []
    list.push(row)
    byParent.set(parentCode, list)
  }

  return [...byParent.entries()]
    .map(([parentCode, workers]) => {
      const sorted = [...workers].sort(compareWorkerRows)
      const parentName = sorted[0]?.stationName ?? ''
      return {
        parentCode,
        displayCode: formatStationDisplayCode(parentCode),
        parentName,
        workers: sorted
      }
    })
    .sort((a, b) => a.parentCode.localeCompare(b.parentCode, undefined, { numeric: true, sensitivity: 'base' }))
}
