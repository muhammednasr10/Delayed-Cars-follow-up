import { parseQtyByModel } from './partNumberNormalize'
import type { ParsedBomRow } from '../Types/bom'

export type ModelQtyEntry = { modelName: string; qty: number }

export function parseApplicableModelNames(text: string | null | undefined): string[] {
  return String(text ?? '')
    .split(/[,،]/)
    .map(s => s.trim())
    .filter(Boolean)
}

/** After removing one model; empty stored list means «all models». */
export function applicableModelsAfterRemoval(
  storedText: string | null | undefined,
  removeModel: string,
  allModelNames: string[]
): string[] {
  const stored = parseApplicableModelNames(storedText)
  const target = removeModel.trim().toUpperCase()
  if (stored.length === 0) {
    return allModelNames.filter(n => n.trim().toUpperCase() !== target)
  }
  return stored.filter(n => n.trim().toUpperCase() !== target)
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

/** Merge qty_by_model_raw into per-model qty map (strict — no guessing from applicable_models when raw exists). */
export function modelQtyFromBomRow(row: {
  qty_by_model_raw?: string | null
  applicable_models_text?: string | null
  vehicle_model_name?: string | null
  quantity?: number | null
}): ModelQtyEntry[] {
  const raw = row.qty_by_model_raw?.trim()
  if (raw) {
    return parseQtyByModel(raw)
      .map(e => ({ modelName: e.model.trim(), qty: e.qty }))
      .filter(e => e.modelName && e.qty > 0)
  }

  if (row.vehicle_model_name?.trim()) {
    const qty = Number(row.quantity)
    const n = Number.isFinite(qty) && qty > 0 ? qty : 0
    if (n > 0) return [{ modelName: row.vehicle_model_name.trim(), qty: n }]
  }

  const applicable = parseApplicableModelNames(row.applicable_models_text)
  if (applicable.length === 1) {
    const qty = Number(row.quantity)
    const n = Number.isFinite(qty) && qty > 0 ? qty : 1
    return [{ modelName: applicable[0], qty: n }]
  }

  return []
}

export function modelQtyForBomRow(
  row: {
    qty_by_model_raw?: string | null
    applicable_models_text?: string | null
    vehicle_model_name?: string | null
    quantity?: number | null
  },
  modelName: string
): number {
  const target = modelName.trim().toUpperCase()
  if (!target) return 0
  const hit = modelQtyFromBomRow(row).find(e => e.modelName.trim().toUpperCase() === target)
  return hit?.qty ?? 0
}

/** True when this BOM row applies to the model with qty > 0. */
export function bomRowAppliesToModel(
  row: {
    qty_by_model_raw?: string | null
    applicable_models_text?: string | null
    vehicle_model_name?: string | null
    quantity?: number | null
  },
  modelName: string
): boolean {
  return modelQtyForBomRow(row, modelName) > 0
}

/** Distinct model names with qty > 0 on one or more BOM rows. */
export function countDistinctModelsOnBomRows(
  rows: Array<{
    qty_by_model_raw?: string | null
    applicable_models_text?: string | null
    vehicle_model_name?: string | null
    quantity?: number | null
  }>
): number {
  const names = new Set<string>()
  for (const row of rows) {
    for (const e of modelQtyFromBomRow(row)) {
      if (e.qty > 0) names.add(e.modelName.trim().toUpperCase())
    }
  }
  return names.size
}

export function partMasterModelCount(
  part: { applicable_models_text?: string | null },
  bomRows: Array<{
    qty_by_model_raw?: string | null
    applicable_models_text?: string | null
    vehicle_model_name?: string | null
    quantity?: number | null
  }>
): number {
  const fromBom = countDistinctModelsOnBomRows(bomRows)
  if (fromBom > 0) return fromBom
  return parseApplicableModelNames(part.applicable_models_text).length
}
