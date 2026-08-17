import type { MissingPartDetail } from '../Types/missingPart'

export type DimensionModelQtyMatrix = {
  dimensions: string[]
  models: string[]
  cellQty: number[][]
  dimensionTotals: number[]
  modelTotals: number[]
  grandTotal: number
}

function openOrArchiveRows(items: MissingPartDetail[], mode: 'active' | 'archive') {
  return mode === 'archive'
    ? items.filter(p => !!p.shortageResolvedAt)
    : items.filter(p => !p.shortageResolvedAt && p.status !== 'closed' && p.status !== 'cancelled')
}

/** Rows = dimension key, columns = models, values = required qty. */
export function buildDimensionModelRequiredQtyMatrix(
  items: MissingPartDetail[],
  getDimension: (row: MissingPartDetail) => string,
  mode: 'active' | 'archive' = 'active'
): DimensionModelQtyMatrix {
  const rows = openOrArchiveRows(items, mode)
  const dimSet = new Set<string>()
  const modelSet = new Set<string>()
  const cellQty = new Map<string, number>()
  const dimTotals = new Map<string, number>()
  const modelTotals = new Map<string, number>()
  let grandTotal = 0

  for (const row of rows) {
    const dim = getDimension(row).trim() || '—'
    const model = row.modelName?.trim() || '—'
    const qty = Math.max(0, Number(row.requiredQty) || 0)
    if (qty <= 0) continue
    const key = `${dim}\0${model}`
    dimSet.add(dim)
    modelSet.add(model)
    cellQty.set(key, (cellQty.get(key) ?? 0) + qty)
    dimTotals.set(dim, (dimTotals.get(dim) ?? 0) + qty)
    modelTotals.set(model, (modelTotals.get(model) ?? 0) + qty)
    grandTotal += qty
  }

  const dimensions = [...dimSet].sort(
    (a, b) => (dimTotals.get(b) ?? 0) - (dimTotals.get(a) ?? 0) || a.localeCompare(b, 'ar')
  )
  const models = [...modelSet].sort((a, b) => a.localeCompare(b, 'ar', { sensitivity: 'base' }))

  return {
    dimensions,
    models,
    cellQty: dimensions.map(dim => models.map(model => cellQty.get(`${dim}\0${model}`) ?? 0)),
    dimensionTotals: dimensions.map(d => dimTotals.get(d) ?? 0),
    modelTotals: models.map(m => modelTotals.get(m) ?? 0),
    grandTotal
  }
}

export function dimensionPartDescription(row: MissingPartDetail) {
  return row.partDescription?.trim() || '—'
}

export function dimensionReasonClass(row: MissingPartDetail) {
  return row.reason?.trim() || '—'
}

export function dimensionDepartment(row: MissingPartDetail) {
  return row.department?.trim() || '—'
}

export function dimensionReporter(row: MissingPartDetail) {
  return row.createdByName?.trim() || row.createdByEmail?.trim() || '—'
}

export function dimensionStation(row: MissingPartDetail) {
  return row.stationNumber
    ? `${row.stationNumber}${row.stationName ? ` · ${row.stationName}` : ''}`
    : '—'
}
