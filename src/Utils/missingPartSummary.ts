import type { MissingPartDetail } from '../Types/missingPart'

export type SummaryBreakdownRow = {
  key: string
  label?: string
  code?: string
  vehicles: number
  lines: number
  remainingQty: number
  pendingVehicles: number
  pendingLines: number
  sharePct: number
}

export type MissingPartSummaryStats = {
  vehicleCount: number
  lineCount: number
  remainingQty: number
  pendingInstallLines: number
  pendingInstallVehicles: number
  fullyInstalledVehicles: number
  byModel: SummaryBreakdownRow[]
  byDepartment: SummaryBreakdownRow[]
  byReason: SummaryBreakdownRow[]
  byPart: SummaryBreakdownRow[]
  byReporter: SummaryBreakdownRow[]
  byStation: SummaryBreakdownRow[]
}

type Acc = {
  vehicles: Set<string>
  pendingVehicles: Set<string>
  lines: number
  pendingLines: number
  remainingQty: number
}

function emptyAcc(): Acc {
  return { vehicles: new Set(), pendingVehicles: new Set(), lines: 0, pendingLines: 0, remainingQty: 0 }
}

function bump(map: Map<string, Acc>, key: string, row: MissingPartDetail, pending: boolean) {
  const acc = map.get(key) ?? emptyAcc()
  acc.vehicles.add(row.vehicleId)
  acc.lines += 1
  acc.remainingQty += Math.max(0, row.remainingQty ?? row.requiredQty - row.installedQty)
  if (pending) {
    acc.pendingVehicles.add(row.vehicleId)
    acc.pendingLines += 1
  }
  map.set(key, acc)
}

function toRows(map: Map<string, Acc>, totalLines: number, asCode = false): SummaryBreakdownRow[] {
  return [...map.entries()]
    .map(([key, v]) => ({
      key,
      ...(asCode ? { code: key } : { label: key }),
      vehicles: v.vehicles.size,
      lines: v.lines,
      remainingQty: v.remainingQty,
      pendingVehicles: v.pendingVehicles.size,
      pendingLines: v.pendingLines,
      sharePct: totalLines > 0 ? Math.round((v.lines / totalLines) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.lines - a.lines || b.vehicles - a.vehicles || a.key.localeCompare(b.key, 'ar'))
}

function filterRows(items: MissingPartDetail[], mode: 'active' | 'archive') {
  return mode === 'archive'
    ? items.filter(p => !!p.shortageResolvedAt)
    : items.filter(p => !p.shortageResolvedAt && p.status !== 'closed' && p.status !== 'cancelled')
}

export function buildMissingPartSummary(
  items: MissingPartDetail[],
  mode: 'active' | 'archive' = 'active'
): MissingPartSummaryStats {
  const rows = filterRows(items, mode)
  const vehicleIds = new Set(rows.map(p => p.vehicleId))
  const remainingQty = rows.reduce(
    (sum, p) => sum + Math.max(0, p.remainingQty ?? p.requiredQty - p.installedQty),
    0
  )

  const pendingLinesList = mode === 'active' ? rows.filter(p => p.installedQty < p.requiredQty) : []
  const pendingVehicleIds = new Set(pendingLinesList.map(p => p.vehicleId))

  const fullyInstalledVehicleIds = new Set<string>()
  if (mode === 'active') {
    for (const id of vehicleIds) {
      const lines = rows.filter(p => p.vehicleId === id)
      if (lines.length > 0 && lines.every(p => p.installedQty >= p.requiredQty)) {
        fullyInstalledVehicleIds.add(id)
      }
    }
  } else {
    for (const id of vehicleIds) fullyInstalledVehicleIds.add(id)
  }

  const byModel = new Map<string, Acc>()
  const byDepartment = new Map<string, Acc>()
  const byReason = new Map<string, Acc>()
  const byPart = new Map<string, Acc>()
  const byReporter = new Map<string, Acc>()
  const byStation = new Map<string, Acc>()

  for (const row of rows) {
    const pending = mode === 'active' && row.installedQty < row.requiredQty
    bump(byModel, row.modelName?.trim() || '—', row, pending)
    bump(byDepartment, row.department?.trim() || '—', row, pending)
    bump(byReason, row.reason?.trim() || '—', row, pending)
    bump(byPart, row.partDescription?.trim() || '—', row, pending)
    bump(byReporter, row.createdByName?.trim() || row.createdByEmail?.trim() || '—', row, pending)
    const station = row.stationNumber
      ? `${row.stationNumber}${row.stationName ? ` · ${row.stationName}` : ''}`
      : '—'
    bump(byStation, station, row, pending)
  }

  const totalLines = rows.length

  return {
    vehicleCount: vehicleIds.size,
    lineCount: totalLines,
    remainingQty,
    pendingInstallLines: pendingLinesList.length,
    pendingInstallVehicles: pendingVehicleIds.size,
    fullyInstalledVehicles: fullyInstalledVehicleIds.size,
    byModel: toRows(byModel, totalLines),
    byDepartment: toRows(byDepartment, totalLines, true),
    byReason: toRows(byReason, totalLines, true),
    byPart: toRows(byPart, totalLines),
    byReporter: toRows(byReporter, totalLines),
    byStation: toRows(byStation, totalLines)
  }
}
