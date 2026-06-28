/** Main BOM list row: station, names, classification, stop. */
export const BOM_MAIN_ROW_COLUMNS = [
  'station_code',
  'part_name_ar',
  'part_name_en',
  'vehicle_model',
  'operation'
] as const

export type BomMainRowColumn = (typeof BOM_MAIN_ROW_COLUMNS)[number]

/** Expanded model-detail sub-table columns. */
export const BOM_DETAIL_COLUMNS = [
  'vehicle_model',
  'part_number',
  'qty_by_model',
  'part_kind',
  'supply_source'
] as const

export type BomDetailColumn = (typeof BOM_DETAIL_COLUMNS)[number]

/** Full columns for import preview & excel filters. */
export const BOM_PARTS_DISPLAY_COLUMNS = [
  'station_code',
  'part_name_ar',
  'part_name_en',
  'part_number',
  'vehicle_model',
  'qty_by_model',
  'part_kind',
  'supply_source',
  'operation'
] as const

export type BomPartsDisplayColumn = (typeof BOM_PARTS_DISPLAY_COLUMNS)[number]

/** Fixed column widths so the main parts table fits one screen without horizontal scroll. */
export const BOM_TABLE_COL_WIDTH: Record<BomMainRowColumn, string> = {
  station_code: '8%',
  part_name_ar: '22%',
  part_name_en: '22%',
  vehicle_model: '14%',
  operation: '10%'
}

export const T4_VARIANT_MODELS = ['T4', 'T4T', 'T4L', 'T4C'] as const

/** IPL-T4 sheet: qty column → vehicle model name in ERP. */
export const T4_IPL_QTY_MAP = [
  { col: 'T', model: 'T4T' },
  { col: 'L', model: 'T4L' },
  { col: 'C', model: 'T4C' }
] as const
