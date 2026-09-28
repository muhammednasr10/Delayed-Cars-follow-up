import type { BomItemDetail } from '../Types/bom'
import { countIplFitForPartAcrossModels, indexBomByPartId, type IplFitCounts } from './iplFitStatus'
import { partCompareNameKey, type IplCompareRow } from './iplModelCompare'

export function partIdsByCompareKey(byModel: Map<string, BomItemDetail[]>): Map<string, Set<string>> {
  const partIdsByKey = new Map<string, Set<string>>()
  for (const items of byModel.values()) {
    for (const item of items) {
      if (!item.part_id) continue
      const key = partCompareNameKey(item)
      let set = partIdsByKey.get(key)
      if (!set) {
        set = new Set()
        partIdsByKey.set(key, set)
      }
      set.add(item.part_id)
    }
  }
  return partIdsByKey
}

/** Fit badges for every compare row, scanning the BOM list once. */
export function fitCountsForCompareRows(
  rows: IplCompareRow[],
  partIdsByKey: Map<string, Set<string>>,
  modelNames: string[],
  allBom: BomItemDetail[]
): Map<string, IplFitCounts> {
  const index = indexBomByPartId(allBom)
  const fitCounts = new Map<string, IplFitCounts>()
  for (const row of rows) {
    const fromBucket = partIdsByKey.get(row.key)
    const partIds = fromBucket?.size
      ? fromBucket
      : new Set([...row.byModel.values()].map(item => item.part_id).filter(Boolean))
    fitCounts.set(row.key, countIplFitForPartAcrossModels(partIds, modelNames, allBom, index))
  }
  return fitCounts
}
