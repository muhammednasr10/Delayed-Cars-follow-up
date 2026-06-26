import { supabase } from '../lib/supabase'
import type { MpLookupOption } from '../Types/mpLookup'

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

type Row = {
  id: string
  code: string
  label_ar: string
  label_en: string
  sort_order: number
  is_active: boolean
}

function mapRow(row: Row): MpLookupOption {
  return {
    id: row.id,
    code: row.code,
    labelAr: row.label_ar,
    labelEn: row.label_en,
    sortOrder: row.sort_order,
    isActive: row.is_active
  }
}

function slugCode(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return base || `opt_${Date.now()}`
}

export async function getDpReasonOptions(activeOnly = true): Promise<MpLookupOption[]> {
  let q = requireClient().from('dp_damage_reason_options').select('*').order('sort_order').order('label_ar')
  if (activeOnly) q = q.eq('is_active', true)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data as Row[]).map(mapRow)
}

export async function getDpDecisionOptions(activeOnly = true): Promise<MpLookupOption[]> {
  let q = requireClient().from('dp_final_decision_options').select('*').order('sort_order').order('label_ar')
  if (activeOnly) q = q.eq('is_active', true)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data as Row[]).map(mapRow)
}

export async function createDpReasonOption(input: {
  code?: string
  label_ar: string
  label_en: string
  sort_order?: number
}): Promise<MpLookupOption> {
  const code = (input.code?.trim() || slugCode(input.label_en || input.label_ar)).toLowerCase()
  const { data, error } = await requireClient()
    .from('dp_damage_reason_options')
    .insert({
      code,
      label_ar: input.label_ar.trim(),
      label_en: input.label_en.trim(),
      sort_order: input.sort_order ?? 0,
      is_active: true
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapRow(data as Row)
}

export async function createDpDecisionOption(input: {
  code?: string
  label_ar: string
  label_en: string
  sort_order?: number
}): Promise<MpLookupOption> {
  const code = (input.code?.trim() || slugCode(input.label_en || input.label_ar)).toLowerCase()
  const { data, error } = await requireClient()
    .from('dp_final_decision_options')
    .insert({
      code,
      label_ar: input.label_ar.trim(),
      label_en: input.label_en.trim(),
      sort_order: input.sort_order ?? 0,
      is_active: true
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapRow(data as Row)
}
