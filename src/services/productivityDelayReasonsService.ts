import { supabase } from '../lib/supabase'
import type {
  ProductivityDelayKind,
  ProductivityDelayReason,
  ProductivityDelayReasonInput
} from '../Types/productivityDelayReason'

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

function monthBounds(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const last = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { start, end }
}

type Row = {
  id: string
  work_date: string
  kind: ProductivityDelayKind
  reasons: string
}

function mapRow(row: Row): ProductivityDelayReason {
  return {
    id: row.id,
    workDate: row.work_date,
    kind: row.kind,
    reasons: row.reasons ?? ''
  }
}

export async function getProductivityDelayReasonsMonth(
  year: number,
  month: number,
  kind: ProductivityDelayKind
): Promise<ProductivityDelayReason[]> {
  const { start, end } = monthBounds(year, month)
  const { data, error } = await requireClient()
    .from('productivity_delay_reasons')
    .select('*')
    .eq('kind', kind)
    .gte('work_date', start)
    .lte('work_date', end)
    .order('work_date')

  if (error) throw new Error(error.message)
  return (data ?? []).map(r => mapRow(r as Row))
}

export async function upsertProductivityDelayReason(input: ProductivityDelayReasonInput): Promise<void> {
  const { error } = await requireClient()
    .from('productivity_delay_reasons')
    .upsert(
      {
        work_date: input.workDate,
        kind: input.kind,
        reasons: input.reasons.trim()
      },
      { onConflict: 'work_date,kind' }
    )

  if (error) throw new Error(error.message)
}
