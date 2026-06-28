import { supabase } from '../lib/supabase'
import type { BomDashboardStats, BomItemCreateInput, BomItemDetail, BomItemUpdateInput } from '../Types/bom'
import type { VehicleModel } from '../Types/settings'
import { cardsCanConsolidate, consolidatedPayload, type ModelCardDraft } from '../Utils/bomModelCards'
import { effectivePartKind, effectiveSupplySource } from '../Utils/bomDefaults'
import { bomImportLineKey, classificationToCategoryCode, normalizePartNumber } from '../Utils/partNumberNormalize'
import { BOM_FILTER_DB_FIELD, type BomFilterColumn } from '../Utils/bomFilterFields'
import { bomStationCodeRawVariants, displayBomStationCode, normalizeBomStationCodeText } from '../Utils/bomStationCode'
import { upsertPart } from './partsService'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

/** Excel-style multi-select per column (empty / undefined = no filter on column). */
export type BomExcelColumnFilters = Partial<Record<BomFilterColumn, string[]>>

export type BomListFilters = {
  search?: string
  stationCode?: string
  /** Filter by settings station (matches linked id or IPL station code). */
  stationId?: string
  stationNumber?: string
  modelName?: string
  vehicleModelId?: string
  categoryCode?: string
  classification?: string
  uncategorizedOnly?: boolean
  needsReviewOnly?: boolean
  isCriticalOnly?: boolean
  stopperType?: 'line_stopper' | 'car_stopper' | 'non_stopper'
  hasOperationOnly?: boolean
  noOperationOnly?: boolean
  sourceFile?: string
  excel?: BomExcelColumnFilters
  page?: number
  pageSize?: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyBomFilters(q: any, filters: BomListFilters) {
  if (filters.search?.trim()) {
    const term = filters.search.trim().replace(/%/g, '')
    q = q.or(
      `part_number.ilike.%${term}%,part_name.ilike.%${term}%,part_name_ar.ilike.%${term}%,normalized_part_number.ilike.%${term}%`
    )
  }
  if (filters.stationId) {
    if (filters.stationNumber) {
      q = q.or(`station_id.eq.${filters.stationId},station_code_text.eq.${filters.stationNumber}`)
    } else {
      q = q.eq('station_id', filters.stationId)
    }
  } else if (filters.stationCode) {
    q = q.ilike('station_code_text', `%${filters.stationCode}%`)
  }
  if (filters.vehicleModelId) q = q.eq('vehicle_model_id', filters.vehicleModelId)
  else if (filters.modelName) {
    q = q.or(`vehicle_model_name.ilike.%${filters.modelName}%,applicable_models_text.ilike.%${filters.modelName}%`)
  }
  if (filters.categoryCode) q = q.eq('category_code', filters.categoryCode)
  if (filters.classification) q = q.ilike('bom_classification', `%${filters.classification}%`)
  if (filters.uncategorizedOnly) q = q.or('category_code.is.null,category_code.eq.UNCATEGORIZED')
  if (filters.needsReviewOnly) q = q.eq('needs_review', true)
  if (filters.isCriticalOnly) q = q.eq('is_critical', true)
  if (filters.stopperType === 'line_stopper') {
    q = q.or('stopper_type.eq.line_stopper,operation_is_line_stopper.eq.true')
  } else if (filters.stopperType === 'car_stopper') {
    q = q.or('stopper_type.eq.car_stopper,operation_is_car_stopper.eq.true')
  } else if (filters.stopperType) {
    q = q.eq('stopper_type', filters.stopperType)
  }
  if (filters.hasOperationOnly) q = q.not('operation_id', 'is', null)
  if (filters.noOperationOnly) q = q.is('operation_id', null)
  if (filters.sourceFile) q = q.ilike('source_file', `%${filters.sourceFile}%`)

  const excel = filters.excel
  if (excel) {
    for (const col of Object.keys(excel) as BomFilterColumn[]) {
      const values = excel[col]?.filter(v => v !== '')
      if (values && values.length > 0) {
        const field = BOM_FILTER_DB_FIELD[col]
        const hasBlank = values.includes('__BLANK__')
        const rest = values.filter(v => v !== '__BLANK__')
        const matchValues =
          col === 'station_code'
            ? [...new Set(rest.flatMap(v => bomStationCodeRawVariants(v)))]
            : rest
        if (hasBlank && matchValues.length === 0) {
          q = q.or(`${field}.is.null,${field}.eq.`)
        } else if (hasBlank && matchValues.length > 0) {
          q = q.or(`${field}.is.null,${field}.in.(${matchValues.join(',')})`)
        } else if (matchValues.length > 0) {
          q = q.in(field, matchValues)
        }
      }
    }
  }
  return q
}

export type BomListResult = {
  items: BomItemDetail[]
  total: number
  page: number
  pageSize: number
}

export async function getBomItems(filters: BomListFilters = {}): Promise<BomListResult> {
  const page = filters.page ?? 1
  const pageSize = Math.min(filters.pageSize ?? 50, 200)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let q = applyBomFilters(client().from('v_bom_items_detail').select('*', { count: 'exact' }), filters)

  const { data, error, count } = await q
    .order('station_sort_order', { ascending: true, nullsFirst: false })
    .order('part_number', { ascending: true })
    .range(from, to)
  if (error) throw new Error(error.message)

  return {
    items: (data ?? []) as BomItemDetail[],
    total: count ?? 0,
    page,
    pageSize
  }
}

export async function getBomItemById(id: string): Promise<BomItemDetail | null> {
  const { data, error } = await client().from('v_bom_items_detail').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data as BomItemDetail | null
}

export async function getBomDistinctValues(
  column: BomFilterColumn,
  filters: Omit<BomListFilters, 'page' | 'pageSize' | 'excel'> & { excel?: BomExcelColumnFilters },
  options?: { search?: string; limit?: number; excludeColumn?: BomFilterColumn }
): Promise<{ values: string[]; truncated: boolean }> {
  const field = BOM_FILTER_DB_FIELD[column]
  const limit = options?.limit ?? 350
  const excel = { ...filters.excel }
  if (options?.excludeColumn) delete excel[options.excludeColumn]

  let q = applyBomFilters(
    client().from('v_bom_items_detail').select(field).order(field),
    { ...filters, excel }
  )
  if (options?.search?.trim()) {
    const term = options.search.trim().replace(/%/g, '')
    if (column === 'station_code') {
      const variants = bomStationCodeRawVariants(term)
      const patterns = variants.length > 0 ? variants : [term]
      q = q.or(patterns.map(v => `${field}.ilike.%${v}%`).join(','))
    } else {
      q = q.ilike(field, `%${term}%`)
    }
  }

  const { data, error } = await q.limit(2500)
  if (error) throw new Error(error.message)

  const seen = new Set<string>()
  let hasBlank = false
  for (const row of data ?? []) {
    const raw = (row as Record<string, unknown>)[field]
    const v = raw == null || String(raw).trim() === '' ? '' : String(raw).trim()
    if (!v) {
      hasBlank = true
      continue
    }
    const key = column === 'station_code' ? displayBomStationCode(v) : v
    if (!key) {
      hasBlank = true
      continue
    }
    seen.add(key)
    if (seen.size >= limit) break
  }

  const values = [...seen].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  )
  if (hasBlank) values.unshift('__BLANK__')
  const truncated = (data?.length ?? 0) >= 2500 && seen.size >= limit
  return { values, truncated }
}

