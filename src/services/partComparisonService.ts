import { supabase } from '../lib/supabase'
import type { PartNumberComparison } from '../Types/bom'
import { normalizePartNumber, excelComparisonStatusToDb } from '../Utils/partNumberNormalize'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export type ComparisonFilters = {
  search?: string
  status?: string
  duplicatesOnly?: boolean
  page?: number
  pageSize?: number
}

export async function getPartComparisons(filters: ComparisonFilters = {}): Promise<{
  items: PartNumberComparison[]
  total: number
}> {
  const page = filters.page ?? 1
  const pageSize = Math.min(filters.pageSize ?? 50, 200)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let q = client().from('part_number_comparisons').select('*', { count: 'exact' })

  if (filters.search?.trim()) {
    const norm = normalizePartNumber(filters.search)
    const s = `%${filters.search.trim()}%`
    q = q.or(`part_number.ilike.${s},normalized_part_number.ilike.%${norm}%`)
  }
  if (filters.status) q = q.eq('comparison_status', filters.status)
  if (filters.duplicatesOnly) q = q.in('comparison_status', ['duplicate', 'possible_duplicate'])

  const { data, error, count } = await q.order('occurrence_count', { ascending: false }).range(from, to)
  if (error) throw new Error(error.message)
  return { items: (data ?? []) as PartNumberComparison[], total: count ?? 0 }
}

/** Rebuild comparison table from active bom_items + parts */
export async function refreshPartNumberComparisons(): Promise<number> {
  const { data: rows, error } = await client()
    .from('bom_items')
    .select(
      'part_id, part_number, quantity, model_family, applicable_models_text, station_code_text, parts(normalized_part_number, part_number), vehicle_models(name)'
    )
    .eq('is_active', true)
    .limit(20000)

  if (error) throw new Error(error.message)

  type Agg = {
    part_number: string
    normalized: string
    count: number
    stations: Set<string>
    families: Set<string>
    models: Set<string>
    originals: Set<string>
  }

  const map = new Map<string, Agg>()

  for (const row of rows ?? []) {
    const p = row.parts as { normalized_part_number?: string; part_number?: string } | null
    const norm = p?.normalized_part_number ?? normalizePartNumber(String(row.part_number))
    const display = p?.part_number ?? String(row.part_number)
    let agg = map.get(norm)
    if (!agg) {
      agg = {
        part_number: display,
        normalized: norm,
        count: 0,
        stations: new Set(),
        families: new Set(),
        models: new Set(),
        originals: new Set()
      }
      map.set(norm, agg)
    }
    agg.count++
    agg.originals.add(display)
    if (row.station_code_text) agg.stations.add(String(row.station_code_text))
    if (row.model_family) agg.families.add(String(row.model_family))
    const vm = row.vehicle_models as { name?: string } | null
    if (vm?.name) agg.models.add(vm.name)
    if (row.applicable_models_text) {
      String(row.applicable_models_text)
        .split(',')
        .forEach(m => agg!.models.add(m.trim()))
    }
  }

  await client().from('part_number_comparisons').delete().not('normalized_part_number', 'is', null)

  const inserts = [...map.values()].map(agg => {
    let status = 'unique'
    if (agg.count > 1 || agg.stations.size > 1) status = 'duplicate'
    if (agg.originals.size > 1) status = 'possible_duplicate'
    return {
      part_number: agg.part_number,
      normalized_part_number: agg.normalized,
      occurrence_count: agg.count,
      station_count: agg.stations.size,
      model_count: agg.models.size,
      first_station: [...agg.stations][0] ?? null,
      stations: [...agg.stations].sort().join(', '),
      model_families: [...agg.families].sort().join(', '),
      models: [...agg.models].sort().join(', '),
      comparison_status: status
    }
  })

  const CHUNK = 200
  for (let i = 0; i < inserts.length; i += CHUNK) {
    const { error: insErr } = await client().from('part_number_comparisons').insert(inserts.slice(i, i + CHUNK))
    if (insErr) throw new Error(insErr.message)
  }

  return inserts.length
}

export async function importComparisonSheetRows(
  rows: { part_number: string; normalized?: string; occurrences?: number; status?: string; stations?: string; models?: string }[]
): Promise<void> {
  const payload = rows.map(r => ({
    part_number: r.part_number,
    normalized_part_number: r.normalized ? normalizePartNumber(r.normalized) : normalizePartNumber(r.part_number),
    occurrence_count: r.occurrences ?? 1,
    stations: r.stations ?? null,
    comparison_status: r.status ? excelComparisonStatusToDb(r.status) : 'needs_review'
  }))
  for (let i = 0; i < payload.length; i += 200) {
    await client()
      .from('part_number_comparisons')
      .upsert(payload.slice(i, i + 200), { onConflict: 'normalized_part_number' })
  }
}
