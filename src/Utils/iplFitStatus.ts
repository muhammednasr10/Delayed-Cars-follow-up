import type { BomItemDetail } from '../Types/bom'
import { isPendingBomItemId } from './iplModelParts'
import { bomRowAppliesToModel, modelQtyForBomRow, parseApplicableModelNames } from './bomQtyByModel'

export const IPL_NOT_FITTED_QTY = 'NA'
export const IPL_NOT_FITTED_PN = 'NA'
export const IPL_NOT_FITTED_SHEET = 'ipl_not_fitted'

export const IPL_COMPARE_UNSET = '__IPL_UNSET__'
export const IPL_COMPARE_NOT_FITTED = '__IPL_NOT_FITTED__'

export type IplFitStatus = 'fitted' | 'not_fitted' | 'unset'

type FitRow = {
  qty_by_model_raw?: string | null
  applicable_models_text?: string | null
  vehicle_model_name?: string | null
  quantity?: number | null
  source_sheet?: string | null
  part_number?: string | null
}

export function isIplNotFittedQtyToken(token: string | null | undefined): boolean {
  const u = String(token ?? '')
    .trim()
    .toUpperCase()
  return u === 'NA' || u === 'N/A' || u === 'NF' || u === 'NO' || u === '__NOT_FITTED__'
}

export function isIplCompareFitToken(value: string): boolean {
  return value === IPL_COMPARE_UNSET || value === IPL_COMPARE_NOT_FITTED
}

function qtyRawNotFittedModels(raw: string | null | undefined): string[] {
  const s = String(raw ?? '').trim()
  if (!s) return []
  const out: string[] = []
  for (const chunk of s.split(/[;；]/)) {
    const part = chunk.trim()
    const eq = part.indexOf('=')
    if (eq <= 0) continue
    const model = part.slice(0, eq).trim()
    const token = part.slice(eq + 1).trim()
    if (model && isIplNotFittedQtyToken(token)) out.push(model)
  }
  return out
}

export function notFittedModelsFromBomRow(row: FitRow): string[] {
  const fromRaw = qtyRawNotFittedModels(row.qty_by_model_raw)
  if (fromRaw.length > 0) return fromRaw
  const isMarker = row.source_sheet === IPL_NOT_FITTED_SHEET || isIplNotFittedQtyToken(row.part_number)
  if (!isMarker) return []
  if (row.vehicle_model_name?.trim()) return [row.vehicle_model_name.trim()]
  const applicable = parseApplicableModelNames(row.applicable_models_text)
  return applicable.length === 1 ? applicable : []
}

export function isIplNotFittedForModel(row: FitRow, modelName: string): boolean {
  const target = modelName.trim().toUpperCase()
  if (!target) return false
  return notFittedModelsFromBomRow(row).some(n => n.trim().toUpperCase() === target)
}

export function bomRowAssignedToIplModel(row: FitRow, modelName: string): boolean {
  return isIplNotFittedForModel(row, modelName) || bomRowAppliesToModel(row, modelName)
}

export function iplFitStatusForModel(item: BomItemDetail | undefined, model: string): IplFitStatus {
  if (!item || isPendingBomItemId(item.id)) return 'unset'
  if (isIplNotFittedForModel(item, model)) return 'not_fitted'
  if (modelQtyForBomRow(item, model) > 0) return 'fitted'
  return 'unset'
}

export function compareTokenForFitStatus(status: IplFitStatus): string | null {
  if (status === 'unset') return IPL_COMPARE_UNSET
  if (status === 'not_fitted') return IPL_COMPARE_NOT_FITTED
  return null
}
