/** Display / filter columns for قائمة الأجزاء (user-requested order). */
export const BOM_PARTS_DISPLAY_COLUMNS = [
  'station_code',
  'part_name_ar',
  'part_name_en',
  'part_number',
  'vehicle_model',
  'qty_by_model',
  'bom_classification',
  'part_kind',
  'supply_source',
  'operation'
] as const

export type BomPartsDisplayColumn = (typeof BOM_PARTS_DISPLAY_COLUMNS)[number]

/** Fixed column widths so the parts table fits one screen without horizontal scroll. */
export const BOM_TABLE_COL_WIDTH: Record<BomPartsDisplayColumn, string> = {
  station_code: '6%',
  part_name_ar: '11%',
  part_name_en: '11%',
  part_number: '8%',
  vehicle_model: '7%',
  qty_by_model: '5%',
  bom_classification: '8%',
  part_kind: '7%',
  supply_source: '7%',
  operation: '6%'
}

export const T4_VARIANT_MODELS = ['T4', 'T4T', 'T4L', 'T4C'] as const

/** IPL-T4 sheet: qty column → vehicle model name in ERP. */
export const T4_IPL_QTY_MAP = [
  { col: 'T', model: 'T4T' },
  { col: 'L', model: 'T4L' },
  { col: 'C', model: 'T4C' }
] as const
