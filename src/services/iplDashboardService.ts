import type { IplFitCounts } from '../Utils/iplFitStatus'
import { countIplFitForPartAcrossModels } from '../Utils/iplFitStatus'
import { buildIplCompareRows, partCompareNameKey } from '../Utils/iplModelCompare'
import { buildIplDashboardSummaryFromCompare, type IplDashboardSummary } from '../Utils/iplDashboardSummary'
import {
  defaultIplCompareModelNames,
  selectableVehicleModels
} from '../Utils/vehicleModelHierarchy'
import { fetchIplBomAndMasters, buildIplModelMergedRows } from './bomIplService'
import { getStations, getVehicleModels } from './settingsService'

export type { IplDashboardSummary }

export async function getIplDashboardSummary(): Promise<IplDashboardSummary> {
  const [source, models, stations] = await Promise.all([
    fetchIplBomAndMasters(),
    getVehicleModels(),
    getStations()
  ])

  const assignable = selectableVehicleModels(models)
  const modelNames = defaultIplCompareModelNames(models, assignable)

  const byModel = new Map<string, import('../Types/bom').BomItemDetail[]>()
  for (const name of modelNames) {
    byModel.set(name, buildIplModelMergedRows(name, source.allBom, source.masters, {}))
  }

  const rows = buildIplCompareRows(modelNames, byModel, stations)

  const partIdsByKey = new Map<string, Set<string>>()
  for (const items of byModel.values()) {
    for (const item of items) {
      const key = partCompareNameKey(item)
      if (!item.part_id) continue
      let set = partIdsByKey.get(key)
      if (!set) {
        set = new Set()
        partIdsByKey.set(key, set)
      }
      set.add(item.part_id)
    }
  }

  const fitCounts = new Map<string, IplFitCounts>()
  for (const row of rows) {
    const fromBucket = partIdsByKey.get(row.key)
    const partIds = fromBucket?.size
      ? [...fromBucket]
      : [...new Set([...row.byModel.values()].map(i => i.part_id).filter(Boolean))]
    fitCounts.set(row.key, countIplFitForPartAcrossModels(partIds, modelNames, source.allBom))
  }

  return buildIplDashboardSummaryFromCompare(rows, fitCounts, modelNames)
}
