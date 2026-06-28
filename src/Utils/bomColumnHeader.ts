import type { BomMainRowColumn, BomPartsDisplayColumn } from './bomPartsColumns'

export const BOM_COMPACT_HEADER_COLS = new Set<BomMainRowColumn | BomPartsDisplayColumn>([
  'station_code',
  'operation',
  'vehicle_model'
])

export function bomColumnLabelKey(c: BomMainRowColumn | BomPartsDisplayColumn, compact: boolean): string {
  if (c === 'vehicle_model') return compact ? 'bom.colShort.vehicle_model' : 'bom.col.vehicle_model'
  return compact ? `bom.colShort.${c}` : `bom.col.${c}`
}
