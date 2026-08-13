import type { MissingPartDetail } from '../Types/missingPart'

export type ModelReasonMatrix = {
  models: string[]
  reasonCodes: string[]
  /** Unique vehicles for model × reason. */
  cellVehicles: number[][]
  /** Shortage lines for model × reason. */
  cellLines: number[][]
  modelVehicleTotals: number[]
  modelLineTotals: number[]
  reasonVehicleTotals: number[]
  reasonLineTotals: number[]
  grandVehicles: number
  grandLines: number
}

function openOrArchiveRows(items: MissingPartDetail[], mode: 'active' | 'archive') {
  return mode === 'archive'
    ? items.filter(p => !!p.shortageResolvedAt)
    : items.filter(p => !p.shortageResolvedAt && p.status !== 'closed' && p.status !== 'cancelled')
}

/** Cross-tab: models (rows) × reason classifications (columns). */
export function buildModelReasonMatrix(
  items: MissingPartDetail[],
  mode: 'active' | 'archive' = 'active'
): ModelReasonMatrix {
  const rows = openOrArchiveRows(items, mode)
  const modelSet = new Set<string>()
  const reasonSet = new Set<string>()
  const cellVehicleSets = new Map<string, Set<string>>()
  const cellLineCounts = new Map<string, number>()
  const modelVehicles = new Map<string, Set<string>>()
  const modelLines = new Map<string, number>()
  const reasonVehicles = new Map<string, Set<string>>()
  const reasonLines = new Map<string, number>()
  const allVehicles = new Set<string>()

  for (const row of rows) {
    const model = row.modelName?.trim() || '—'
    const reason = row.reason?.trim() || '—'
    const key = `${model}\0${reason}`
    modelSet.add(model)
    reasonSet.add(reason)
    allVehicles.add(row.vehicleId)

    const cellSet = cellVehicleSets.get(key) ?? new Set<string>()
    cellSet.add(row.vehicleId)
    cellVehicleSets.set(key, cellSet)
    cellLineCounts.set(key, (cellLineCounts.get(key) ?? 0) + 1)

    const mv = modelVehicles.get(model) ?? new Set<string>()
    mv.add(row.vehicleId)
    modelVehicles.set(model, mv)
    modelLines.set(model, (modelLines.get(model) ?? 0) + 1)

    const rv = reasonVehicles.get(reason) ?? new Set<string>()
    rv.add(row.vehicleId)
    reasonVehicles.set(reason, rv)
    reasonLines.set(reason, (reasonLines.get(reason) ?? 0) + 1)
  }

  const models = [...modelSet].sort((a, b) => a.localeCompare(b, 'ar', { sensitivity: 'base' }))
  const reasonCodes = [...reasonSet].sort((a, b) => {
    const la = reasonLines.get(a) ?? 0
    const lb = reasonLines.get(b) ?? 0
    return lb - la || a.localeCompare(b, 'ar', { sensitivity: 'base' })
  })

  const cellVehicles = models.map(model =>
    reasonCodes.map(reason => cellVehicleSets.get(`${model}\0${reason}`)?.size ?? 0)
  )
  const cellLines = models.map(model =>
    reasonCodes.map(reason => cellLineCounts.get(`${model}\0${reason}`) ?? 0)
  )

  return {
    models,
    reasonCodes,
    cellVehicles,
    cellLines,
    modelVehicleTotals: models.map(m => modelVehicles.get(m)?.size ?? 0),
    modelLineTotals: models.map(m => modelLines.get(m) ?? 0),
    reasonVehicleTotals: reasonCodes.map(r => reasonVehicles.get(r)?.size ?? 0),
    reasonLineTotals: reasonCodes.map(r => reasonLines.get(r) ?? 0),
    grandVehicles: allVehicles.size,
    grandLines: rows.length
  }
}
