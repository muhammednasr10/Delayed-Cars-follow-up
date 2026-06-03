import type { BomItemDetail } from '../Types/bom'
import type { BomPartsDisplayColumn } from './bomPartsColumns'

export function bomPartsCellValue(row: BomItemDetail, col: BomPartsDisplayColumn): string {
  switch (col) {
    case 'part_number':
      return row.part_number
    case 'part_name_ar':
      return row.part_name_ar ?? row.part_name ?? ''
    case 'part_name_en':
      return row.part_name_en ?? ''
    case 'bom_classification':
      return row.bom_classification ?? ''
    case 'station_code':
      return row.station_code_text || row.station_number || ''
    case 'qty_by_model':
      return row.qty_by_model_raw ?? String(row.quantity)
    case 'part_kind':
      return row.part_type ?? ''
    case 'part_class':
      return row.station_category ?? ''
    default:
      return ''
  }
}
