import type { ParentStationOperationsGroup } from '../Types/timeStudy'
import type { Station } from '../Types/settings'
import {
  normalizeStationBaseCode,
  normalizeStationReferenceCode,
  formatStationReferenceCode,
  parseStationNumberParts,
  stationCodePrefix,
  suggestNextStationCode
} from './stationHierarchy'
import { normalizeStationType } from './stationDisplay'

export type StationWizardValues = Record<string, string>

export function parseHeadcountWorkers(raw?: string): number | null {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return null
  return Math.floor(n)
}

export function emptyStationWizardValues(): StationWizardValues {
  return {
    sort_order: '0',
    station_base: '',
    station_name: '',
    station_type: 'main_line',
    is_active: 'true',
    headcount_workers: '1'
  }
}

export function stationToWizardValues(
  station: Pick<
    Station,
    | 'station_number'
    | 'station_name'
    | 'station_type'
    | 'sort_order'
    | 'is_active'
    | 'work_area_id'
    | 'work_areas'
    | 'headcount_workers'
  >
): StationWizardValues {
  const base = normalizeStationReferenceCode(station.station_number)
  const workAreaId = station.work_area_id ?? station.work_areas?.id ?? ''
  return {
    sort_order: station.sort_order != null ? String(station.sort_order) : '0',
    station_base: formatStationReferenceCode(station.station_number),
    station_name: station.station_name,
    station_type: normalizeStationType(station.station_type),
    work_area_id: workAreaId,
    is_active: station.is_active === false ? 'false' : 'true',
    station_number: base,
    headcount_workers:
      station.headcount_workers != null && station.headcount_workers > 0
        ? String(station.headcount_workers)
        : '1'
  }
}

export function resolveEditStationId(parent: ParentStationOperationsGroup): string | null {
  return parent.workers[0]?.stationId ?? parent.stationId
}

export function parentBaseCode(parent: ParentStationOperationsGroup): string {
  const fromWorker = parent.workers[0]?.stationNumber
  if (fromWorker) return parseStationNumberParts(fromWorker).base
  return normalizeStationBaseCode(parent.stationNumber)
}

export function workerWizardValues(parent: ParentStationOperationsGroup): StationWizardValues {
  return {
    ...emptyStationWizardValues(),
    station_base: parentBaseCode(parent)
  }
}

function lastStationByOrder(stations: Station[]): Station | null {
  if (stations.length === 0) return null
  const sorted = [...stations].sort((a, b) => {
    const sa = a.sort_order ?? 0
    const sb = b.sort_order ?? 0
    if (sa !== sb) return sa - sb
    return a.station_number.localeCompare(b.station_number)
  })
  return sorted[sorted.length - 1] ?? null
}

/** قيم افتراضية عند إضافة محطة: ترتيب تلقائي + نسخ باقي الحقول من آخر سطر */
export function createStationWizardDefaults(stations: Station[], allStationNumbers?: string[]): StationWizardValues {
  const last = lastStationByOrder(stations)
  const numbers = allStationNumbers ?? stations.map(s => s.station_number)
  if (!last) {
    return {
      ...emptyStationWizardValues(),
      sort_order: '1',
      station_base: suggestNextStationCode(numbers, 'ST')
    }
  }
  const nextSort = (last.sort_order ?? 0) + 1
  const prefix = stationCodePrefix(last.station_number)
  return {
    sort_order: String(nextSort),
    station_base: suggestNextStationCode(numbers, prefix),
    station_name: '',
    station_type: normalizeStationType(last.station_type),
    work_area_id: last.work_area_id ?? '',
    is_active: last.is_active === false ? 'false' : 'true',
    headcount_workers:
      last.headcount_workers != null && last.headcount_workers > 0
        ? String(last.headcount_workers)
        : '1'
  }
}
