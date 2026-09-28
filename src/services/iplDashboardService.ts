import type { BomItemDetail, Part } from '../Types/bom'
import type { Station, VehicleModel } from '../Types/settings'
import { buildIplCompareRows } from '../Utils/iplModelCompare'
import { fitCountsForCompareRows, partIdsByCompareKey } from '../Utils/iplCompareAssembly'
import {
  buildIplSearchSuggestions,
  filterIplCompareRows,
  type IplDiffFilter,
  type IplFitClassFilter,
  type IplSearchSuggestion
} from '../Utils/iplCompareFilters'
import { buildIplDashboardSummaryFromCompare, type IplDashboardSummary } from '../Utils/iplDashboardSummary'
import {
  defaultIplCompareModelNames,
  selectableVehicleModels
} from '../Utils/vehicleModelHierarchy'
import { fetchIplBomAndMasters, buildIplModelMergedRows } from './bomIplService'
import { getStations, getVehicleModels } from './settingsService'

export type { IplDashboardSummary }

export type IplDashboardDataset = {
  allBom: BomItemDetail[]
  masters: Part[]
  models: VehicleModel[]
  stations: Station[]
}

export type IplDashboardFilters = {
  modelNames: string[]
  stationCode?: string
  search: string
  fitFilter: IplFitClassFilter
  diffFilter: IplDiffFilter
}

export async function loadIplDashboardDataset(): Promise<IplDashboardDataset> {
  const [source, models, stations] = await Promise.all([
    fetchIplBomAndMasters(),
    getVehicleModels(),
    getStations()
  ])
  return { allBom: source.allBom, masters: source.masters, models, stations }
}

export function prepareIplDashboardBase(dataset: IplDashboardDataset, modelNames: string[], stationCode?: string) {
  const byModel = new Map<string, BomItemDetail[]>()
  for (const name of modelNames) {
    byModel.set(
      name,
      buildIplModelMergedRows(name, dataset.allBom, dataset.masters, {
        stationCode
      })
    )
  }

  const rows = buildIplCompareRows(modelNames, byModel, dataset.stations)
  return {
    rows,
    fitCounts: fitCountsForCompareRows(rows, partIdsByCompareKey(byModel), modelNames, dataset.allBom)
  }
}

export function composeIplDashboard(
  dataset: IplDashboardDataset,
  filters: IplDashboardFilters
): { summary: IplDashboardSummary; suggestions: IplSearchSuggestion[] } {
  const modelNames = filters.modelNames
  const { rows, fitCounts } = prepareIplDashboardBase(dataset, modelNames, filters.stationCode)
  const filtered = filterIplCompareRows(rows, {
    openTabs: modelNames,
    search: filters.search,
    fitFilter: filters.fitFilter,
    diffFilter: filters.diffFilter,
    fitCountsByKey: fitCounts,
    modelTotal: modelNames.length
  })

  return {
    summary: buildIplDashboardSummaryFromCompare(filtered, fitCounts, modelNames, dataset.stations),
    suggestions: buildIplSearchSuggestions(rows, modelNames, filters.search)
  }
}

export async function getIplDashboardSummary(): Promise<IplDashboardSummary> {
  const dataset = await loadIplDashboardDataset()
  const assignable = selectableVehicleModels(dataset.models)
  const modelNames = defaultIplCompareModelNames(dataset.models, assignable)
  return composeIplDashboard(dataset, {
    modelNames,
    search: '',
    fitFilter: '',
    diffFilter: ''
  }).summary
}
