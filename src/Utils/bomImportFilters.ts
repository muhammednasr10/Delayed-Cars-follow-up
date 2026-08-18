import type { ParsedBomRow } from '../Types/bom'
import { displayBomStationCode } from './bomStationCode'
import { formatQtyByModelRaw } from './bomQtyByModel'
import { parseQtyByModel } from './partNumberNormalize'
import { normalizeStationReferenceCode } from './stationHierarchy'

/** IPL column T → T4 Turbo. */
export const T4_TURBO_MODEL = 'T4T'

/** True when station code is a PBS rack (PBS-01, PBS01, PBS1, …). */
export function isPbsStationCode(code: string | null | undefined): boolean {
  const raw = String(code ?? '').trim()
  if (!raw) return false
  const base = normalizeStationReferenceCode(raw)
  return /^PBS\d+$/i.test(base) || /^PBS/i.test(raw.replace(/[\s-]/g, ''))
}

export function isT4IplSheetName(sheetName: string): boolean {
  const n = sheetName.trim()
  return /ipl.*t4|t4.*ipl|t4.*turbo|turbo.*t4|tiggo\s*4|t4t/i.test(n)
}

export function stationKeyForImportRow(row: ParsedBomRow): string {
  const display = displayBomStationCode(row.stationCode)
  return display || row.stationCode.trim() || '—'
}

export type ImportRowFilterResult = {
  rows: ParsedBomRow[]
  excludedPbs: number
  excludedByStation: number
  excludedNoVariant: number
}

function qtyEntriesForRow(row: ParsedBomRow): { modelName: string; qty: number }[] {
  const fromRaw = parseQtyByModel(row.qtyByModelRaw ?? '')
    .map(e => ({ modelName: e.model.trim(), qty: e.qty }))
    .filter(e => e.modelName && Number.isFinite(e.qty) && e.qty > 0)
  if (fromRaw.length > 0) return fromRaw

  const fromQty = row.qtyByModel
    .map(e => ({ modelName: e.model.trim(), qty: e.qty }))
    .filter(e => e.modelName && Number.isFinite(e.qty) && e.qty > 0)
  if (fromQty.length > 0) return fromQty

  return row.applicableModels
    .map(m => m.trim())
    .filter(Boolean)
    .map(modelName => ({ modelName, qty: row.qtyByModel[0]?.qty || 1 }))
}

/** Keep only selected variants (e.g. T4T) and drop rows with no remaining qty. */
export function restrictRowToModels(row: ParsedBomRow, models: string[]): ParsedBomRow | null {
  const allow = new Set(models.map(m => m.trim().toUpperCase()).filter(Boolean))
  if (allow.size === 0) return row
  const entries = qtyEntriesForRow(row).filter(e => allow.has(e.modelName.toUpperCase()))
  if (entries.length === 0) return null
  const names = entries.map(e => e.modelName)
  return {
    ...row,
    applicableModels: names,
    qtyByModelRaw: formatQtyByModelRaw(entries),
    qtyByModel: entries.map(e => ({ model: e.modelName, qty: e.qty })),
    bomClassification: names.length === 1 ? names[0] : row.bomClassification
  }
}

export function filterImportRows(
  rows: ParsedBomRow[],
  opts: { excludePbs?: boolean; includedStationKeys?: Set<string>; includedModels?: string[] }
): ImportRowFilterResult {
  let excludedPbs = 0
  let excludedByStation = 0
  let excludedNoVariant = 0
  const includeStations = opts.includedStationKeys
  const includedModels = opts.includedModels?.filter(Boolean) ?? []

  const filtered: ParsedBomRow[] = []
  for (const row of rows) {
    if (opts.excludePbs && isPbsStationCode(row.stationCode)) {
      excludedPbs++
      continue
    }
    if (includeStations !== undefined) {
      if (includeStations.size === 0) {
        excludedByStation++
        continue
      }
      const key = stationKeyForImportRow(row)
      if (!includeStations.has(key)) {
        excludedByStation++
        continue
      }
    }
    if (includedModels.length > 0) {
      const restricted = restrictRowToModels(row, includedModels)
      if (!restricted) {
        excludedNoVariant++
        continue
      }
      filtered.push(restricted)
      continue
    }
    filtered.push(row)
  }

  return { rows: filtered, excludedPbs, excludedByStation, excludedNoVariant }
}

export function groupImportRowsByStation(rows: ParsedBomRow[]): { station: string; count: number }[] {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = stationKeyForImportRow(row)
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([station, count]) => ({ station, count }))
    .sort((a, b) => a.station.localeCompare(b.station, undefined, { numeric: true, sensitivity: 'base' }))
}

export function allStationKeysFromRows(rows: ParsedBomRow[]): string[] {
  return groupImportRowsByStation(rows).map(g => g.station)
}
