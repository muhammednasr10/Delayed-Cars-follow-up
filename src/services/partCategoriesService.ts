import { supabase } from '../lib/supabase'
import type { PartCategory } from '../Types/bom'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export async function getPartCategories(): Promise<PartCategory[]> {
  const { data, error } = await client().from('part_categories').select('*').eq('is_active', true).order('category_name_ar')
  if (error) throw new Error(error.message)
  return (data ?? []) as PartCategory[]
}

export async function getPartCategoriesWithCounts(): Promise<PartCategory[]> {
  const cats = await getPartCategories()
  const { data: parts } = await client().from('parts').select('category_id').eq('is_active', true)
  const counts = new Map<string, number>()
  ;(parts ?? []).forEach(p => {
    if (p.category_id) counts.set(p.category_id as string, (counts.get(p.category_id as string) ?? 0) + 1)
  })
  return cats.map(c => ({ ...c, part_count: counts.get(c.id) ?? 0 }))
}

export async function createPartCategory(input: {
  category_code: string
  category_name_ar: string
  category_name_en?: string
  description?: string
}): Promise<PartCategory> {
  const { data, error } = await client()
    .from('part_categories')
    .insert({
      category_code: input.category_code.trim().toUpperCase(),
      category_name_ar: input.category_name_ar.trim(),
      category_name_en: input.category_name_en?.trim() || null,
      description: input.description?.trim() || null
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as PartCategory
}

export async function updatePartCategory(
  id: string,
  input: Partial<{ category_name_ar: string; category_name_en: string; description: string; is_active: boolean }>
): Promise<void> {
  const { error } = await client().from('part_categories').update(input).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getCategoryIdByCode(codes: Map<string, string>): Promise<Map<string, string>> {
  const { data } = await client().from('part_categories').select('id, category_code')
  const m = new Map<string, string>()
  ;(data ?? []).forEach(r => m.set(String(r.category_code).toUpperCase(), r.id as string))
  return m
}
