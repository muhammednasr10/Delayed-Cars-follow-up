import type { BomItemDetail } from '../Types/bom'
import { formatClassificationShort, resolveSupplySource } from './bomDisplayFormat'
import { effectivePartKind, effectiveSupplySource } from './bomDefaults'
import { resolvePartNameEn } from './partNameEn'
import { effectiveBomStopperType } from './bomStopper'
import type { BomPartsDisplayColumn } from './bomPartsColumns'

export function formatQtyForDisplay(qty: number): string {
  const n = Number(qty)
  if (!Number.isFinite(n) || n <= 0) return ''
  return n % 1 === 0 ? String(n) : n.toFixed(2)
}

export function bomPartsCellValue(row: BomItemDetail, col: BomPartsDisplayColumn): string {
  switch (col) {
    case 'part_number':
      return row.part_number
    case 'part_name_ar':
      return row.part_name_ar ?? row.part_name ?? ''
    case 'part_name_en':
      return resolvePartNameEn(row)
    case 'vehicle_model':
      return row.vehicle_model_name || row.applicable_models_text || row.model_family || ''
    case 'bom_classification':
      return formatClassificationShort(row.bom_classification)
    case 'station_code':
      return row.station_code_text || row.station_number || ''
    case 'operation': {
      const st = effectiveBomStopperType(row)
      return st === 'non_stopper' ? '' : st
    }
    case 'qty_by_model':
      return formatQtyForDisplay(row.quantity)
    case 'part_kind':
      return effectivePartKind(row.part_type)
    case 'supply_source':
      return effectiveSupplySource(resolveSupplySource(row))
    default:
      return ''
  }
}
