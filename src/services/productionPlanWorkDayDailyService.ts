import { supabase } from '../lib/supabase'
import type { EntryProductivityDay } from '../Types/entryProductivity'
import type { PlanDayType, ProductionPlanWorkDayRow } from '../Types/productionPlanWorkDayDaily'
import { getEntryProductivityMonth } from './entryProductivityService'
import { getExitProductivityMonth } from './exitProductivityService'
import { getRepairProductivityMonth } from './repairProductivityService'
import { getVehicleModels } from './settingsService'
import type { VehicleModel } from '../Types/settings'

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
  work_despite_vacation?: boolean
  notes: string | null
}

function mapRow(row: Row): ProductionPlanWorkDayRow {
  const actualHours = Number(row.actual_hours) || 0
  const dayType = row.day_type
  const workDespiteVacation =
    Boolean(row.work_despite_vacation) ||
    ((dayType === 'vacation' || dayType === 'factory_vacation') && actualHours > 0)
  return {
    workDate: row.work_date,
    dayType,
    plannedHours: Number(row.planned_hours) || 0,
    actualHours,
    totalStops: Number(row.total_stops) || 0,
    workDespiteVacation,
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
    work_despite_vacation: Boolean(row.workDespiteVacation),
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

export async function getProductionPlanDayType(workDate: string): Promise<PlanDayType | null> {
  const { data, error } = await requireClient()
    .from('production_plan_work_days_daily')
    .select('day_type')
    .eq('work_date', workDate)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? (data.day_type as PlanDayType) : null
}

export async function getProductionPlanWorkDaysMonth(year: number, month: number): Promise<ProductionPlanWorkDayRow[]> {
  const { start, end } = monthBounds(year, month)
  const { data, error } = await requireClient()
    .from('production_plan_work_days_daily')
    .select('work_date, day_type, planned_hours, actual_hours, total_stops, work_despite_vacation, notes')
    .gte('work_date', start)
    .lte('work_date', end)
    .order('work_date')

  if (error) throw new Error(error.message)
  return (data ?? []).map(r => mapRow(r as Row))
}

export async function getMonthProductivityTotals(
  year: number,
  month: number
): Promise<{ entryByDate: Map<string, number>; exitByDate: Map<string, number>; repairByDate: Map<string, number> }> {
  const detail = await getMonthProductivityDetail(year, month)
  return {
    entryByDate: detail.entryByDate,
    exitByDate: detail.exitByDate,
    repairByDate: detail.repairByDate
  }
}

export async function getMonthProductivityDetail(year: number, month: number): Promise<{
  entryRecords: EntryProductivityDay[]
  exitRecords: EntryProductivityDay[]
  repairRecords: EntryProductivityDay[]
  models: VehicleModel[]
  entryByDate: Map<string, number>
  exitByDate: Map<string, number>
  repairByDate: Map<string, number>
}> {
  const [entryRecords, exitRecords, repairRecords, models] = await Promise.all([
    getEntryProductivityMonth(year, month),
    getExitProductivityMonth(year, month),
    getRepairProductivityMonth(year, month),
    getVehicleModels()
  ])
  return {
    entryRecords,
    exitRecords,
    repairRecords,
    models,
    entryByDate: sumProductivityByDate(entryRecords),
    exitByDate: sumProductivityByDate(exitRecords),
    repairByDate: sumProductivityByDate(repairRecords)
  }
}

export async function bulkUpsertProductionPlanWorkDays(rows: ProductionPlanWorkDayRow[]): Promise<void> {
  if (rows.length === 0) return
  const { error } = await requireClient()
    .from('production_plan_work_days_daily')
    .upsert(rows.map(toPayload), { onConflict: 'work_date' })
  if (error) throw new Error(error.message)
}
