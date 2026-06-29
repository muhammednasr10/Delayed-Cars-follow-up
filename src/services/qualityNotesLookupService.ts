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
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '_')
    .replace(/^_|_$/g, '')
  return base || `qn_${Date.now()}`
}

export async function getQnCategoryOptions(activeOnly = true): Promise<MpLookupOption[]> {
  let q = requireClient().from('qn_category_options').select('*').order('sort_order').order('label_ar')
  if (activeOnly) q = q.eq('is_active', true)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data as Row[]).map(mapRow)
}

export async function createQnCategoryOption(labelAr: string, labelEn?: string): Promise<MpLookupOption> {
  const label_ar = labelAr.trim()
  const label_en = (labelEn?.trim() || label_ar).trim()
  const code = slugCode(label_en || label_ar)
  const { data, error } = await requireClient()
    .from('qn_category_options')
    .insert({
      code,
      label_ar,
      label_en,
      sort_order: 50,
      is_active: true
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapRow(data as Row)
}
