import { supabase } from '../lib/supabase'
import type { BomImportSummary, ParsedBomRow } from '../Types/bom'
import { sanitizePartNameEn } from '../Utils/partNameEn'
import { effectivePartKind, effectiveSupplySource } from '../Utils/bomDefaults'
import { maxModelQty, isConsolidatedImportRow } from '../Utils/bomQtyByModel'
import {
  bomImportLineKey,
  classificationToCategoryCode,
  normalizePartNumber,
  normalizeStationCode,
  parseQtyByModel,
  resolveVehicleModelId
} from '../Utils/partNumberNormalize'
import type { PartUpsertInput } from './partsService'
import { refreshPartNumberComparisons } from './partComparisonService'

const CHUNK = 250

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
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

async function loadExistingNormalizedParts(normals: string[]): Promise<Set<string>> {
  const found = new Set<string>()
  for (const batch of chunk(normals, CHUNK)) {
    const { data, error } = await client()
      .from('parts')
      .select('normalized_part_number')
      .in('normalized_part_number', batch)
    if (error) throw new Error(error.message)
    ;(data ?? []).forEach(r => found.add(String(r.normalized_part_number)))
  }
  return found
}

async function loadExistingBomLineKeys(keys: string[]): Promise<Set<string>> {
  const found = new Set<string>()
  for (const batch of chunk(keys, CHUNK)) {
    const { data, error } = await client()
      .from('bom_items')
      .select('import_line_key')
      .in('import_line_key', batch)
    if (error) throw new Error(error.message)
    ;(data ?? []).forEach(r => {
      if (r.import_line_key) found.add(String(r.import_line_key))
    })
  }
  return found
}

async function upsertPartsBatch(
  inputs: Map<string, PartUpsertInput & { normalized: string }>,
  existingNorms: Set<string>,
  summary: BomImportSummary
): Promise<Map<string, string>> {
  const idByNorm = new Map<string, string>()
  const payloads = [...inputs.values()].map(p => ({
    part_number: p.part_number.trim(),
    normalized_part_number: p.normalized,
    part_name_ar: p.part_name_ar?.trim() || null,
    part_name_en: p.part_name_en?.trim() || null,
    category_id: p.category_id ?? null,
    part_type: p.part_type?.trim() || null,
    part_number_new: p.part_number_new?.trim() || null,
    alternative_part_no: p.alternative_part_no?.trim() || null
  }))

  for (const batch of chunk(payloads, CHUNK)) {
    for (const p of batch) {
      if (existingNorms.has(p.normalized_part_number)) summary.updatedParts++
      else {
        summary.createdParts++
        existingNorms.add(p.normalized_part_number)
      }
    }
    const { data, error } = await client()
      .from('parts')
      .upsert(batch, { onConflict: 'normalized_part_number' })
      .select('id, normalized_part_number')
    if (error) throw new Error(error.message)
    ;(data ?? []).forEach(r => idByNorm.set(String(r.normalized_part_number), r.id as string))
  }

  return idByNorm
}

type PreparedBomLine = {
  row: ParsedBomRow
  lineKey: string
  payload: Record<string, unknown>
}

export type BomImportProgress = {
  phase: 'parts' | 'bom' | 'finish'
  done: number
  total: number
}

