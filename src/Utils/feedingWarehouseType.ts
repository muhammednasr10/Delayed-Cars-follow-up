import type { BomItemDetail } from '../Types/bom'
import {
  DEFAULT_SUPPLY_SOURCE,
  effectivePartKind,
  effectiveSupplySource,
  HARDWARE_PART_KIND,
  PLASTICS_PART_KIND
} from './bomDefaults'

export type FeedingWarehouseType = 'CKD' | 'Local' | 'Plastics' | 'Hardware'

export const FEEDING_WAREHOUSE_TYPES: FeedingWarehouseType[] = ['CKD', 'Local', 'Plastics', 'Hardware']

/** IPL warehouse bucket: plastics/hardware from part type; CKD/Local from supply source. */
export function feedingWarehouseTypeFromBomItem(item: BomItemDetail): FeedingWarehouseType {
  const kind = effectivePartKind(item.part_type)
  if (kind === PLASTICS_PART_KIND) return 'Plastics'
  if (kind === HARDWARE_PART_KIND) return 'Hardware'
  const supply = effectiveSupplySource(item.supply_source)
  return supply === 'Local' ? 'Local' : 'CKD'
}

export function feedingWarehouseTypeLabel(type: FeedingWarehouseType, t: (k: string) => string): string {
  return t(`warehouses.feeding.warehouseType.${type}`)
}

/** Match physical warehouse row by IPL warehouse type code (best effort). */
export function resolveWarehouseIdForType(
  warehouses: { id: string; code: string }[],
  warehouseType: FeedingWarehouseType
): string {
  const codeHints: Record<FeedingWarehouseType, string[]> = {
    CKD: ['CKD'],
    Local: ['LOCAL', 'L'],
    Plastics: ['PL', 'PLASTICS', 'PLASTIC'],
    Hardware: ['HW', 'HARDWARE', 'H/W']
  }
  const hints = codeHints[warehouseType].map(h => h.toUpperCase())
  const found = warehouses.find(w => hints.includes(w.code.trim().toUpperCase()))
  return found?.id ?? warehouses[0]?.id ?? ''
}

export function defaultFeedingWarehouseType(): FeedingWarehouseType {
  return DEFAULT_SUPPLY_SOURCE as FeedingWarehouseType
}
