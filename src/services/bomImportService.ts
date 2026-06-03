import { supabase } from '../lib/supabase'
import type { BomImportSummary, ParsedBomRow } from '../Types/bom'
import {
  bomImportLineKey,
  classificationToCategoryCode,
  normalizePartNumber,
  normalizeStationCode,
  resolveVehicleModelId
} from '../Utils/partNumberNormalize'
import { upsertPart } from './partsService'
import { refreshPartNumberComparisons } from './partComparisonService'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

async function loadStationMap(): Promise<Map<string, string>> {
  const { data } = await client().from('stations').select('id, station_number').eq('is_active', true)
  const m = new Map<string, string>()
  ;(data ?? []).forEach(r => {
    const n = normalizeStationCode(String(r.station_number))
    m.set(n, r.id as string)
    m.set(String(r.station_number).toUpperCase(), r.id as string)
  })
  return m
}

async function loadModelMap(): Promise<Map<string, string>> {
  const { data } = await client().from('vehicle_models').select('id, name').eq('is_active', true)
  const m = new Map<string, string>()
  ;(data ?? []).forEach(r => m.set(String(r.name).trim().toUpperCase(), r.id as string))
  return m
}

async function loadCategoryMap(): Promise<Map<string, string>> {
  const { data } = await client().from('part_categories').select('id, category_code')
  const m = new Map<string, string>()
  ;(data ?? []).forEach(r => m.set(String(r.category_code).toUpperCase(), r.id as string))
  return m
}

export async function runBomImport(
  rows: ParsedBomRow[],
  options: { fileName: string; sheetName: string; sourceFile?: string }
): Promise<BomImportSummary> {
  const summary: BomImportSummary = {
    batchId: '',
    createdParts: 0,
    updatedParts: 0,
    createdBomItems: 0,
    updatedBomItems: 0,
    duplicatePartNumbers: 0,
    errorsCount: 0,
    errors: []
  }

  const { data: batch, error: batchErr } = await client()
    .from('bom_import_batches')
    .insert({
      file_name: options.fileName,
      sheet_name: options.sheetName,
      total_rows: rows.length,
      status: 'running'
    })
    .select('id')
    .single()

  if (batchErr) throw new Error(batchErr.message)
  summary.batchId = batch.id as string

  const stationMap = await loadStationMap()
  const modelMap = await loadModelMap()
  const categoryMap = await loadCategoryMap()
  const uncategorizedId = categoryMap.get('UNCATEGORIZED') ?? null

  const seenNormalized = new Set<string>()

  for (const row of rows) {
    try {
      const catCode = classificationToCategoryCode(row.bomClassification)
      const categoryId = categoryMap.get(catCode) ?? uncategorizedId

      const { id: partId, created } = await upsertPart({
        part_number: row.partNumber,
        part_name_ar: row.partNameAr,
        part_name_en: row.partNameEn,
        category_id: categoryId,
        part_type: row.partKind,
        part_number_new: row.partNumberNew,
        alternative_part_no: row.alternativePartNo
      })

      if (created) summary.createdParts++
      else summary.updatedParts++

      const norm = normalizePartNumber(row.partNumber)
      if (seenNormalized.has(norm)) summary.duplicatePartNumbers++
      seenNormalized.add(norm)

      const modelName = row.qtyByModel[0]?.model ?? row.applicableModels[0] ?? ''
      const qty = row.qtyByModel[0]?.qty ?? 1
      const stCode = normalizeStationCode(row.stationCode)
      const stationId = row.stationCode ? stationMap.get(stCode) ?? stationMap.get(row.stationCode.toUpperCase()) ?? null : null
      const vehicleModelId = resolveVehicleModelId(modelName, modelMap)
      const needsReview = !stationId || (!vehicleModelId && Boolean(modelName))

      const lineKey = bomImportLineKey({
        normalizedPart: norm,
        stationCode: row.stationCode || '_',
        modelName: modelName || '_'
      })

      const bomPayload = {
        part_id: partId,
        part_number: row.partNumber,
        part_name: row.partNameAr || row.partNameEn || null,
        quantity: qty,
        vehicle_model_id: vehicleModelId,
        station_id: stationId,
        model_family: row.modelFamily || null,
        applicable_models_text: row.applicableModels.join(', ') || null,
        station_code_text: row.stationCode || null,
        station_category: row.stationCategory || null,
        bom_classification: row.bomClassification || null,
        qty_by_model_raw: row.qtyByModelRaw || row.qtyByModel.map(q => `${q.model}=${q.qty}`).join('; ') || null,
        source_file: options.sourceFile ?? options.fileName,
        source_sheet: row.sourceSheet || options.sheetName,
        source_row_number: row.sourceRow,
        import_line_key: lineKey,
        needs_review: needsReview,
        raw_data: row.raw,
        is_active: true
      }

      const { data: existing } = await client()
        .from('bom_items')
        .select('id')
        .eq('import_line_key', lineKey)
        .maybeSingle()

      if (existing?.id) {
        const { error } = await client().from('bom_items').update(bomPayload).eq('id', existing.id)
        if (error) throw new Error(error.message)
        summary.updatedBomItems++
      } else {
        const { error } = await client().from('bom_items').insert(bomPayload)
        if (error) throw new Error(error.message)
        summary.createdBomItems++
      }
    } catch (e) {
      summary.errorsCount++
      const msg = e instanceof Error ? e.message : String(e)
      summary.errors.push(`Row ${row.rowNumber}: ${msg}`)
      await client().from('bom_import_errors').insert({
        batch_id: summary.batchId,
        row_number: row.rowNumber,
        error_message: msg,
        raw_data: row.raw
      })
    }
  }

  try {
    await refreshPartNumberComparisons()
  } catch (e) {
    summary.errors.push(e instanceof Error ? e.message : 'Comparison refresh failed')
  }

  await client()
    .from('bom_import_batches')
    .update({
      status: summary.errorsCount > 0 ? 'completed_with_errors' : 'completed',
      created_parts: summary.createdParts,
      updated_parts: summary.updatedParts,
      created_bom_items: summary.createdBomItems,
      updated_bom_items: summary.updatedBomItems,
      duplicate_part_numbers: summary.duplicatePartNumbers,
      errors_count: summary.errorsCount
    })
    .eq('id', summary.batchId)

  return summary
}
