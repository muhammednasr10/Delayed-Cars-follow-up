import type { Station } from '../Types/settings'

export function isQualityTransferStation(
  station: Pick<Station, 'station_type' | 'is_active'>
): boolean {
  if (station.is_active === false) return false
  return station.station_type === 'quality'
}

export function qualityTransferStations(stations: Station[]): Station[] {
  return stations.filter(isQualityTransferStation).sort((a, b) =>
    a.station_number.localeCompare(b.station_number, undefined, { numeric: true })
  )
}

export function stationOptionLabel(station: Station): string {
  const name = station.station_name?.trim()
  if (!name || name === station.station_number) return station.station_number
  return `${station.station_number} — ${name}`
}
