export type PartCategory = {
  id: string
  category_code: string
  category_name_ar: string
  category_name_en: string | null
  parent_id: string | null
  description: string | null
  is_active: boolean
  part_count?: number
}

export type Part = {
  id: string
  part_number: string
  normalized_part_number: string
  part_name_ar: string | null
  part_name_en: string | null
  category_id: string | null
  part_type: string | null
  unit: string | null
  notes: string | null
  is_active: boolean
}

export type BomItemDetail = {
  id: string
  part_id: string
  vehicle_model_id: string | null
  station_id: string | null
  part_number: string
  part_name: string | null
  quantity: number
  side: string | null
  position: string | null
  model_family: string | null
  applicable_models_text: string | null
  station_code_text: string | null
  station_category: string | null
  supply_source: string | null
  bom_classification: string | null
  qty_by_model_raw: string | null
  source_file: string | null
  source_sheet: string | null
  source_row_number: number | null
  import_line_key: string | null
  needs_review: boolean
  is_critical?: boolean
  stopper_type?: string | null
  operation_id?: string | null
  operation_code?: string | null
  operation_name?: string | null
  operation_is_line_stopper?: boolean | null
  operation_is_car_stopper?: boolean | null
  operation_zoning_constraints?: string | null
  station_sort_order?: number | null
  notes: string | null
  raw_data: Record<string, string> | null
  is_active: boolean
  normalized_part_number: string
  part_name_ar: string | null
  part_name_en: string | null
  part_type: string | null
  part_number_new: string | null
  alternative_part_no: string | null
  category_code: string | null
  category_name_ar: string | null
  category_name_en: string | null
  vehicle_model_name: string | null
  station_number: string | null
  station_name: string | null
}

export type BomItemCreateInput = {
  part_number: string
  part_name_ar?: string
  part_name_en?: string
  part_number_new?: string
  alternative_part_no?: string
  part_kind?: string
  quantity: number
  vehicle_model_id?: string | null
  station_id?: string | null
  station_code_text?: string
  model_family?: string
  applicable_models_text?: string
  station_category?: string
  supply_source?: string | null
  bom_classification?: string
  qty_by_model_raw?: string
  notes?: string
  stopper_type?: 'line_stopper' | 'car_stopper' | 'non_stopper'
}

export type BomItemUpdateInput = {
  part_number?: string
  part_name_ar?: string
  part_name_en?: string
  part_number_new?: string
  alternative_part_no?: string
  part_kind?: string
  quantity?: number
  vehicle_model_id?: string | null
  station_id?: string | null
  station_code_text?: string | null
  model_family?: string | null
  applicable_models_text?: string | null
  station_category?: string | null
  supply_source?: string | null
  bom_classification?: string | null
  qty_by_model_raw?: string | null
  notes?: string | null
  needs_review?: boolean
  is_active?: boolean
  stopper_type?: 'line_stopper' | 'car_stopper' | 'non_stopper' | null
}

export type PartNumberComparison = {
  id: string
  part_number: string
  normalized_part_number: string
  occurrence_count: number
  station_count: number
  model_count: number
  first_station: string | null
  stations: string | null
  model_families: string | null
  models: string | null
  comparison_status: string | null
  notes: string | null
}

export type BomImportBatch = {
  id: string
  file_name: string
  sheet_name: string | null
  imported_at: string
  total_rows: number
  created_parts: number
  updated_parts: number
  created_bom_items: number
  updated_bom_items: number
  duplicate_part_numbers: number
  errors_count: number
  status: string
}

export type ParsedBomRow = {
  rowNumber: number
  modelFamily: string
  applicableModels: string[]
  stationCode: string
  stationCategory: string
  supplySource: string
  partNumber: string
  partNumberNew: string
  alternativePartNo: string
  partNameAr: string
  partNameEn: string
  partKind: string
  bomClassification: string
  qtyByModelRaw: string
  qtyByModel: { model: string; qty: number }[]
  sourceSheet: string
  sourceRow: number
  importAction: string
  raw: Record<string, string>
}

export type BomImportValidation = {
  rows: ParsedBomRow[]
  errors: { row: number; message: string }[]
  warnings: { row: number; message: string }[]
  stats: {
    total: number
    missingPartNumber: number
    duplicateKeys: number
    needsReview: number
    sourceRows?: number
    skippedNoQty?: number
  }
}

export type BomImportSummary = {
  batchId: string
  createdParts: number
  updatedParts: number
  createdBomItems: number
  updatedBomItems: number
  duplicatePartNumbers: number
  errorsCount: number
  errors: string[]
}

export type BomDashboardStats = {
  totalBomRows: number
  uniquePartNumbers: number
  duplicatePartNumbers: number
  uncategorizedParts: number
  totalStations: number
  totalModels: number
  totalCategories: number
  lastImportAt: string | null
  byCategory: { label: string; count: number }[]
  topRepeated: { part_number: string; occurrence_count: number }[]
}