export async function getBomCountForModel(vehicleModelId: string): Promise<number> {
  const { count, error } = await client()
    .from('bom_items')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('vehicle_model_id', vehicleModelId)
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function updateBomItem(id: string, input: BomItemUpdateInput): Promise<void> {
  const { data: current, error: loadErr } = await client()
    .from('bom_items')
    .select('*, parts(id, part_number)')
    .eq('id', id)
    .single()
  if (loadErr) throw new Error(loadErr.message)
  const row = current as {
    part_id: string
    part_number: string
    station_code_text: string | null
    vehicle_model_id: string | null
    parts: { part_number: string } | null
  }

  if (
    input.part_number != null ||
    input.part_name_ar != null ||
    input.part_name_en != null ||
    input.part_number_new != null ||
    input.alternative_part_no != null ||
    input.part_kind != null
  ) {
    const { error } = await client()
      .from('parts')
      .update({
        ...(input.part_number != null ? { part_number: input.part_number.trim() } : {}),
        ...(input.part_number != null
          ? { normalized_part_number: normalizePartNumber(input.part_number) }
          : {}),
        ...(input.part_name_ar != null ? { part_name_ar: input.part_name_ar.trim() || null } : {}),
        ...(input.part_name_en != null ? { part_name_en: input.part_name_en.trim() || null } : {}),
        ...(input.part_number_new != null ? { part_number_new: input.part_number_new.trim() || null } : {}),
        ...(input.alternative_part_no != null
          ? { alternative_part_no: input.alternative_part_no.trim() || null }
          : {}),
        ...(input.part_kind != null ? { part_type: effectivePartKind(input.part_kind) } : {})
      })
      .eq('id', row.part_id)
    if (error) throw new Error(error.message)
  }

  const partNumber = input.part_number?.trim() ?? row.part_number
  const stationCode = input.station_code_text ?? row.station_code_text ?? ''
  let vehicleModelId = input.vehicle_model_id
  if (vehicleModelId === undefined) vehicleModelId = row.vehicle_model_id

  let modelName = ''
  if (vehicleModelId) {
    const { data: vm } = await client().from('vehicle_models').select('name').eq('id', vehicleModelId).maybeSingle()
    modelName = (vm?.name as string) ?? ''
  } else if (input.applicable_models_text) {
    modelName = '_'
  }

  const norm = normalizePartNumber(partNumber)
  const lineKey = bomImportLineKey({
    normalizedPart: norm,
    stationCode: stationCode || '_',
    modelName: modelName || '_'
  })

  const bomPayload: Record<string, unknown> = {
    import_line_key: lineKey,
    ...(input.part_number != null ? { part_number: input.part_number.trim() } : {}),
    ...(input.part_name_ar != null || input.part_name_en != null
      ? { part_name: (input.part_name_ar || input.part_name_en || '').trim() || null }
      : {}),
    ...(input.quantity != null ? { quantity: input.quantity } : {}),
    ...(input.vehicle_model_id !== undefined ? { vehicle_model_id: input.vehicle_model_id } : {}),
    ...(input.station_id !== undefined ? { station_id: input.station_id } : {}),
    ...(input.station_code_text !== undefined ? { station_code_text: input.station_code_text } : {}),
    ...(input.model_family !== undefined ? { model_family: input.model_family } : {}),
    ...(input.applicable_models_text !== undefined
      ? { applicable_models_text: input.applicable_models_text }
      : {}),
    ...(input.station_category !== undefined ? { station_category: input.station_category } : {}),
    ...(input.supply_source !== undefined
      ? { supply_source: effectiveSupplySource(input.supply_source) }
      : {}),
    ...(input.bom_classification !== undefined ? { bom_classification: input.bom_classification } : {}),
    ...(input.qty_by_model_raw !== undefined ? { qty_by_model_raw: input.qty_by_model_raw } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    ...(input.needs_review !== undefined ? { needs_review: input.needs_review } : {}),
    ...(input.is_active !== undefined ? { is_active: input.is_active } : {}),
    ...(input.stopper_type !== undefined ? { stopper_type: input.stopper_type } : {})
  }

  if (input.bom_classification != null) {
    const catCode = classificationToCategoryCode(input.bom_classification)
    const { data: cat } = await client()
      .from('part_categories')
      .select('id')
      .eq('category_code', catCode)
      .maybeSingle()
    if (cat?.id) {
      await client().from('parts').update({ category_id: cat.id }).eq('id', row.part_id)
    }
  }

  const { error } = await client().from('bom_items').update(bomPayload).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function createBomItem(input: BomItemCreateInput): Promise<string> {
  const partNumber = input.part_number.trim()
  if (!partNumber) throw new Error('Part number is required')
  const hasModels = Boolean(input.applicable_models_text?.trim() || input.vehicle_model_id)
  if (!hasModels) throw new Error('Vehicle model is required')

  let categoryId: string | null = null
  if (input.bom_classification) {
    const catCode = classificationToCategoryCode(input.bom_classification)
    const { data: cat } = await client()
      .from('part_categories')
      .select('id')
      .eq('category_code', catCode)
      .maybeSingle()
    categoryId = (cat?.id as string) ?? null
  }
  if (!categoryId) {
    const { data: unc } = await client()
      .from('part_categories')
      .select('id')
      .eq('category_code', 'UNCATEGORIZED')
      .maybeSingle()
    categoryId = (unc?.id as string) ?? null
  }

  const { id: partId } = await upsertPart({
    part_number: partNumber,
    part_name_ar: input.part_name_ar,
    part_name_en: input.part_name_en,
    category_id: categoryId,
    part_type: effectivePartKind(input.part_kind),
    part_number_new: input.part_number_new,
    alternative_part_no: input.alternative_part_no
  })

  let modelName = ''
  if (input.vehicle_model_id) {
    const { data: vm } = await client()
      .from('vehicle_models')
      .select('name')
      .eq('id', input.vehicle_model_id)
      .maybeSingle()
    modelName = (vm?.name as string) ?? ''
  }

  const stationCode = normalizeBomStationCodeText(input.station_code_text ?? '')
  const norm = normalizePartNumber(partNumber)
  const lineKey = bomImportLineKey({
    normalizedPart: norm,
    stationCode: stationCode || '_',
    modelName: modelName || '_'
  })

  const qtyRaw =
    input.qty_by_model_raw?.trim() ||
    (modelName ? `${modelName}=${input.quantity}` : String(input.quantity))

  const payload = {
    part_id: partId,
    part_number: partNumber,
    part_name: input.part_name_ar?.trim() || input.part_name_en?.trim() || null,
    quantity: input.quantity,
    vehicle_model_id: input.vehicle_model_id ?? null,
    station_id: input.station_id ?? null,
    station_code_text: stationCode || null,
    model_family: input.model_family?.trim() || null,
    applicable_models_text: input.applicable_models_text?.trim() || modelName || null,
    station_category: input.station_category?.trim() || null,
    supply_source: effectiveSupplySource(input.supply_source),
    bom_classification: input.bom_classification?.trim() || null,
    qty_by_model_raw: qtyRaw,
    import_line_key: lineKey,
    needs_review: !input.station_id && !stationCode,
    notes: input.notes?.trim() || null,
    source_sheet: 'manual',
    is_active: true,
    stopper_type: input.stopper_type ?? 'non_stopper'
  }

  const { data: existing } = await client()
    .from('bom_items')
    .select('id')
    .eq('import_line_key', lineKey)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await client().from('bom_items').update(payload).eq('id', existing.id)
    if (error) throw new Error(error.message)
    return existing.id as string
  }

  const { data, error } = await client().from('bom_items').insert(payload).select('id').single()
  if (error) throw new Error(error.message)
  return data.id as string
}

export async function saveBomFromModelCards(
  editItemId: string | undefined,
  familyIds: string[],
  cards: ModelCardDraft[],
  names: {
    part_name_ar?: string
    part_name_en?: string
    notes?: string
    stopper_type?: 'line_stopper' | 'car_stopper' | 'non_stopper'
  },
  allModels: VehicleModel[]
): Promise<string> {
  const active = cards.filter(c => {
    const q = Number(c.qty)
    return c.part_number.trim() && c.modelId && Number.isFinite(q) && q > 0
  })
  if (active.length === 0) throw new Error('At least one model with part number and qty is required')

  if (cardsCanConsolidate(active)) {
    const payload = consolidatedPayload(allModels, familyIds, active, names)
    if (editItemId) {
      await updateBomItem(editItemId, payload)
      return editItemId
    }
    const id = await createBomItem({
      ...payload,
      vehicle_model_id: active.length === 1 ? active[0].modelId : null
    })
    return id
  }

  let primaryId = editItemId ?? ''
  for (let i = 0; i < active.length; i++) {
    const c = active[i]
    const variant = allModels.find(m => m.id === c.modelId)
    const familyName =
      allModels.find(m => m.id === variant?.parent_model_id)?.name ??
      allModels.find(m => familyIds.includes(m.id))?.name ??
      undefined
    const payload: BomItemCreateInput = {
      part_number: c.part_number.trim(),
      part_number_new: c.part_number_new.trim() || undefined,
      alternative_part_no: c.alternative_part_no.trim() || undefined,
      part_name_ar: names.part_name_ar,
      part_name_en: names.part_name_en,
      part_kind: effectivePartKind(c.part_kind),
      quantity: Number(c.qty),
      vehicle_model_id: c.modelId,
      station_id: c.station_id || null,
      station_code_text: normalizeBomStationCodeText(c.station_code_text),
      station_category: c.station_category || undefined,
      supply_source: effectiveSupplySource(c.supply_source),
      model_family: familyName,
      applicable_models_text: c.modelName,
      bom_classification: c.bom_classification || undefined,
      qty_by_model_raw: `${c.modelName}=${c.qty}`,
      notes: names.notes,
      stopper_type: names.stopper_type ?? 'non_stopper'
    }
    if (i === 0 && editItemId) {
      await updateBomItem(editItemId, payload)
      primaryId = editItemId
    } else {
      const id = await createBomItem(payload)
      if (!primaryId) primaryId = id
    }
  }
  if (!primaryId) throw new Error('Failed to save BOM item')
  return primaryId
}

export async function deleteBomItem(id: string): Promise<void> {
  const { error } = await client().from('bom_items').update({ is_active: false }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getBomFilterOptions(): Promise<{
  stations: string[]
  models: string[]
  classifications: string[]
  sourceFiles: string[]
}> {
  const { data } = await client()
    .from('bom_items')
    .select('station_code_text, model_family, applicable_models_text, bom_classification, source_file')
    .eq('is_active', true)
    .limit(8000)

  const stations = new Set<string>()
  const models = new Set<string>()
  const classifications = new Set<string>()
  const sourceFiles = new Set<string>()

  ;(data ?? []).forEach(r => {
    if (r.station_code_text) stations.add(String(r.station_code_text))
    if (r.model_family) models.add(String(r.model_family))
    if (r.applicable_models_text) {
      String(r.applicable_models_text)
        .split(/[,،]/)
        .forEach(m => models.add(m.trim()))
    }
    if (r.bom_classification) classifications.add(String(r.bom_classification))
    if (r.source_file) sourceFiles.add(String(r.source_file))
  })

  return {
    stations: [...stations].sort(),
    models: [...models].sort(),
    classifications: [...classifications].sort(),
    sourceFiles: [...sourceFiles].sort()
  }
}

export async function getBomDashboardStats(): Promise<BomDashboardStats> {
  const { count: totalBomRows } = await client()
    .from('bom_items')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const { count: uniquePartNumbers } = await client()
    .from('parts')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const { count: duplicatePartNumbers } = await client()
    .from('part_number_comparisons')
    .select('*', { count: 'exact', head: true })
    .in('comparison_status', ['duplicate', 'possible_duplicate'])

  const { data: uncParts } = await client()
    .from('parts')
    .select('id, category_id, part_categories(category_code)')
    .eq('is_active', true)
  const uncategorized = (uncParts ?? []).filter(
    p => !p.category_id || (p.part_categories as { category_code?: string } | null)?.category_code === 'UNCATEGORIZED'
  ).length

  const { data: stations } = await client().from('bom_items').select('station_code_text').eq('is_active', true)
  const stationSet = new Set((stations ?? []).map(s => s.station_code_text).filter(Boolean))

  const { data: models } = await client().from('bom_items').select('vehicle_model_id').eq('is_active', true)
  const modelSet = new Set((models ?? []).map(m => m.vehicle_model_id).filter(Boolean))

  const { count: totalCategories } = await client()
    .from('part_categories')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const { data: lastBatch } = await client()
    .from('bom_import_batches')
    .select('imported_at')
    .order('imported_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: byCat } = await client().from('parts').select('category_id, part_categories(category_name_ar)').eq('is_active', true)
  const catMap = new Map<string, number>()
  ;(byCat ?? []).forEach(p => {
    const label =
      (p.part_categories as { category_name_ar?: string } | null)?.category_name_ar ?? 'غير مصنف'
    catMap.set(label, (catMap.get(label) ?? 0) + 1)
  })

  const { data: topRepeated } = await client()
    .from('part_number_comparisons')
    .select('part_number, occurrence_count')
    .order('occurrence_count', { ascending: false })
    .limit(10)

  return {
    totalBomRows: totalBomRows ?? 0,
    uniquePartNumbers: uniquePartNumbers ?? 0,
    duplicatePartNumbers: duplicatePartNumbers ?? 0,
    uncategorizedParts: uncategorized,
    totalStations: stationSet.size,
    totalModels: modelSet.size,
    totalCategories: totalCategories ?? 0,
    lastImportAt: (lastBatch?.imported_at as string) ?? null,
    byCategory: [...catMap.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    topRepeated: (topRepeated ?? []).map(r => ({
      part_number: r.part_number as string,
      occurrence_count: r.occurrence_count as number
    }))
  }
}
