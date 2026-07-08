import { supabase } from '../lib/supabase'
import type { Part, BomItemDetail, PartListRow } from '../Types/bom'
import { parseApplicableModelNames } from '../Utils/bomQtyByModel'
import { partMatchesIplModel } from '../Utils/iplModelParts'
import { displayBomStationCode } from '../Utils/bomStationCode'
import { normalizePartNumber } from '../Utils/partNumberNormalize'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export async function getPartById(id: string): Promise<Part | null> {
  const { data, error } = await client().from('parts').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data as Part | null
}

export async function updatePartCategory(partId: string, categoryId: string | null): Promise<void> {
  const { error } = await client().from('parts').update({ category_id: categoryId }).eq('id', partId)
  if (error) throw new Error(error.message)
}

export async function updatePartNames(
  partId: string,
  names: {
    part_name_ar?: string | null
    part_name_en?: string | null
    common_station?: string | null
    common_name?: string | null
  }
): Promise<void> {
  const { error } = await client()
    .from('parts')
    .update({
      part_name_ar: names.part_name_ar?.trim() || null,
      part_name_en: names.part_name_en?.trim() || null,
      common_station: names.common_station?.trim() || null,
      common_name: names.common_name?.trim() || null
    })
    .eq('id', partId)
  if (error) throw new Error(error.message)
}

export type PartMasterInput = {
  common_station?: string | null
  part_name_ar?: string | null
  part_name_en?: string | null
  common_name?: string | null
  model_names?: string[]
}

function formatApplicableModelsText(names?: string[]): string | null {
  const clean = [...new Set((names ?? []).map(n => n.trim()).filter(Boolean))]
  return clean.length ? clean.join(', ') : null
}

function trimOrNull(v?: string | null): string | null {
  const s = v?.trim()
  return s || null
}

function partNumberSeed(input: PartMasterInput): string {
  return (
    trimOrNull(input.common_name) ||
    trimOrNull(input.part_name_en) ||
    trimOrNull(input.part_name_ar) ||
    trimOrNull(input.common_station) ||
    ''
  )
}

function generatedPartNumber(seed: string): string {
  const base = normalizePartNumber(seed, { ignoreDashes: false }).replace(/[^A-Z0-9-]/g, '')
  const suffix = Date.now().toString(36).toUpperCase()
  return (base ? base.slice(0, 32) : 'PART') + '-' + suffix
}

