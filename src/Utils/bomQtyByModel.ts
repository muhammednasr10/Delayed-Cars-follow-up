import { parseQtyByModel } from './partNumberNormalize'
import type { ParsedBomRow } from '../Types/bom'

export type ModelQtyEntry = { modelName: string; qty: number }

export function parseApplicableModelNames(text: string | null | undefined): string[] {
  return String(text ?? '')
    .split(/[,،]/)
    .map(s => s.trim())
    .filter(Boolean)
}

export function formatQtyByModelRaw(entries: ModelQtyEntry[]): string {
  return entries
    .filter(e => e.modelName)
    .map(e => `${e.modelName}=${e.qty}`)
    .join('; ')
}

export function maxModelQty(entries: ModelQtyEntry[]): number {
  const nums = entries.map(e => e.qty).filter(q => Number.isFinite(q) && q > 0)
  return nums.length ? Math.max(...nums) : 1
}

/** IPL rows: one BOM line per part+station with qty_by_model_raw breakdown. */
export function isConsolidatedImportRow(row: ParsedBomRow): boolean {
  if (!row.modelFamily?.trim()) return false
  if (row.qtyByModelRaw?.includes(';')) return true
  if (row.applicableModels.length > 1) return true
  return Boolean(row.qtyByModelRaw && row.applicableModels.length > 0)
}

/** Merge qty_by_model_raw + applicable_models into per-model qty map. */
export function modelQtyFromBomRow(row: {
  qty_by_model_raw?: string | null
  applicable_models_text?: string | null
  vehicle_model_name?: string | null
  quantity?: number
}): ModelQtyEntry[] {
  const fromRaw = parseQtyByModel(row.qty_by_model_raw ?? '')
  const byName = new Map<string, number>()

  for (const { model, qty } of fromRaw) {
    if (model) byName.set(model, qty)
  }

  const applicable = parseApplicableModelNames(row.applicable_models_text)
  for (const name of applicable) {
    if (!byName.has(name)) byName.set(name, 1)
  }

  if (row.vehicle_model_name && !byName.has(row.vehicle_model_name)) {
    byName.set(row.vehicle_model_name, row.quantity ?? 1)
  }

  return [...byName.entries()].map(([modelName, qty]) => ({ modelName, qty }))
}
