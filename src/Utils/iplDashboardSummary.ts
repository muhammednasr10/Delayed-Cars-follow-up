import type { BomItemDetail } from '../Types/bom'
import type { Station } from '../Types/settings'
import { buildStationOrderMap, displayBomStationCode, resolveBomStationSortRank } from './bomStationCode'
import { summarizeIplCompareFit, type IplCompareFitSummary } from './iplCompareFilters'
import {
  comparePartNumbers,
  compareQuantities,
  compareStations,
  type IplCompareRow
} from './iplModelCompare'
import { iplFitStatusForModel, type IplFitCounts } from './iplFitStatus'

export type IplModelFitRow = {
  model: string
  fitted: number
  notFitted: number
  unset: number
  totalParts: number
}

export type IplStationFitRow = {
  station: string
  parts: number
  fittedSlots: number
  notFittedSlots: number
  unsetSlots: number
}

export type IplDiffSummary = {
  differentPn: number
  differentStation: number
  differentQty: number
  anyDiff: number
}

export type IplPartFitHighlight = {
  key: string
  nameAr: string
  nameEn: string
  fitted: number
  notFitted: number
  unset: number
}

export type IplDashboardSummary = {
  modelNames: string[]
  totalParts: number
  fitSummary: IplCompareFitSummary
  differences: IplDiffSummary
  byModel: IplModelFitRow[]
  byStation: IplStationFitRow[]
  mostUnset: IplPartFitHighlight[]
  mostNotFitted: IplPartFitHighlight[]
}

const EMPTY: IplFitCounts = { fitted: 0, notFitted: 0, unset: 0 }

function primaryStation(row: IplCompareRow, models: string[]): string {
  for (const model of models) {
    const item = row.byModel.get(model)
    const code = displayBomStationCode(item?.station_code_text || item?.station_number || '')
    if (code) return code
  }
  return '—'
}

/** Build IPL summary tables from compare rows already built like the IPL page. */
function stationSortRank(code: string, orderMap: Map<string, number>): number {
  return resolveBomStationSortRank(
    {
      station_sort_order: null,
      station_code_text: code === '—' ? '' : code,
      station_number: null
    },
    orderMap
  )
}

export function buildIplDashboardSummaryFromCompare(
  rows: IplCompareRow[],
  fitCountsByKey: Map<string, IplFitCounts>,
  modelNames: string[],
  stations: Station[] = []
): IplDashboardSummary {
  const fitSummary = summarizeIplCompareFit(rows, fitCountsByKey, modelNames.length)

  let differentPn = 0
  let differentStation = 0
  let differentQty = 0
  let anyDiff = 0
  for (const row of rows) {
    const pn = comparePartNumbers(row, modelNames).status === 'different'
    const st = compareStations(row, modelNames).status === 'different'
    const qty = compareQuantities(row, modelNames).status === 'different'
    if (pn) differentPn += 1
    if (st) differentStation += 1
    if (qty) differentQty += 1
    if (pn || st || qty) anyDiff += 1
  }

  const byModel: IplModelFitRow[] = modelNames.map(model => {
    let fitted = 0
    let notFitted = 0
    let unset = 0
    for (const row of rows) {
      const status = iplFitStatusForModel(row.byModel.get(model), model)
      if (status === 'fitted') fitted += 1
      else if (status === 'not_fitted') notFitted += 1
      else unset += 1
    }
    return { model, fitted, notFitted, unset, totalParts: rows.length }
  })

  const stationMap = new Map<string, IplStationFitRow>()
  for (const row of rows) {
    const station = primaryStation(row, modelNames)
    let entry = stationMap.get(station)
    if (!entry) {
      entry = { station, parts: 0, fittedSlots: 0, notFittedSlots: 0, unsetSlots: 0 }
      stationMap.set(station, entry)
    }
    entry.parts += 1
    const counts = fitCountsByKey.get(row.key) ?? EMPTY
    entry.fittedSlots += counts.fitted
    entry.notFittedSlots += counts.notFitted
    entry.unsetSlots += counts.unset
  }
  const stationOrder = buildStationOrderMap(stations)
  const byStation = [...stationMap.values()].sort((a, b) => {
    const rank = stationSortRank(a.station, stationOrder) - stationSortRank(b.station, stationOrder)
    if (rank !== 0) return rank
    return a.station.localeCompare(b.station, undefined, { numeric: true })
  })

  const highlights: IplPartFitHighlight[] = rows.map(row => {
    const counts = fitCountsByKey.get(row.key) ?? EMPTY
    return {
      key: row.key,
      nameAr: row.partNameAr,
      nameEn: row.partNameEn,
      fitted: counts.fitted,
      notFitted: counts.notFitted,
      unset: counts.unset
    }
  })

  const mostUnset = [...highlights]
    .filter(h => h.unset > 0)
    .sort((a, b) => b.unset - a.unset || a.nameAr.localeCompare(b.nameAr, 'ar'))
    .slice(0, 15)

  const mostNotFitted = [...highlights]
    .filter(h => h.notFitted > 0)
    .sort((a, b) => b.notFitted - a.notFitted || a.nameAr.localeCompare(b.nameAr, 'ar'))
    .slice(0, 15)

  return {
    modelNames,
    totalParts: rows.length,
    fitSummary,
    differences: { differentPn, differentStation, differentQty, anyDiff },
    byModel,
    byStation,
    mostUnset,
    mostNotFitted
  }
}
