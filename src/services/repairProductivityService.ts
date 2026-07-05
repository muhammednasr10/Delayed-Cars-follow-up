import { supabase } from '../lib/supabase'
import type { EntryProductivityDay, EntryProductivityDayInput } from '../Types/entryProductivity'
import { buildMonthGrid, gridToInputs } from './entryProductivityService'

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

type DayRow = {
  id: string
  model_id: string
  work_date: string
  quantity: number
  notes: string | null
}

function mapDay(row: DayRow): EntryProductivityDay {
  return {
    id: row.id,
    modelId: row.model_id,
    workDate: row.work_date,
    quantity: row.quantity,
    notes: row.notes
  }
}

function toPayload(input: EntryProductivityDayInput): Record<string, unknown> {
  return {
    model_id: input.modelId,
    work_date: input.workDate,
    quantity: Math.max(0, input.quantity),
    notes: input.notes?.trim() || null
  }
}

export async function getRepairProductivityMonth(year: number, month: number): Promise<EntryProductivityDay[]> {
  const { start, end } = monthBounds(year, month)
  const { data, error } = await requireClient()
    .from('repair_productivity_daily')
    .select('*')
    .gte('work_date', start)
    .lte('work_date', end)
    .order('work_date')

  if (error) throw new Error(error.message)
  return (data ?? []).map(r => mapDay(r as DayRow))
}

export async function bulkUpsertRepairProductivity(inputs: EntryProductivityDayInput[]): Promise<void> {
  if (inputs.length === 0) return
  const { error } = await requireClient()
    .from('repair_productivity_daily')
    .upsert(inputs.map(toPayload), { onConflict: 'model_id,work_date' })
  if (error) throw new Error(error.message)
}

export function buildRepairMonthGrid(
  models: Parameters<typeof buildMonthGrid>[0],
  year: number,
  month: number,
  records: EntryProductivityDay[]
): Map<string, number> {
  return buildMonthGrid(models, year, month, records)
}

export function repairGridToInputs(
  models: Parameters<typeof gridToInputs>[0],
  year: number,
  month: number,
  grid: Map<string, number>
): EntryProductivityDayInput[] {
  return gridToInputs(models, year, month, grid)
}
