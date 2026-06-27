import type { BomPartsDisplayColumn } from './bomPartsColumns'

export const BOM_COMPACT_HEADER_COLS = new Set<BomPartsDisplayColumn>([
  'qty_by_model',
  'station_code',
  'operation',
  'part_kind',
  'supply_source',
  'vehicle_model',
  'bom_classification',
  'part_number'
])

export function bomColumnLabelKey(c: BomPartsDisplayColumn, compact: boolean): string {
  if (c === 'vehicle_model') return compact ? 'bom.modelShort' : 'bom.model'
  return compact ? `bom.colShort.${c}` : `bom.col.${c}`
}
