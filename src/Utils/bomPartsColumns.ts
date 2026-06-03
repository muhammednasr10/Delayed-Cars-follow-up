/** Display / filter columns for قائمة الأجزاء (user-requested order). */
export const BOM_PARTS_DISPLAY_COLUMNS = [
  'part_number',
  'part_name_ar',
  'part_name_en',
  'bom_classification',
  'station_code',
  'qty_by_model',
  'part_kind',
  'part_class'
] as const

export type BomPartsDisplayColumn = (typeof BOM_PARTS_DISPLAY_COLUMNS)[number]

export const T4_VARIANT_MODELS = ['T4', 'T4T', 'T4L', 'T4C'] as const

/** IPL-T4 sheet: qty column → vehicle model name in ERP. */
export const T4_IPL_QTY_MAP = [
  { col: 'T', model: 'T4T' },
  { col: 'L', model: 'T4L' },
  { col: 'C', model: 'T4C' }
] as const
