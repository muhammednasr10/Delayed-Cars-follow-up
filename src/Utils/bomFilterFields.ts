import type { BomPartsDisplayColumn } from './bomPartsColumns'

export type BomFilterColumn = BomPartsDisplayColumn | 'vehicle_model'

export const BOM_FILTER_DB_FIELD: Record<BomFilterColumn, string> = {
  part_number: 'part_number',
  part_name_ar: 'part_name_ar',
  part_name_en: 'part_name_en',
  bom_classification: 'bom_classification',
  station_code: 'station_code_text',
  qty_by_model: 'qty_by_model_raw',
  part_kind: 'part_type',
  part_class: 'station_category',
  vehicle_model: 'vehicle_model_name'
}
