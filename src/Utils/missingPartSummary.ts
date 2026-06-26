import type { MissingPartDetail } from '../Types/missingPart'

export type MissingPartSummaryStats = {
  vehicleCount: number
  lineCount: number
  pendingInstallLines: number
  pendingInstallVehicles: number
  fullyInstalledVehicles: number
  byModel: { label: string; vehicles: number; lines: number }[]
  byDepartment: { code: string; vehicles: number; lines: number }[]
  byReason: { code: string; vehicles: number; lines: number }[]
  byStation: { label: string; vehicles: number; lines: number }[]
}

function bumpMap(map: Map<string, { vehicles: Set<string>; lines: number }>, key: string, vehicleId: string) {
  const row = map.get(key) ?? { vehicles: new Set<string>(), lines: 0 }
  row.vehicles.add(vehicleId)
  row.lines += 1
  map.set(key, row)
}

function mapToRows(map: Map<string, { vehicles: Set<string>; lines: number }>, codeAsLabel = false) {
  return [...map.entries()]
    .map(([label, v]) => ({
      ...(codeAsLabel ? { code: label } : { label }),
      vehicles: v.vehicles.size,
      lines: v.lines
    }))
    .sort((a, b) => b.lines - a.lines || b.vehicles - a.vehicles)
}

export function buildMissingPartSummary(items: MissingPartDetail[]): MissingPartSummaryStats {
  const open = items.filter(p => !p.shortageResolvedAt && p.status !== 'closed' && p.status !== 'cancelled')
  const vehicleIds = new Set(open.map(p => p.vehicleId))

  const pendingLines = open.filter(p => p.installedQty < p.requiredQty)
  const pendingVehicleIds = new Set(pendingLines.map(p => p.vehicleId))

  const fullyInstalledVehicleIds = new Set<string>()
  for (const id of vehicleIds) {
    const lines = open.filter(p => p.vehicleId === id)
    if (lines.length > 0 && lines.every(p => p.installedQty >= p.requiredQty)) {
      fullyInstalledVehicleIds.add(id)
    }
  }

  const byModel = new Map<string, { vehicles: Set<string>; lines: number }>()
  const byDepartment = new Map<string, { vehicles: Set<string>; lines: number }>()
  const byReason = new Map<string, { vehicles: Set<string>; lines: number }>()
  const byStation = new Map<string, { vehicles: Set<string>; lines: number }>()

  for (const row of open) {
    bumpMap(byModel, row.modelName || '—', row.vehicleId)
    bumpMap(byDepartment, row.department || '—', row.vehicleId)
    bumpMap(byReason, row.reason || '—', row.vehicleId)
    const station = row.stationNumber ? `${row.stationNumber}${row.stationName ? ` · ${row.stationName}` : ''}` : '—'
    bumpMap(byStation, station, row.vehicleId)
  }

  return {
    vehicleCount: vehicleIds.size,
    lineCount: open.length,
    pendingInstallLines: pendingLines.length,
    pendingInstallVehicles: pendingVehicleIds.size,
    fullyInstalledVehicles: fullyInstalledVehicleIds.size,
    byModel: mapToRows(byModel) as MissingPartSummaryStats['byModel'],
    byDepartment: mapToRows(byDepartment, true) as MissingPartSummaryStats['byDepartment'],
    byReason: mapToRows(byReason, true) as MissingPartSummaryStats['byReason'],
    byStation: mapToRows(byStation) as MissingPartSummaryStats['byStation']
  }
}
