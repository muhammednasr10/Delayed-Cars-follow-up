/** Display / filter columns for قائمة الأجزاء (user-requested order). */
export const BOM_PARTS_DISPLAY_COLUMNS = [
  'part_name_ar',
  'part_name_en',
  'part_number',
  'vehicle_model',
  'qty_by_model',
  'station_code',
  'bom_classification',
  'part_kind',
  'supply_source',
  'operation'
] as const

export type BomPartsDisplayColumn = (typeof BOM_PARTS_DISPLAY_COLUMNS)[number]

/** Fixed column widths so the parts table fits one screen without horizontal scroll. */
export const BOM_TABLE_COL_WIDTH: Record<BomPartsDisplayColumn, string> = {
  part_name_ar: '12%',
  part_name_en: '12%',
  part_number: '9%',
  vehicle_model: '8%',
  qty_by_model: '4%',
  station_code: '4%',
  bom_classification: '10%',
  part_kind: '6%',
  supply_source: '6%',
  operation: '4%'
}

export const T4_VARIANT_MODELS = ['T4', 'T4T', 'T4L', 'T4C'] as const

/** IPL-T4 sheet: qty column → vehicle model name in ERP. */
export const T4_IPL_QTY_MAP = [
  { col: 'T', model: 'T4T' },
  { col: 'L', model: 'T4L' },
  { col: 'C', model: 'T4C' }
] as const
