import { supabase } from '../lib/supabase'
import { normalizePartNumber } from '../Utils/partNumberNormalize'
import { formatStationDisplayCode, normalizeStationReferenceCode } from '../Utils/stationHierarchy'
import { modelBelongsToLine, type ModelLine } from '../Utils/modelLines'
import type { OperationPartInput, OperationPartRow } from '../Types/engineering'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export async function getOperationParts(operationId: string): Promise<OperationPartRow[]> {
  const { data, error } = await client()
    .from('operation_parts')
    .select(
      'id, operation_id, part_id, bom_item_id, quantity, unit, usage_type, notes, is_active, parts(part_number, part_name_ar, normalized_part_number)'
    )
    .eq('operation_id', operationId)
    .eq('is_active', true)
    .order('usage_type')
  if (error) throw new Error(error.message)

  return (data ?? []).map(row => {
    const p = row.parts as unknown as { part_number: string; part_name_ar: string | null; normalized_part_number: string } | null
    return {
      id: row.id,
      operation_id: row.operation_id,
      part_id: row.part_id,
      bom_item_id: row.bom_item_id,
      quantity: Number(row.quantity),
      unit: row.unit,
      usage_type: row.usage_type,
      notes: row.notes,
      is_active: row.is_active,
      part_number: p?.part_number,
      part_name_ar: p?.part_name_ar,
      normalized_part_number: p?.normalized_part_number
    }
  })
}

export async function addOperationPart(input: OperationPartInput): Promise<void> {
  const { error } = await client().from('operation_parts').insert({
    operation_id: input.operation_id,
    part_id: input.part_id,
    bom_item_id: input.bom_item_id ?? null,
    quantity: input.quantity,
    unit: input.unit ?? 'pcs',
    usage_type: input.usage_type ?? 'main_part',
    notes: input.notes?.trim() || null
  })
  if (error) throw new Error(error.message)
}

