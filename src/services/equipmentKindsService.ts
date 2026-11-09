import { supabase } from '../lib/supabase'
import { FALLBACK_EQUIPMENT_KINDS, type EquipmentKind, type EquipmentKindInput } from '../Types/equipmentKind'
import { formatRangeBounds, parseRangeBoundsText } from '../Utils/equipmentRange'
import { slugEquipmentKindCode } from '../Utils/equipmentKindLabel'

function client() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

type KindRow = {
  code: string
  label_ar: string
  label_en: string | null
  manufacturer?: string | null
  operating_range?: string | null
  range_min?: number | string | null
  range_max?: number | string | null
  sort_order: number | null
  is_active: boolean | null
}

function toNum(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function mapKind(row: KindRow): EquipmentKind {
  let rangeMin = toNum(row.range_min)
  let rangeMax = toNum(row.range_max)
  if (rangeMin == null && rangeMax == null) {
    const parsed = parseRangeBoundsText(row.operating_range)
    rangeMin = parsed.min
    rangeMax = parsed.max
  }
  const operatingRange =
    formatRangeBounds(rangeMin, rangeMax) || (row.operating_range || '').trim()
  return {
    code: row.code,
    labelAr: row.label_ar,
    labelEn: row.label_en || '',
    manufacturer: row.manufacturer || '',
    rangeMin,
    rangeMax,
    operatingRange,
    sortOrder: row.sort_order ?? 0,
    isActive: row.is_active !== false
  }
}

function errorText(err: unknown): string {
  if (err instanceof Error) return `${err.message} ${err.name}`
  if (typeof err === 'object' && err) {
    const row = err as { message?: unknown; code?: unknown; details?: unknown }
    return [row.message, row.code, row.details].filter(Boolean).join(' ')
  }
  return String(err)
}

export function isMissingEquipmentKindsTable(err: unknown): boolean {
  const msg = errorText(err)
  return /line_equipment_kinds/i.test(msg) && /does not exist|schema cache|42P01|PGRST205|Could not find/i.test(msg)
}

function isMissingOptionalKindCol(err: unknown, column: string): boolean {
  const msg = errorText(err)
  return new RegExp(column, 'i').test(msg) && /schema cache|does not exist|Could not find|42703/i.test(msg)
}

const KIND_SELECT_FULL =
  'code, label_ar, label_en, manufacturer, operating_range, range_min, range_max, sort_order, is_active'
const KIND_SELECT_WITH_RANGE =
  'code, label_ar, label_en, manufacturer, operating_range, sort_order, is_active'
const KIND_SELECT_WITH_MANUFACTURER = 'code, label_ar, label_en, manufacturer, sort_order, is_active'
const KIND_SELECT_BASIC = 'code, label_ar, label_en, sort_order, is_active'

async function selectKinds(activeOnly: boolean): Promise<EquipmentKind[]> {
  const db = client()
  let query = db.from('line_equipment_kinds').select(KIND_SELECT_FULL)
  if (activeOnly) query = query.eq('is_active', true)
  query = query.order('sort_order', { ascending: true }).order('code', { ascending: true })
  let { data, error } = await query
  if (error && (isMissingOptionalKindCol(error, 'range_min') || isMissingOptionalKindCol(error, 'range_max'))) {
    let fallback = db.from('line_equipment_kinds').select(KIND_SELECT_WITH_RANGE)
    if (activeOnly) fallback = fallback.eq('is_active', true)
    fallback = fallback.order('sort_order', { ascending: true }).order('code', { ascending: true })
    ;({ data, error } = await fallback)
  }
  if (error && isMissingOptionalKindCol(error, 'operating_range')) {
    let fallback = db.from('line_equipment_kinds').select(KIND_SELECT_WITH_MANUFACTURER)
    if (activeOnly) fallback = fallback.eq('is_active', true)
    fallback = fallback.order('sort_order', { ascending: true }).order('code', { ascending: true })
    ;({ data, error } = await fallback)
  }
  if (error && isMissingOptionalKindCol(error, 'manufacturer')) {
    let fallback = db.from('line_equipment_kinds').select(KIND_SELECT_BASIC)
    if (activeOnly) fallback = fallback.eq('is_active', true)
    fallback = fallback.order('sort_order', { ascending: true }).order('code', { ascending: true })
    ;({ data, error } = await fallback)
  }
  if (error) throw error
  return ((data ?? []) as KindRow[]).map(mapKind)
}

export async function getEquipmentKinds(): Promise<EquipmentKind[]> {
  try {
    return await selectKinds(true)
  } catch (err) {
    if (isMissingEquipmentKindsTable(err)) return FALLBACK_EQUIPMENT_KINDS
    throw err instanceof Error ? err : new Error(errorText(err))
  }
}

export async function getAllEquipmentKinds(): Promise<EquipmentKind[]> {
  return selectKinds(false)
}

function resolveRangeInput(input: EquipmentKindInput): {
  rangeMin: number | null
  rangeMax: number | null
  operatingRange: string
} {
  let rangeMin = input.rangeMin ?? null
  let rangeMax = input.rangeMax ?? null
  if (rangeMin == null && rangeMax == null && input.operatingRange) {
    const parsed = parseRangeBoundsText(input.operatingRange)
    rangeMin = parsed.min
    rangeMax = parsed.max
  }
  const operatingRange = formatRangeBounds(rangeMin, rangeMax) || (input.operatingRange || '').trim()
  return { rangeMin, rangeMax, operatingRange }
}

export async function createEquipmentKind(input: EquipmentKindInput): Promise<EquipmentKind> {
  const labelAr = input.labelAr.trim()
  if (!labelAr) throw new Error('label_ar required')
  const labelEn = (input.labelEn || labelAr).trim()
  const manufacturer = (input.manufacturer || '').trim()
  const { rangeMin, rangeMax, operatingRange } = resolveRangeInput(input)
  const code = (input.code || slugEquipmentKindCode(labelEn || labelAr)).trim()

  const { data: existing } = await client()
    .from('line_equipment_kinds')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = ((existing?.[0]?.sort_order as number | undefined) ?? 0) + 10

  const fullPayload = {
    code,
    label_ar: labelAr,
    label_en: labelEn,
    manufacturer,
    operating_range: operatingRange,
    range_min: rangeMin,
    range_max: rangeMax,
    sort_order: nextOrder,
    is_active: true
  }

  let { data, error } = await client()
    .from('line_equipment_kinds')
    .insert(fullPayload)
    .select(KIND_SELECT_FULL)
    .single()

  if (error && (isMissingOptionalKindCol(error, 'range_min') || isMissingOptionalKindCol(error, 'range_max'))) {
    const { range_min: _a, range_max: _b, ...withoutBounds } = fullPayload
    ;({ data, error } = await client()
      .from('line_equipment_kinds')
      .insert(withoutBounds)
      .select(KIND_SELECT_WITH_RANGE)
      .single())
  }
  if (error && isMissingOptionalKindCol(error, 'operating_range')) {
    const { operating_range: _r, range_min: _a, range_max: _b, ...withoutRange } = fullPayload
    ;({ data, error } = await client()
      .from('line_equipment_kinds')
      .insert(withoutRange)
      .select(KIND_SELECT_WITH_MANUFACTURER)
      .single())
  }
  if (error && isMissingOptionalKindCol(error, 'manufacturer')) {
    const { manufacturer: _m, operating_range: _r, range_min: _a, range_max: _b, ...basic } = fullPayload
    ;({ data, error } = await client()
      .from('line_equipment_kinds')
      .insert(basic)
      .select(KIND_SELECT_BASIC)
      .single())
  }
  if (error) throw new Error(error.message)
  return mapKind(data as KindRow)
}

export async function updateEquipmentKind(
  code: string,
  patch: {
    labelAr?: string
    labelEn?: string
    manufacturer?: string
    rangeMin?: number | null
    rangeMax?: number | null
    operatingRange?: string
  }
): Promise<void> {
  const row: Record<string, string | number | null> = { updated_at: new Date().toISOString() }
  if (patch.labelAr != null) row.label_ar = patch.labelAr.trim()
  if (patch.labelEn != null) row.label_en = patch.labelEn.trim()
  if (patch.manufacturer != null) row.manufacturer = patch.manufacturer.trim()
  if (patch.rangeMin !== undefined || patch.rangeMax !== undefined || patch.operatingRange != null) {
    const { rangeMin, rangeMax, operatingRange } = resolveRangeInput({
      labelAr: '',
      rangeMin: patch.rangeMin,
      rangeMax: patch.rangeMax,
      operatingRange: patch.operatingRange
    })
    row.range_min = rangeMin
    row.range_max = rangeMax
    row.operating_range = operatingRange
  }

  let { error } = await client().from('line_equipment_kinds').update(row).eq('code', code)
  if (
    error &&
    (isMissingOptionalKindCol(error, 'range_min') || isMissingOptionalKindCol(error, 'range_max')) &&
    ('range_min' in row || 'range_max' in row)
  ) {
    const { range_min: _a, range_max: _b, ...without } = row
    ;({ error } = await client().from('line_equipment_kinds').update(without).eq('code', code))
  }
  if (error && isMissingOptionalKindCol(error, 'operating_range') && 'operating_range' in row) {
    const { operating_range: _r, range_min: _a, range_max: _b, ...without } = row
    ;({ error } = await client().from('line_equipment_kinds').update(without).eq('code', code))
  }
  if (error && isMissingOptionalKindCol(error, 'manufacturer') && 'manufacturer' in row) {
    const { manufacturer: _m, operating_range: _r, range_min: _a, range_max: _b, ...without } = row
    ;({ error } = await client().from('line_equipment_kinds').update(without).eq('code', code))
  }
  if (error) throw new Error(error.message)
}

export async function deleteEquipmentKind(code: string): Promise<void> {
  const { count, error: countError } = await client()
    .from('line_equipment')
    .select('id', { count: 'exact', head: true })
    .eq('equipment_type', code)
  if (countError) throw new Error(countError.message)
  if ((count ?? 0) > 0) {
    const err = new Error('EQUIPMENT_KIND_IN_USE')
    err.name = 'EQUIPMENT_KIND_IN_USE'
    throw err
  }
  const { error } = await client().from('line_equipment_kinds').delete().eq('code', code)
  if (error) throw new Error(error.message)
}
