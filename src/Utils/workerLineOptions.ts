import type { Station } from '../Types/settings'
import { formatStationWorkerDisplayCode, workerIndexFromStationCode } from './stationHierarchy'

export type WorkerLineOption = {
  stationId: string
  displayCode: string
  commonName: string
}

/** خطوط العمال من المحطات الفرعية مع الاسم الشائع (موازنة الخط). */
export function buildWorkerLineOptions(stations: Station[]): WorkerLineOption[] {
  return stations
    .filter(s => s.is_active && workerIndexFromStationCode(s.station_number) != null)
    .map(s => ({
      stationId: s.id,
      displayCode: formatStationWorkerDisplayCode(s.station_number),
      commonName: (s.worker1_operations_summary || '').trim()
    }))
    .filter(o => o.commonName.length > 0)
    .sort((a, b) =>
      a.displayCode.localeCompare(b.displayCode, undefined, { numeric: true, sensitivity: 'base' })
    )
}

export function workerLineOptionLabel(option: WorkerLineOption): string {
  return `${option.displayCode} — ${option.commonName}`
}
