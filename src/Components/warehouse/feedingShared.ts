import type { FeedingWarehouseType, IplFeedingRow, ModelPartInventory } from '../../Types/warehouse'

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
  warehouseType: FeedingWarehouseType
  warehouseTypeLabel: string
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
  replenishmentFreq: string
  reorderPoint: string
  quantity: string
  available: number
  included: boolean
}

const PLAN_LINE_META_PREFIX = 'ipl:'

function encodePlanLineNotes(row: IplPlanDraftRow): string | null {
  const meta = {
    warehouseType: row.warehouseType,
    replenishmentFreq: row.replenishmentFreq.trim() || null,
    reorderPoint: row.reorderPoint.trim() || null,
    stationCode: row.stationCode,
    feedingMethod: row.feedingMethod || null
  }
  if (!meta.replenishmentFreq && !meta.reorderPoint) return null
  return `${PLAN_LINE_META_PREFIX}${JSON.stringify(meta)}`
}

export function iplPlanRowFromIpl(row: IplFeedingRow): IplPlanDraftRow {
  return {
    bomItemId: row.bomItemId,
    partId: row.partId,
    partNumber: row.partNumber,
    partName: row.partName,
    stationCode: row.stationCode,
    warehouseType: row.warehouseType,
    warehouseTypeLabel: row.warehouseTypeLabel,
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
    replenishmentFreq: '',
    reorderPoint: '',
    quantity: String(row.qtyPerVehicle || 1),
    available: row.qtyAvailable,
    included: true
  }
}

export function iplRowsForCarCount(rows: IplFeedingRow[], carCount: number): IplPlanDraftRow[] {
  const qty = Math.max(1, carCount)
  return rows.map(r => ({
    ...iplPlanRowFromIpl(r),
    quantity: String((r.qtyPerVehicle || 1) * qty),
    included: true
  }))
}

export function parseIplPlanLines(
  rows: IplPlanDraftRow[]
): { partId: string; quantity: number; notes?: string | null }[] | null {
  const byPart = new Map<string, { quantity: number; notes: string | null }>()
  for (const r of rows) {
    if (!r.included) continue
    const q = Number(r.quantity)
    if (!Number.isFinite(q) || q <= 0) return null
    const notes = encodePlanLineNotes(r)
    const prev = byPart.get(r.partId)
    if (prev) {
      byPart.set(r.partId, { quantity: prev.quantity + q, notes: prev.notes || notes })
    } else {
      byPart.set(r.partId, { quantity: q, notes })
    }
  }
  if (byPart.size === 0) return null
  return [...byPart.entries()].map(([partId, { quantity, notes }]) => ({
    partId,
    quantity,
    notes
  }))
}