export async function updateOperationPart(
  id: string,
  patch: Partial<Pick<OperationPartInput, 'quantity' | 'unit' | 'usage_type' | 'notes'>>
): Promise<void> {
  const { error } = await client().from('operation_parts').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function removeOperationPart(id: string): Promise<void> {
  const { error } = await client().from('operation_parts').update({ is_active: false }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function suggestPartsFromBom(operationId: string, stationId: string): Promise<OperationPartRow[]> {
  const { data: op, error: opErr } = await client()
    .from('station_operations')
    .select('station_id')
    .eq('id', operationId)
    .maybeSingle()
  if (opErr) throw new Error(opErr.message)

  const stId = stationId || op?.station_id
  if (!stId) return []

  const { data, error } = await client()
    .from('bom_items')
    .select('id, part_id, part_number, quantity, parts(part_name_ar, normalized_part_number)')
    .eq('station_id', stId)
    .eq('is_active', true)
    .limit(100)
  if (error) throw new Error(error.message)

  return (data ?? []).map(bi => {
    const p = bi.parts as unknown as { part_name_ar: string | null; normalized_part_number: string } | null
    return {
      id: '',
      operation_id: operationId,
      part_id: bi.part_id,
      bom_item_id: bi.id,
      quantity: Number(bi.quantity),
      unit: 'pcs',
      usage_type: 'main_part' as const,
      notes: null,
      is_active: true,
      part_number: bi.part_number,
      part_name_ar: p?.part_name_ar,
      normalized_part_number: p?.normalized_part_number
    }
  })
}

export type PartLookupHit = {
  id: string
  part_number: string
  part_name_ar: string | null
  part_type: string | null
}

export async function lookupPartByNumber(partNumber: string): Promise<PartLookupHit | null> {
  const norm = normalizePartNumber(partNumber)
  if (!norm) return null
  const { data, error } = await client()
    .from('parts')
    .select('id, part_number, part_name_ar, part_type')
    .eq('normalized_part_number', norm)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return {
    id: data.id,
    part_number: data.part_number,
    part_name_ar: data.part_name_ar,
    part_type: data.part_type
  }
}

export async function searchPartsForLink(term: string, limit = 20): Promise<
  { id: string; part_number: string; part_name_ar: string | null }[]
> {
  const hits = await searchPartsWithDetails(term, limit)
  return hits.map(p => ({ id: p.id, part_number: p.part_number, part_name_ar: p.part_name_ar }))
}

export async function searchPartsWithDetails(term: string, limit = 20): Promise<PartLookupHit[]> {
  const q = term.trim().replace(/%/g, '')
  if (!q) return []
  const { data, error } = await client()
    .from('parts')
    .select('id, part_number, part_name_ar, part_type')
    .or(`part_number.ilike.%${q}%,normalized_part_number.ilike.%${q}%,part_name_ar.ilike.%${q}%`)
    .eq('is_active', true)
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []).map(row => ({
    id: row.id,
    part_number: row.part_number,
    part_name_ar: row.part_name_ar,
    part_type: row.part_type
  }))
}

type BomQtyRow = {
  quantity: number
  station_code_text: string | null
  station_id: string | null
  model_family: string | null
  vehicle_model_name: string | null
  applicable_models_text: string | null
}

function bomRowMatchesModel(row: BomQtyRow, modelLine: ModelLine | null): boolean {
  if (!modelLine) return true
  if (row.model_family && modelBelongsToLine(row.model_family, modelLine)) return true
  if (row.vehicle_model_name && modelBelongsToLine(row.vehicle_model_name, modelLine)) return true
  if (row.applicable_models_text) {
    const tokens = row.applicable_models_text.split(/[,;|/]/).map(s => s.trim()).filter(Boolean)
    if (tokens.some(t => modelBelongsToLine(t, modelLine))) return true
  }
  return false
}

function bomRowMatchesStation(
  row: BomQtyRow,
  stationId: string | null,
  parentStationId: string | null,
  stationCodes: string[]
): boolean {
  if (!stationCodes.length && !stationId && !parentStationId) return true
  if (stationId && row.station_id === stationId) return true
  if (parentStationId && row.station_id === parentStationId) return true
  const code = (row.station_code_text ?? '').trim().toUpperCase().replace(/-/g, '')
  if (!code) return false
  return stationCodes.some(sc => {
    const norm = sc.replace(/-/g, '')
    return code === norm || code.includes(norm) || norm.includes(code)
  })
}

function scoreBomRow(
  row: BomQtyRow,
  stationId: string | null,
  parentStationId: string | null,
  stationCodes: string[],
  modelLine: ModelLine | null
): number {
  const st = bomRowMatchesStation(row, stationId, parentStationId, stationCodes)
  const mo = bomRowMatchesModel(row, modelLine)
  if (st && mo) return 3
  if (st) return 2
  if (mo) return 1
  return 0
}

/** كمية الجزء من IPL (BOM) حسب المحطة والموديل عند الإمكان */
export async function lookupIplQuantityForPart(opts: {
  partId: string
  stationId: string | null
  modelLine: ModelLine | null
}): Promise<number | null> {
  const { partId, stationId, modelLine } = opts

  let stationCodes: string[] = []
  let parentStationId: string | null = null
  if (stationId) {
    const { data: st } = await client()
      .from('stations')
      .select('station_number, parent_station_id')
      .eq('id', stationId)
      .maybeSingle()
    if (st) {
      const ref = normalizeStationReferenceCode(String(st.station_number))
      stationCodes = [...new Set([ref, formatStationDisplayCode(ref), String(st.station_number).trim().toUpperCase()])]
      parentStationId = (st.parent_station_id as string | null) ?? null
    }
  }

  const { data, error } = await client()
    .from('v_bom_items_detail')
    .select(
      'quantity, station_code_text, station_id, model_family, vehicle_model_name, applicable_models_text'
    )
    .eq('part_id', partId)
    .eq('is_active', true)
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as BomQtyRow[]
  if (rows.length === 0) return null

  const ranked = rows
    .map(row => ({ row, score: scoreBomRow(row, stationId, parentStationId, stationCodes, modelLine) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)

  const pick = ranked[0]?.row ?? rows[0]
  const q = Number(pick.quantity)
  return Number.isFinite(q) && q > 0 ? q : null
}
