import type { IplFitCounts } from './iplFitStatus'
import {
  comparePartNumbers,
  compareQuantities,
  compareStations,
  type IplCompareRow
} from './iplModelCompare'

export type IplFitClassFilter = '' | 'all_fitted' | 'all_not_fitted' | 'all_unset' | 'mixed' | 'has_unset' | 'has_not_fitted'

export type IplDiffFilter = '' | 'any' | 'part_number' | 'station' | 'qty'

export type IplPartFitClass = 'all_fitted' | 'all_not_fitted' | 'all_unset' | 'mixed'

export type IplCompareFitSummary = {
  allFitted: number
  allNotFitted: number
  allUnset: number
  mixed: number
  total: number
  modelSlotsFitted: number
  modelSlotsNotFitted: number
  modelSlotsUnset: number
}

const EMPTY: IplFitCounts = { fitted: 0, notFitted: 0, unset: 0 }

export function classifyIplPartFit(counts: IplFitCounts, modelTotal: number): IplPartFitClass {
  if (modelTotal <= 0) return 'all_unset'
  if (counts.fitted === modelTotal) return 'all_fitted'
  if (counts.notFitted === modelTotal) return 'all_not_fitted'
  if (counts.unset === modelTotal) return 'all_unset'
  return 'mixed'
}

export function summarizeIplCompareFit(
  rows: IplCompareRow[],
  fitCountsByKey: Map<string, IplFitCounts>,
  modelTotal: number
): IplCompareFitSummary {
  let allFitted = 0
  let allNotFitted = 0
  let allUnset = 0
  let mixed = 0
  let modelSlotsFitted = 0
  let modelSlotsNotFitted = 0
  let modelSlotsUnset = 0

  for (const row of rows) {
    const counts = fitCountsByKey.get(row.key) ?? EMPTY
    modelSlotsFitted += counts.fitted
    modelSlotsNotFitted += counts.notFitted
    modelSlotsUnset += counts.unset
    switch (classifyIplPartFit(counts, modelTotal)) {
      case 'all_fitted':
        allFitted += 1
        break
      case 'all_not_fitted':
        allNotFitted += 1
        break
      case 'all_unset':
        allUnset += 1
        break
      default:
        mixed += 1
    }
  }

  return {
    allFitted,
    allNotFitted,
    allUnset,
    mixed,
    total: rows.length,
    modelSlotsFitted,
    modelSlotsNotFitted,
    modelSlotsUnset
  }
}

function rowMatchesSearch(row: IplCompareRow, openTabs: string[], q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  if (row.partNameAr.toLowerCase().includes(needle)) return true
  if (row.partNameEn.toLowerCase().includes(needle)) return true
  for (const model of openTabs) {
    const item = row.byModel.get(model)
    if (!item) continue
    const pn = (item.part_number ?? '').toLowerCase()
    if (pn && pn.includes(needle)) return true
    const station = (item.station_code_text ?? item.station_number ?? '').toLowerCase()
    if (station.includes(needle)) return true
  }
  return false
}

function rowMatchesFitFilter(
  counts: IplFitCounts,
  modelTotal: number,
  filter: IplFitClassFilter
): boolean {
  if (!filter) return true
  const cls = classifyIplPartFit(counts, modelTotal)
  if (filter === 'has_unset') return counts.unset > 0
  if (filter === 'has_not_fitted') return counts.notFitted > 0
  return cls === filter
}

function rowMatchesDiffFilter(row: IplCompareRow, openTabs: string[], filter: IplDiffFilter): boolean {
  if (!filter) return true
  const pn = comparePartNumbers(row, openTabs).status === 'different'
  const st = compareStations(row, openTabs).status === 'different'
  const qty = compareQuantities(row, openTabs).status === 'different'
  if (filter === 'any') return pn || st || qty
  if (filter === 'part_number') return pn
  if (filter === 'station') return st
  if (filter === 'qty') return qty
  return true
}

export function filterIplCompareRows(
  rows: IplCompareRow[],
  opts: {
    openTabs: string[]
    search: string
    fitFilter: IplFitClassFilter
    diffFilter: IplDiffFilter
    fitCountsByKey: Map<string, IplFitCounts>
    modelTotal: number
  }
): IplCompareRow[] {
  return rows.filter(row => {
    if (!rowMatchesSearch(row, opts.openTabs, opts.search)) return false
    const counts = opts.fitCountsByKey.get(row.key) ?? EMPTY
    if (!rowMatchesFitFilter(counts, opts.modelTotal, opts.fitFilter)) return false
    if (!rowMatchesDiffFilter(row, opts.openTabs, opts.diffFilter)) return false
    return true
  })
}

export type IplSearchSuggestion = {
  id: string
  label: string
  secondary?: string
  query: string
}

/** Build typeahead suggestions from loaded compare rows (local, instant). */
export function buildIplSearchSuggestions(
  rows: IplCompareRow[],
  openTabs: string[],
  query: string,
  limit = 12
): IplSearchSuggestion[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []

  const out: IplSearchSuggestion[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const candidates: { label: string; secondary?: string; query: string }[] = [
      { label: row.partNameAr, secondary: row.partNameEn !== '—' ? row.partNameEn : undefined, query: row.partNameAr }
    ]
    if (row.partNameEn && row.partNameEn !== '—') {
      candidates.push({ label: row.partNameEn, secondary: row.partNameAr, query: row.partNameEn })
    }
    for (const model of openTabs) {
      const pn = (row.byModel.get(model)?.part_number ?? '').trim()
      if (pn && pn.toUpperCase() !== 'NA') {
        candidates.push({
          label: pn,
          secondary: row.partNameAr,
          query: pn
        })
      }
    }

    for (const c of candidates) {
      if (!c.label || c.label === '—') continue
      if (!c.label.toLowerCase().includes(needle) && !(c.secondary ?? '').toLowerCase().includes(needle)) continue
      const id = `${row.key}:${c.query}`
      if (seen.has(id) || seen.has(c.query.toLowerCase())) continue
      seen.add(id)
      seen.add(c.query.toLowerCase())
      out.push({ id, label: c.label, secondary: c.secondary, query: c.query })
      if (out.length >= limit) return out
    }
  }

  return out
}
