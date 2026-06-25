import type { BomPartsDisplayColumn } from './bomPartsColumns'

export type BomFilterColumn = BomPartsDisplayColumn

export const BOM_FILTER_DB_FIELD: Record<BomFilterColumn, string> = {
  part_number: 'part_number',
  part_name_ar: 'part_name_ar',
  part_name_en: 'part_name_en',
  vehicle_model: 'vehicle_model_name',
  bom_classification: 'bom_classification',
  station_code: 'station_code_text',
  operation: 'stopper_type',
  qty_by_model: 'qty_by_model_raw',
  part_kind: 'part_type',
  supply_source: 'supply_source'
}
