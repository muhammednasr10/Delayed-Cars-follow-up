import { supabase } from '../lib/supabase'
import type { BomItemDetail } from '../Types/bom'
import type { BomStopperType } from '../Types/engineering'
import { bomModelsOverlap, effectiveBomStopperType } from '../Utils/bomStopper'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export type StopperExcludedPart = {
  part_number: string
  part_name_ar: string | null
  station_code: string | null
  source: 'explicit' | 'downstream'
}

export type StopperExclusionResult = {
  stopperType: BomStopperType
  exclusions: StopperExcludedPart[]
  zoningNote: string | null
}

export type StopperExclusionEntry = {
  part_id: string
  part_number: string
  part_name_ar: string | null
}

export async function loadStopperExclusionEntries(sourceBomItemId: string): Promise<StopperExclusionEntry[]> {
  const { data: links, error } = await client()
    .from('bom_stopper_exclusions')
    .select('excluded_bom_item_id, excluded_part_id')
    .eq('source_bom_item_id', sourceBomItemId)

  if (error) {
    if (error.code === '42P01' || error.message.includes('bom_stopper_exclusions')) return []
    throw new Error(error.message)
  }

  const bomIds = (links ?? []).map(r => r.excluded_bom_item_id as string | null).filter(Boolean) as string[]
  const partIds = (links ?? []).map(r => r.excluded_part_id as string | null).filter(Boolean) as string[]

  const out: StopperExclusionEntry[] = []
  const seen = new Set<string>()

  if (bomIds.length > 0) {
    const { data: rows, error: bomErr } = await client()
      .from('v_bom_items_detail')
      .select('part_id, part_number, part_name_ar')
      .in('id', bomIds)
    if (bomErr) throw new Error(bomErr.message)
    for (const r of rows ?? []) {
      const pid = String(r.part_id)
      if (seen.has(pid)) continue
      seen.add(pid)
      out.push({
        part_id: pid,
        part_number: String(r.part_number),
        part_name_ar: (r.part_name_ar as string | null) ?? null
      })
    }
  }

  if (partIds.length > 0) {
    const { data: parts, error: partErr } = await client()
      .from('parts')
      .select('id, part_number, part_name_ar')
      .in('id', partIds)
    if (partErr) throw new Error(partErr.message)
    for (const p of parts ?? []) {
      const pid = String(p.id)
      if (seen.has(pid)) continue
      seen.add(pid)
      out.push({
        part_id: pid,
        part_number: String(p.part_number),
        part_name_ar: (p.part_name_ar as string | null) ?? null
      })
    }
  }

  return out
}

export async function saveStopperExclusions(sourceBomItemId: string, excludedPartIds: string[]): Promise<void> {
  const { error: delErr } = await client()
    .from('bom_stopper_exclusions')
    .delete()
    .eq('source_bom_item_id', sourceBomItemId)

  if (delErr) {
    if (delErr.code === '42P01' || delErr.message.includes('bom_stopper_exclusions')) return
    throw new Error(delErr.message)
  }

  const unique = [...new Set(excludedPartIds.filter(Boolean))]
  if (unique.length === 0) return

  const { error } = await client().from('bom_stopper_exclusions').insert(
    unique.map(partId => ({
      source_bom_item_id: sourceBomItemId,
      excluded_part_id: partId
    }))
  )
  if (error) throw new Error(error.message)
}

async function loadExplicitExclusions(itemId: string): Promise<StopperExcludedPart[]> {
  const { data: links, error } = await client()
    .from('bom_stopper_exclusions')
    .select('excluded_bom_item_id, excluded_part_id')
    .eq('source_bom_item_id', itemId)

  if (error) {
    if (error.code === '42P01' || error.message.includes('bom_stopper_exclusions')) return []
    throw new Error(error.message)
  }

  const bomIds = (links ?? []).map(r => r.excluded_bom_item_id as string | null).filter(Boolean) as string[]
  const partIds = (links ?? []).map(r => r.excluded_part_id as string | null).filter(Boolean) as string[]

  const out: StopperExcludedPart[] = []

  if (bomIds.length > 0) {
    const { data: rows, error: bomErr } = await client()
      .from('v_bom_items_detail')
      .select('part_number, part_name_ar, station_code_text')
      .in('id', bomIds)
    if (bomErr) throw new Error(bomErr.message)
    for (const r of rows ?? []) {
      out.push({
        part_number: String(r.part_number),
        part_name_ar: (r.part_name_ar as string | null) ?? null,
        station_code: (r.station_code_text as string | null) ?? null,
        source: 'explicit'
      })
    }
  }

  if (partIds.length > 0) {
    const { data: parts, error: partErr } = await client()
      .from('parts')
      .select('part_number, part_name_ar')
      .in('id', partIds)
    if (partErr) throw new Error(partErr.message)
    for (const p of parts ?? []) {
      out.push({
        part_number: String(p.part_number),
        part_name_ar: (p.part_name_ar as string | null) ?? null,
        station_code: null,
        source: 'explicit'
      })
    }
  }

  return out
}

function downstreamExclusions(item: BomItemDetail, candidates: BomItemDetail[]): StopperExcludedPart[] {
  const stopper = effectiveBomStopperType(item)
  if (stopper === 'non_stopper') return []

  const mySort = item.station_sort_order ?? 0
  const out: StopperExcludedPart[] = []

  for (const other of candidates) {
    if (other.id === item.id) continue
    if (!bomModelsOverlap(item, other)) continue

    const otherSort = other.station_sort_order ?? 0
    const isDownstream =
      stopper === 'line_stopper' ? otherSort > mySort : otherSort >= mySort && other.id !== item.id

    if (!isDownstream) continue

    out.push({
      part_number: other.part_number,
      part_name_ar: other.part_name_ar ?? other.part_name ?? null,
      station_code: other.station_code_text || other.station_number || null,
      source: 'downstream'
    })
  }

  const seen = new Set<string>()
  return out.filter(p => {
    const key = p.part_number.trim().toUpperCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function getStopperExclusions(item: BomItemDetail): Promise<StopperExclusionResult> {
  const stopperType = effectiveBomStopperType(item)
  const zoningNote = item.operation_zoning_constraints?.trim() || null

  if (stopperType === 'non_stopper') {
    return { stopperType, exclusions: [], zoningNote }
  }

  const explicit = await loadExplicitExclusions(item.id)
  if (explicit.length > 0) {
    return { stopperType, exclusions: explicit, zoningNote }
  }

  const { data, error } = await client()
    .from('v_bom_items_detail')
    .select(
      'id, part_number, part_name, part_name_ar, station_code_text, station_number, station_sort_order, vehicle_model_name, applicable_models_text'
    )
    .limit(5000)

  if (error) throw new Error(error.message)

  const exclusions = downstreamExclusions(item, (data ?? []) as BomItemDetail[])
  return { stopperType, exclusions, zoningNote }
}
