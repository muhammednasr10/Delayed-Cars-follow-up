/** Columns in BOM_App_Import sheet (order matches Excel export). */
export const BOM_EXCEL_COLUMNS = [
  'model_family',
  'applicable_models',
  'station_code',
  'station_category',
  'part_number',
  'part_number_new',
  'alternative_part_no',
  'part_name_ar',
  'part_name_en',
  'part_kind',
  'bom_classification',
  'qty_by_model',
  'source_sheet',
  'source_row',
  'import_action'
] as const

export type BomExcelColumn = (typeof BOM_EXCEL_COLUMNS)[number]

export function bomRowFromRaw(raw: Record<string, string> | null | undefined, col: BomExcelColumn): string {
  if (!raw) return ''
  if (raw[col] != null && raw[col] !== '') return raw[col]
  const hit = Object.keys(raw).find(k => k.trim().toLowerCase().replace(/\s+/g, '_') === col)
  return hit ? raw[hit] : ''
}
