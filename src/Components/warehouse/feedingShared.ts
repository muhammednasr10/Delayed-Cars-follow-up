import type { IplFeedingRow, ModelPartInventory } from '../../Types/warehouse'

export type FeedingDraftLine = {
  partId: string
  partNumber: string
  partName: string
  quantity: string
  available: number
}

export function parseFeedingLines(lines: FeedingDraftLine[]): { partId: string; quantity: number }[] | null {
  const payload: { partId: string; quantity: number }[] = []
  for (const l of lines) {
    const q = Number(l.quantity)
    if (!Number.isFinite(q) || q <= 0) return null
    payload.push({ partId: l.partId, quantity: q })
  }
  return payload
}

export function draftLineFromPart(part: ModelPartInventory): FeedingDraftLine {
  return {
    partId: part.partId,
    partNumber: part.partNumber,
    partName: part.partName,
    quantity: String(part.qtyPerVehicle || 1),
    available: part.qtyAvailable
  }
}

export type IplPlanDraftRow = {
  bomItemId: string
  partId: string
  partNumber: string
  partName: string
  stationCode: string | null
  qtyPerVehicle: number
  partDirectionLabel: string
  partKindLabel: string
  dimensions: string
  weight: string
  classification: string
  rackCapacity: string
  supplierLabel: string
  cartonQty: string
  feedingMethod: string
  quantity: string
  available: number
  included: boolean
}

export function iplPlanRowFromIpl(row: IplFeedingRow): IplPlanDraftRow {
  return {
    bomItemId: row.bomItemId,
    partId: row.partId,
    partNumber: row.partNumber,
    partName: row.partName,
    stationCode: row.stationCode,
    qtyPerVehicle: row.qtyPerVehicle,
    partDirectionLabel: row.partDirectionLabel,
    partKindLabel: row.partKindLabel,
    dimensions: row.dimensions,
    weight: row.weight,
    classification: row.classification,
    rackCapacity: row.rackCapacity,
    supplierLabel: row.supplierLabel,
    cartonQty: row.cartonQty,
    feedingMethod: row.feedingMethod,
    quantity: String(row.qtyPerVehicle || 1),
    available: row.qtyAvailable,
    included: true
  }
}

export function parseIplPlanLines(rows: IplPlanDraftRow[]): { partId: string; quantity: number }[] | null {
  const byPart = new Map<string, number>()
  for (const r of rows) {
    if (!r.included) continue
    const q = Number(r.quantity)
    if (!Number.isFinite(q) || q <= 0) return null
    byPart.set(r.partId, (byPart.get(r.partId) ?? 0) + q)
  }
  if (byPart.size === 0) return null
  return [...byPart.entries()].map(([partId, quantity]) => ({ partId, quantity }))
}