export async function createPartMaster(input: PartMasterInput): Promise<{ id: string }> {
  const partNumber = generatedPartNumber(partNumberSeed(input) || 'PART')

  const { data, error } = await client()
    .from('parts')
    .insert({
      part_number: partNumber,
      normalized_part_number: normalizePartNumber(partNumber),
      part_name_ar: trimOrNull(input.part_name_ar),
      part_name_en: trimOrNull(input.part_name_en),
      common_station: trimOrNull(input.common_station),
      common_name: trimOrNull(input.common_name),
      applicable_models_text: formatApplicableModelsText(input.model_names)
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return { id: data.id as string }
}

export async function updatePartMaster(partId: string, input: PartMasterInput): Promise<void> {
  const { error } = await client()
    .from('parts')
    .update({
      part_name_ar: trimOrNull(input.part_name_ar),
      part_name_en: trimOrNull(input.part_name_en),
      common_station: trimOrNull(input.common_station),
      common_name: trimOrNull(input.common_name),
      applicable_models_text: formatApplicableModelsText(input.model_names)
    })
    .eq('id', partId)

  if (error) throw new Error(error.message)
}

export async function deletePart(partId: string): Promise<void> {
  const { error } = await client().from('parts').update({ is_active: false }).eq('id', partId)
  if (error) throw new Error(error.message)
}

export type PartListStationOption = {
  code: string
  label: string
}

export type PartsListFilters = {
  search?: string
  modelName?: string
  stationCode?: string
  page?: number
  pageSize?: number
}

type BomModelRow = {
  part_id: string
  applicable_models_text: string | null
  vehicle_models: { name: string } | { name: string }[] | null
}

async function getPartModelsByPartIds(partIds: string[]): Promise<Map<string, string[]>> {
  const result = new Map<string, Set<string>>()
  if (partIds.length === 0) return new Map()

  const CHUNK = 100
  for (let i = 0; i < partIds.length; i += CHUNK) {
    const chunk = partIds.slice(i, i + CHUNK)
    const { data, error } = await client()
      .from('bom_items')
      .select('part_id, applicable_models_text, vehicle_models(name)')
      .eq('is_active', true)
      .in('part_id', chunk)

    if (error) throw new Error(error.message)

    for (const row of (data ?? []) as BomModelRow[]) {
      const names = result.get(row.part_id) ?? new Set<string>()
      const vm = Array.isArray(row.vehicle_models) ? row.vehicle_models[0] : row.vehicle_models
      if (vm?.name?.trim()) names.add(vm.name.trim())
      for (const name of parseApplicableModelNames(row.applicable_models_text)) {
        names.add(name)
      }
      result.set(row.part_id, names)
    }
  }

  return new Map([...result.entries()].map(([id, names]) => [id, [...names].sort((a, b) => a.localeCompare(b, 'ar'))]))
}

export async function listPartsForIplModel(
  filters: PartsListFilters & { modelName: string }
): Promise<{ items: PartListRow[]; total: number }> {
  const modelName = filters.modelName.trim()
  if (!modelName) return { items: [], total: 0 }

  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 100

  let q = client()
    .from('parts')
    .select('*')
    .eq('is_active', true)
    .order('common_station', { ascending: true, nullsFirst: false })
    .order('common_name', { ascending: true, nullsFirst: false })
    .order('part_name_ar', { ascending: true })
    .limit(5000)

  const search = filters.search?.trim()
  if (search) {
    const s = search.replace(/%/g, '\\%')
    q = q.or(
      `common_station.ilike.%${s}%,common_name.ilike.%${s}%,part_name_ar.ilike.%${s}%,part_name_en.ilike.%${s}%,part_number.ilike.%${s}%`
    )
  }

  const { data, error } = await q
  if (error) throw new Error(error.message)

  let parts = ((data ?? []) as Part[]).filter(p => partMatchesIplModel(p, modelName))

  const stationCode = filters.stationCode?.trim()
  if (stationCode) {
    const code = stationCode.toUpperCase()
    parts = parts.filter(p => (p.common_station ?? '').trim().toUpperCase() === code)
  }

  const total = parts.length
  const from = (page - 1) * pageSize
  const pageItems = parts.slice(from, from + pageSize).map(p => ({
    ...p,
    model_names: parseApplicableModelNames(p.applicable_models_text)
  }))

  return { items: pageItems, total }
}

export async function listParts(filters: PartsListFilters = {}): Promise<{ items: PartListRow[]; total: number }> {
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 80
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let q = client()
    .from('parts')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('common_station', { ascending: true, nullsFirst: false })
    .order('common_name', { ascending: true, nullsFirst: false })
    .order('part_name_ar', { ascending: true })

  const search = filters.search?.trim()
  if (search) {
    const esc = search.replace(/%/g, '\\%')
    q = q.or(
      `common_station.ilike.%${esc}%,common_name.ilike.%${esc}%,part_name_ar.ilike.%${esc}%,part_name_en.ilike.%${esc}%`
    )
  }

  const { data, error, count } = await q.range(from, to)
  if (error) throw new Error(error.message)

  const parts = (data ?? []) as Part[]
  const modelsMap = await getPartModelsByPartIds(parts.map(p => p.id))

  return {
    items: parts.map(p => {
      const stored = parseApplicableModelNames(p.applicable_models_text)
      const bom = modelsMap.get(p.id) ?? []
      const model_names = [...new Set([...stored, ...bom])].sort((a, b) => a.localeCompare(b, 'ar'))
      return { ...p, model_names }
    }),
    total: count ?? 0
  }
}

export async function getPartBomUsage(partId: string): Promise<BomItemDetail[]> {
  const { data, error } = await client()
    .from('v_bom_items_detail')
    .select('*')
    .eq('part_id', partId)
    .order('station_code_text')
    .limit(500)
  if (error) throw new Error(error.message)
  return (data ?? []) as BomItemDetail[]
}

export type PartUpsertInput = {
  part_number: string
  part_name_ar?: string
  part_name_en?: string
  category_id?: string | null
  part_type?: string
  part_number_new?: string
  alternative_part_no?: string
}

export async function upsertPart(input: PartUpsertInput): Promise<{ id: string; created: boolean }> {
  const normalized = normalizePartNumber(input.part_number)
  const { data: existing } = await client()
    .from('parts')
    .select('id')
    .eq('normalized_part_number', normalized)
    .maybeSingle()

  const payload = {
    part_number: input.part_number.trim(),
    normalized_part_number: normalized,
    part_name_ar: input.part_name_ar?.trim() || null,
    part_name_en: input.part_name_en?.trim() || null,
    category_id: input.category_id ?? null,
    part_type: input.part_type?.trim() || null,
    part_number_new: input.part_number_new?.trim() || null,
    alternative_part_no: input.alternative_part_no?.trim() || null
  }

  if (existing?.id) {
    const { error } = await client().from('parts').update(payload).eq('id', existing.id)
    if (error) throw new Error(error.message)
    return { id: existing.id as string, created: false }
  }

  const { data, error } = await client().from('parts').insert(payload).select('id').single()
  if (error) throw new Error(error.message)
  return { id: data.id as string, created: true }
}


export async function getT4cIplStationOptions(): Promise<PartListStationOption[]> {
  const { data: stations, error: stErr } = await client()
    .from('stations')
    .select('station_number, station_name, sort_order')
    .eq('is_active', true)
    .order('sort_order')

  if (stErr) throw new Error(stErr.message)

  type StationOpt = { code: string; label: string; sort: number }
  const options = new Map<string, StationOpt>()

  for (const s of stations ?? []) {
    const code = displayBomStationCode(String(s.station_number ?? ''))
    if (!code) continue
    const key = code.toUpperCase()
    options.set(key, {
      code,
      label: s.station_name ? `${code} — ${s.station_name}` : code,
      sort: Number(s.sort_order) || parseInt(code.replace(/\D/g, ''), 10) || 0
    })
  }

  const { data: models, error: modelErr } = await client()
    .from('vehicle_models')
    .select('id, name')
    .eq('is_active', true)

  if (modelErr) throw new Error(modelErr.message)

  const t4c = (models ?? []).find(m => {
    const name = String(m.name ?? '').trim().toUpperCase().replace(/\s+/g, '')
    return name === 'T4C'
  })

  if (t4c?.id) {
    const { data: rows, error } = await client()
      .from('bom_items')
      .select('station_code_text, vehicle_model_id, applicable_models_text')
      .eq('is_active', true)
      .not('station_code_text', 'is', null)

    if (error) throw new Error(error.message)

    for (const row of rows ?? []) {
      const applies =
        row.vehicle_model_id === t4c.id ||
        String(row.applicable_models_text ?? '')
          .toUpperCase()
          .includes('T4C') ||
        parseApplicableModelNames(row.applicable_models_text).some(
          n => n.trim().toUpperCase().replace(/\s+/g, '') === 'T4C'
        )
      if (!applies) continue

      const code = displayBomStationCode(String(row.station_code_text ?? ''))
      if (!code) continue
      const key = code.toUpperCase()
      if (!options.has(key)) {
        options.set(key, {
          code,
          label: code,
          sort: parseInt(code.replace(/\D/g, ''), 10) || 9999
        })
      }
    }
  }

  return [...options.values()]
    .sort((a, b) => a.sort - b.sort || a.code.localeCompare(b.code, undefined, { numeric: true }))
    .map(({ code, label }) => ({ code, label }))
}