export async function runBomImport(
  rows: ParsedBomRow[],
  options: { fileName: string; sheetName: string; sourceFile?: string },
  onProgress?: (p: BomImportProgress) => void
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

  const partInputs = new Map<string, PartUpsertInput & { normalized: string }>()
  const prepared: PreparedBomLine[] = []
  const lineKeys: string[] = []
  const seenNormalized = new Set<string>()

  for (const row of rows) {
    try {
      const norm = normalizePartNumber(row.partNumber)
      if (seenNormalized.has(norm)) summary.duplicatePartNumbers++
      seenNormalized.add(norm)

      const catCode = classificationToCategoryCode(row.bomClassification)
      const categoryId = categoryMap.get(catCode) ?? uncategorizedId

      const nameEn = sanitizePartNameEn(row.partNameAr, row.partNameEn, row.raw)

      if (!partInputs.has(norm)) {
        partInputs.set(norm, {
          normalized: norm,
          part_number: row.partNumber,
          part_name_ar: row.partNameAr,
          part_name_en: nameEn,
          category_id: categoryId,
          part_type: effectivePartKind(row.partKind),
          part_number_new: row.partNumberNew,
          alternative_part_no: row.alternativePartNo
        })
      } else {
        const cur = partInputs.get(norm)!
        if (!cur.part_name_ar && row.partNameAr) cur.part_name_ar = row.partNameAr
        if (!cur.part_name_en && nameEn) cur.part_name_en = nameEn
        if (!cur.part_type) cur.part_type = effectivePartKind(row.partKind)
      }

      const modelName = row.qtyByModel[0]?.model ?? row.applicableModels[0] ?? ''
      const consolidated = isConsolidatedImportRow(row)
      const qtyEntries = consolidated
        ? parseQtyByModel(row.qtyByModelRaw).map(e => ({ modelName: e.model, qty: e.qty }))
        : [{ modelName, qty: row.qtyByModel[0]?.qty ?? 1 }]
      const qty = consolidated ? maxModelQty(qtyEntries) : (row.qtyByModel[0]?.qty ?? 1)
      const stCode = normalizeStationCode(row.stationCode)
      const stationId = row.stationCode
        ? (stationMap.get(stCode) ?? stationMap.get(row.stationCode.toUpperCase()) ?? null)
        : null
      const vehicleModelId = consolidated ? null : resolveVehicleModelId(modelName, modelMap)
      const needsReview = !stationId || (!consolidated && !vehicleModelId && Boolean(modelName))
      const lineKey = bomImportLineKey({
        normalizedPart: norm,
        stationCode: row.stationCode || '_',
        modelName: consolidated ? '_' : modelName || '_'
      })

      lineKeys.push(lineKey)
      prepared.push({
        row,
        lineKey,
        payload: {
          part_number: row.partNumber,
          part_name: row.partNameAr || row.partNameEn || null,
          quantity: qty,
          vehicle_model_id: vehicleModelId,
          station_id: stationId,
          model_family: row.modelFamily || null,
          applicable_models_text: row.applicableModels.join(', ') || null,
          station_code_text: row.stationCode || null,
          station_category: row.stationCategory || null,
          supply_source: effectiveSupplySource(row.supplySource),
          bom_classification: row.bomClassification || null,
          qty_by_model_raw:
            row.qtyByModelRaw || row.qtyByModel.map(q => `${q.model}=${q.qty}`).join('; ') || null,
          source_file: options.sourceFile ?? options.fileName,
          source_sheet: row.sourceSheet || options.sheetName,
          source_row_number: row.sourceRow,
          import_line_key: lineKey,
          needs_review: needsReview,
          raw_data: row.raw,
          is_active: true
        }
      })
    } catch (e) {
      summary.errorsCount++
      summary.errors.push(
        `Row ${row.rowNumber}: ${e instanceof Error ? e.message : String(e)}`
      )
    }
  }

  const uniqueNorms = [...partInputs.keys()]
  onProgress?.({ phase: 'parts', done: 0, total: uniqueNorms.length })

  const existingParts = await loadExistingNormalizedParts(uniqueNorms)
  summary.createdParts = 0
  summary.updatedParts = 0

  const partIdByNorm = await upsertPartsBatch(partInputs, existingParts, summary)
  const missingNorms = uniqueNorms.filter(n => !partIdByNorm.has(n))
  if (missingNorms.length > 0) {
    for (const batch of chunk(missingNorms, CHUNK)) {
      const { data, error } = await client()
        .from('parts')
        .select('id, normalized_part_number')
        .in('normalized_part_number', batch)
      if (error) throw new Error(error.message)
      ;(data ?? []).forEach(r => partIdByNorm.set(String(r.normalized_part_number), r.id as string))
    }
  }
  onProgress?.({ phase: 'parts', done: uniqueNorms.length, total: uniqueNorms.length })

  for (const line of prepared) {
    const norm = normalizePartNumber(line.row.partNumber)
    const partId = partIdByNorm.get(norm)
    if (!partId) {
      summary.errorsCount++
      summary.errors.push(`Row ${line.row.rowNumber}: Part id missing after upsert`)
    } else {
      line.payload.part_id = partId
    }
  }

  const validLines = prepared.filter(l => l.payload.part_id)
  const validKeys = validLines.map(l => l.lineKey)

  onProgress?.({ phase: 'bom', done: 0, total: validLines.length })
  const existingBomKeys = await loadExistingBomLineKeys(validKeys)

  let bomDone = 0
  for (const batch of chunk(validLines, CHUNK)) {
    const payloads = batch.map(l => l.payload)
    for (const l of batch) {
      if (existingBomKeys.has(l.lineKey)) summary.updatedBomItems++
      else {
        summary.createdBomItems++
        existingBomKeys.add(l.lineKey)
      }
    }
    const { error } = await client()
      .from('bom_items')
      .upsert(payloads, { onConflict: 'import_line_key' })
    if (error) {
      for (const l of batch) {
        summary.errorsCount++
        summary.errors.push(`Row ${l.row.rowNumber}: ${error.message}`)
        await client().from('bom_import_errors').insert({
          batch_id: summary.batchId,
          row_number: l.row.rowNumber,
          error_message: error.message,
          raw_data: l.row.raw
        })
      }
    }
    bomDone += batch.length
    onProgress?.({ phase: 'bom', done: bomDone, total: validLines.length })
  }

  onProgress?.({ phase: 'finish', done: 0, total: 1 })
  try {
    await refreshPartNumberComparisons()
  } catch (e) {
    summary.errors.push(e instanceof Error ? e.message : 'Comparison refresh failed')
  }
  onProgress?.({ phase: 'finish', done: 1, total: 1 })

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
