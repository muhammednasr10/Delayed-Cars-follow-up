import type { BomDashboardStats } from '../Types/bom'
import { client } from './bomCrudService'

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

  const { data: byCat } = await client()
    .from('parts')
    .select('category_id, part_categories(category_name_ar)')
    .eq('is_active', true)
  const catMap = new Map<string, number>()
  ;(byCat ?? []).forEach(p => {
    const label = (p.part_categories as { category_name_ar?: string } | null)?.category_name_ar ?? 'غير مصنف'
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
