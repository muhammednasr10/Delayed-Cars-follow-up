import { supabase } from '../lib/supabase'
import type { Part, BomItemDetail } from '../Types/bom'
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

export async function updatePartNotes(partId: string, notes: string): Promise<void> {
  const { error } = await client().from('parts').update({ notes: notes.trim() || null }).eq('id', partId)
  if (error) throw new Error(error.message)
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
