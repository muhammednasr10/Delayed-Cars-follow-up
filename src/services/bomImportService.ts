import { supabase } from '../lib/supabase'
import {
  bomImportLineKey,
  classificationToCategoryCode,
  normalizePartNumber,
  normalizeStationCode,
  parseQtyByModel,
  resolveVehicleModelId
} from '../Utils/partNumberNormalize'
import { bomStationCodeRawVariants } from '../Utils/bomStationCode'
import type { BomImportImpactEstimate, BomImportRunOptions, BomImportSummary, ParsedBomRow } from '../Types/bom'
import { sanitizePartNameEn } from '../Utils/partNameEn'
import { effectivePartKind, effectiveSupplySource } from '../Utils/bomDefaults'
import { maxModelQty, isConsolidatedImportRow } from '../Utils/bomQtyByModel'
import { resolveIplModelName } from '../Utils/iplModelAliases'
import type { PartUpsertInput } from './partsService'
import { refreshPartNumberComparisons } from './partComparisonService'
import { extractIplLogisticsFromRaw } from '../Utils/iplBomLogistics'

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
    const id = r.id as string
    const sn = String(r.station_number)
    for (const variant of bomStationCodeRawVariants(sn)) {
      m.set(variant.toUpperCase(), id)
      m.set(normalizeStationCode(variant), id)
    }
    m.set(normalizeStationCode(sn), id)
    m.set(sn.toUpperCase(), id)
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
    const { data, error } = await client().from('bom_items').select('import_line_key').in('import_line_key', batch)
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
  summary: BomImportSummary,
  addOnly: boolean
): Promise<Map<string, string>> {
  const idByNorm = new Map<string, string>()
  const allPayloads = [...inputs.values()].map(p => ({
    part_number: p.part_number.trim(),
    normalized_part_number: p.normalized,
    part_name_ar: p.part_name_ar?.trim() || null,
    part_name_en: p.part_name_en?.trim() || null,
    category_id: p.category_id ?? null,
    part_type: p.part_type?.trim() || null,
    part_number_new: p.part_number_new?.trim() || null,
    alternative_part_no: p.alternative_part_no?.trim() || null
  }))

  const toUpsert = addOnly
    ? allPayloads.filter(p => !existingNorms.has(p.normalized_part_number))
    : allPayloads

  summary.createdParts = 0
  summary.updatedParts = 0
  summary.linkedExistingParts = 0

  for (const p of allPayloads) {
    if (existingNorms.has(p.normalized_part_number)) {
      if (addOnly) summary.linkedExistingParts = (summary.linkedExistingParts ?? 0) + 1
      else summary.updatedParts++
    } else {
      summary.createdParts++
    }
  }

  for (const batch of chunk(toUpsert, CHUNK)) {
    const { data, error } = await client()
      .from('parts')
      .upsert(batch, { onConflict: 'normalized_part_number' })
      .select('id, normalized_part_number')
    if (error) throw new Error(error.message)
    ;(data ?? []).forEach(r => idByNorm.set(String(r.normalized_part_number), r.id as string))
  }

  const needLookup = [...inputs.keys()].filter(n => !idByNorm.has(n))
  for (const batch of chunk(needLookup, CHUNK)) {
    const { data, error } = await client()
      .from('parts')
      .select('id, normalized_part_number')
      .in('normalized_part_number', batch)
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

function buildLineKeys(rows: ParsedBomRow[]): string[] {
  return rows.map(row => {
    const norm = normalizePartNumber(row.partNumber)
    const consolidated = isConsolidatedImportRow(row)
    const modelName = row.qtyByModel[0]?.model ?? row.applicableModels[0] ?? ''
    return bomImportLineKey({
      normalizedPart: norm,
      stationCode: row.stationCode || '_',
      modelName: consolidated ? '_' : modelName || '_'
    })
  })
}

/** Preview how many rows would be added vs skipped (add-only). */
export async function estimateBomImportImpact(rows: ParsedBomRow[]): Promise<BomImportImpactEstimate> {
  const norms = [...new Set(rows.map(r => normalizePartNumber(r.partNumber)))]
  const keys = buildLineKeys(rows)
  const [existingParts, existingBom] = await Promise.all([
    loadExistingNormalizedParts(norms),
    loadExistingBomLineKeys(keys)
  ])
  let toAddBom = 0
  let toSkipExistingBom = 0
  for (const key of keys) {
    if (existingBom.has(key)) toSkipExistingBom++
    else toAddBom++
  }
  let toCreateParts = 0
  let toLinkExistingParts = 0
  for (const n of norms) {
    if (existingParts.has(n)) toLinkExistingParts++
    else toCreateParts++
  }
  return { toAddBom, toSkipExistingBom, toCreateParts, toLinkExistingParts }
}

export async function runBomImport(
  rows: ParsedBomRow[],
  options: BomImportRunOptions,
  onProgress?: (p: BomImportProgress) => void
): Promise<BomImportSummary> {
  const addOnly = options.addOnly !== false
  const summary: BomImportSummary = {
    batchId: '',
    createdParts: 0,
    updatedParts: 0,
    createdBomItems: 0,
    updatedBomItems: 0,
    skippedBomItems: 0,
    linkedExistingParts: 0,
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
  const catalogNames = [...modelMap.keys()]
  const categoryMap = await loadCategoryMap()
  const uncategorizedId = categoryMap.get('UNCATEGORIZED') ?? null

  const partInputs = new Map<string, PartUpsertInput & { normalized: string }>()
  const prepared: PreparedBomLine[] = []
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
      } else if (!addOnly) {
        const cur = partInputs.get(norm)!
        if (!cur.part_name_ar && row.partNameAr) cur.part_name_ar = row.partNameAr
        if (!cur.part_name_en && nameEn) cur.part_name_en = nameEn
        if (!cur.part_type) cur.part_type = effectivePartKind(row.partKind)
      }

      const modelNameRaw = row.qtyByModel[0]?.model ?? row.applicableModels[0] ?? ''
      const modelName = resolveIplModelName(modelNameRaw, catalogNames)
      const consolidated = isConsolidatedImportRow(row)
      const qtyEntries = (consolidated
        ? parseQtyByModel(row.qtyByModelRaw).map(e => ({ modelName: e.model, qty: e.qty }))
        : [{ modelName: modelNameRaw, qty: row.qtyByModel[0]?.qty ?? 1 }]
      ).map(e => ({ ...e, modelName: resolveIplModelName(e.modelName, catalogNames) }))
      const qty = consolidated ? maxModelQty(qtyEntries) : (qtyEntries[0]?.qty ?? 1)
      const stCanon = normalizeStationCode(row.stationCode)
      const stationId = row.stationCode
        ? (stationMap.get(stCanon) ?? stationMap.get(row.stationCode.toUpperCase()) ?? null)
        : null
      const vehicleModelId = consolidated ? null : resolveVehicleModelId(modelName, modelMap)
      const needsReview = !stationId || (!consolidated && !vehicleModelId && Boolean(modelName))
      const lineKey = bomImportLineKey({
        normalizedPart: norm,
        stationCode: row.stationCode || '_',
        modelName: consolidated ? '_' : modelName || '_'
      })
      const applicableCatalog = [
        ...new Set(
          (row.applicableModels.length ? row.applicableModels : qtyEntries.map(e => e.modelName))
            .map(m => resolveIplModelName(m, catalogNames))
            .filter(Boolean)
        )
      ]
      const qtyRawCatalog = qtyEntries
        .filter(e => e.modelName && e.qty > 0)
        .map(e => `${e.modelName}=${e.qty}`)
        .join('; ')

      const logistics = extractIplLogisticsFromRaw(row.raw)
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
          applicable_models_text: applicableCatalog.join(', ') || null,
          station_code_text: row.stationCode || null,
          station_category: row.stationCategory || null,
          supply_source: effectiveSupplySource(row.supplySource),
          bom_classification: row.bomClassification || null,
          qty_by_model_raw: qtyRawCatalog || row.qtyByModelRaw || null,
          source_file: options.sourceFile ?? options.fileName,
          source_sheet: row.sourceSheet || options.sheetName,
          source_row_number: row.sourceRow,
          import_line_key: lineKey,
          needs_review: needsReview,
          raw_data: row.raw,
          is_active: true,
          ...logistics,
          ...(logistics.part_direction ? { side: logistics.part_direction } : {})
        }
      })
    } catch (e) {
      summary.errorsCount++
      summary.errors.push(`Row ${row.rowNumber}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const uniqueNorms = [...partInputs.keys()]
  onProgress?.({ phase: 'parts', done: 0, total: uniqueNorms.length })

  const existingParts = await loadExistingNormalizedParts(uniqueNorms)
  const partIdByNorm = await upsertPartsBatch(partInputs, existingParts, summary, addOnly)
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
  onProgress?.({ phase: 'bom', done: 0, total: validLines.length })
  const existingBomKeys = await loadExistingBomLineKeys(validLines.map(l => l.lineKey))

  const linesToWrite = addOnly ? validLines.filter(l => !existingBomKeys.has(l.lineKey)) : validLines
  summary.createdBomItems = 0
  summary.updatedBomItems = 0
  summary.skippedBomItems = 0

  for (const l of validLines) {
    if (existingBomKeys.has(l.lineKey)) {
      if (addOnly) summary.skippedBomItems = (summary.skippedBomItems ?? 0) + 1
      else summary.updatedBomItems++
    } else {
      summary.createdBomItems++
    }
  }

  let bomDone = 0
  for (const batch of chunk(linesToWrite, CHUNK)) {
    const payloads = batch.map(l => l.payload)
    const { error } = addOnly
      ? await client().from('bom_items').insert(payloads)
      : await client().from('bom_items').upsert(payloads, { onConflict: 'import_line_key' })
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
    onProgress?.({ phase: 'bom', done: bomDone, total: linesToWrite.length })
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
