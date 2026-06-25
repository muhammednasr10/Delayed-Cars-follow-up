import { supabase } from '../lib/supabase'
import type { EntryProductivityDay } from '../Types/entryProductivity'
import type { PlanDayType, ProductionPlanWorkDayRow } from '../Types/productionPlanWorkDayDaily'
import { getEntryProductivityMonth } from './entryProductivityService'
import { getExitProductivityMonth } from './exitProductivityService'

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
  work_date: string
  day_type: PlanDayType
  planned_hours: number
  actual_hours: number
  total_stops: number
  notes: string | null
}

function mapRow(row: Row): ProductionPlanWorkDayRow {
  return {
    workDate: row.work_date,
    dayType: row.day_type,
    plannedHours: Number(row.planned_hours) || 0,
    actualHours: Number(row.actual_hours) || 0,
    totalStops: Number(row.total_stops) || 0,
    notes: row.notes
  }
}

function toPayload(row: ProductionPlanWorkDayRow): Record<string, unknown> {
  return {
    work_date: row.workDate,
    day_type: row.dayType,
    planned_hours: Math.max(0, row.plannedHours),
    actual_hours: Math.max(0, row.actualHours),
    total_stops: Math.max(0, row.totalStops),
    notes: row.notes?.trim() || null
  }
}

export function sumProductivityByDate(records: EntryProductivityDay[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const record of records) {
    map.set(record.workDate, (map.get(record.workDate) ?? 0) + record.quantity)
  }
  return map
}

export async function getProductionPlanWorkDaysMonth(year: number, month: number): Promise<ProductionPlanWorkDayRow[]> {
  const { start, end } = monthBounds(year, month)
  const { data, error } = await requireClient()
    .from('production_plan_work_days_daily')
    .select('work_date, day_type, planned_hours, actual_hours, total_stops, notes')
    .gte('work_date', start)
    .lte('work_date', end)
    .order('work_date')

  if (error) throw new Error(error.message)
  return (data ?? []).map(r => mapRow(r as Row))
}

export async function getMonthProductivityTotals(
  year: number,
  month: number
): Promise<{ entryByDate: Map<string, number>; exitByDate: Map<string, number> }> {
  const [entry, exit] = await Promise.all([
    getEntryProductivityMonth(year, month),
    getExitProductivityMonth(year, month)
  ])
  return {
    entryByDate: sumProductivityByDate(entry),
    exitByDate: sumProductivityByDate(exit)
  }
}

export async function bulkUpsertProductionPlanWorkDays(rows: ProductionPlanWorkDayRow[]): Promise<void> {
  if (rows.length === 0) return
  const { error } = await requireClient()
    .from('production_plan_work_days_daily')
    .upsert(rows.map(toPayload), { onConflict: 'work_date' })
  if (error) throw new Error(error.message)
}
