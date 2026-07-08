import type { BomIplModelColumn, BomMainRowColumn, BomPartsDisplayColumn } from './bomPartsColumns'

export const BOM_COMPACT_HEADER_COLS = new Set<BomMainRowColumn | BomPartsDisplayColumn | BomIplModelColumn>([
  'station_code',
  'operation',
  'vehicle_model',
  'part_number',
  'qty_by_model'
])

export function bomColumnLabelKey(
  c: BomMainRowColumn | BomPartsDisplayColumn | BomIplModelColumn,
  compact: boolean
): string {
  if (c === 'vehicle_model') return compact ? 'bom.colShort.vehicle_model' : 'bom.col.vehicle_model'
  if (c === 'qty_by_model') return compact ? 'bom.colShort.qty_by_model' : 'bom.col.qty_by_model'
  return compact ? `bom.colShort.${c}` : `bom.col.${c}`
}
