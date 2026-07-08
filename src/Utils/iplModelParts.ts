import type { BomItemDetail, Part } from '../Types/bom'
import { parseApplicableModelNames } from './bomQtyByModel'

export function isPendingBomItemId(id: string): boolean {
  return id.startsWith('pending:')
}

export function pendingBomItemId(partId: string): string {
  return `pending:${partId}`
}

/** Merge parts-list master row with optional BOM line for one IPL model view. */
export function mergePartToBomItem(part: Part, bom: BomItemDetail | undefined, modelName: string): BomItemDetail {
  const station = bom?.station_code_text?.trim() || part.common_station?.trim() || null

  if (bom && !isPendingBomItemId(bom.id)) {
    return {
      ...bom,
      station_code_text: station,
      part_name_ar: part.part_name_ar ?? bom.part_name_ar,
      part_name_en: part.part_name_en ?? bom.part_name_en,
      part_name: part.part_name_ar ?? part.part_name_en ?? bom.part_name,
      vehicle_model_name: modelName
    }
  }

  return {
    id: pendingBomItemId(part.id),
    part_id: part.id,
    vehicle_model_id: null,
    station_id: null,
    part_number: part.part_number,
    part_name: part.part_name_ar ?? part.part_name_en,
    quantity: 1,
    side: null,
    position: null,
    model_family: null,
    applicable_models_text: modelName,
    station_code_text: station,
    station_category: null,
    supply_source: null,
    bom_classification: null,
    qty_by_model_raw: `${modelName}=1`,
    source_file: null,
    source_sheet: null,
    source_row_number: null,
    import_line_key: null,
    needs_review: !station,
    notes: null,
    raw_data: null,
    part_length: null,
    part_width: null,
    part_height: null,
    part_volume: null,
    feeding_method: null,
    packing: null,
    part_direction: null,
    rack_code: null,
    rack_size: null,
    rack_length: null,
    rack_width: null,
    rack_height: null,
    carton_qty: null,
    part_weight: null,
    carton_weight: null,
    is_active: true,
    normalized_part_number: part.normalized_part_number,
    part_name_ar: part.part_name_ar,
    part_name_en: part.part_name_en,
    part_type: part.part_type,
    part_number_new: null,
    alternative_part_no: null,
    category_code: null,
    category_name_ar: null,
    category_name_en: null,
    vehicle_model_name: modelName,
    station_number: null,
    station_name: null,
    stopper_type: 'non_stopper'
  }
}

export function partMatchesIplModel(part: Part, modelName: string): boolean {
  const target = modelName.trim().toUpperCase()
  if (!target) return false
  const stored = parseApplicableModelNames(part.applicable_models_text)
  // فارغ = كل الموديلات (الافتراضي في قائمة الأجزاء)
  if (stored.length === 0) return true
  return stored.some(n => n.trim().toUpperCase() === target)
}
