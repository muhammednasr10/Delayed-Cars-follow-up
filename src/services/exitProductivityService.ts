import { supabase } from '../lib/supabase'
import type { EntryProductivityDay, EntryProductivityDayInput } from '../Types/entryProductivity'
import type { VehicleOverview } from '../Types/vehicle'
import type { VehicleModel } from '../Types/settings'
import {
  buildMonthGrid,
  buildVariantToFamilyMap,
  gridToInputs
} from './entryProductivityService'

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

export async function getExitProductivityMonth(year: number, month: number): Promise<EntryProductivityDay[]> {
  const { start, end } = monthBounds(year, month)
  const { data, error } = await requireClient()
    .from('exit_productivity_daily')
    .select('*')
    .gte('work_date', start)
    .lte('work_date', end)
    .order('work_date')

  if (error) throw new Error(error.message)
  return (data ?? []).map(r => mapDay(r as DayRow))
}

export async function bulkUpsertExitProductivity(inputs: EntryProductivityDayInput[]): Promise<void> {
  if (inputs.length === 0) return
  const { error } = await requireClient()
    .from('exit_productivity_daily')
    .upsert(inputs.map(toPayload), { onConflict: 'model_id,work_date' })
  if (error) throw new Error(error.message)
}

export function buildExitMonthGrid(
  models: VehicleModel[],
  year: number,
  month: number,
  records: EntryProductivityDay[]
): Map<string, number> {
  return buildMonthGrid(models, year, month, records)
}

export function exitGridToInputs(
  models: VehicleModel[],
  year: number,
  month: number,
  grid: Map<string, number>
): EntryProductivityDayInput[] {
  return gridToInputs(models, year, month, grid)
}

export function tallyDeliveredByFamilyDay(
  vehicles: VehicleOverview[],
  models: VehicleModel[],
  year: number,
  month: number
): Map<string, number> {
  const variantToFamily = buildVariantToFamilyMap(models)
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  const grid = new Map<string, number>()
  for (const vehicle of vehicles) {
    if (!vehicle.modelId || vehicle.deliveryStatus !== 'delivered') continue
    const familyId = variantToFamily.get(vehicle.modelId)
    if (!familyId) continue
    const workDate = vehicle.updatedAt.slice(0, 10)
    if (!workDate.startsWith(prefix)) continue
    const key = `${familyId}|${workDate}`
    grid.set(key, (grid.get(key) ?? 0) + 1)
  }
  return grid
}

// Re-export shared grid helpers for exit monthly tab
export {
  buildModelColumns,
  buildVariantToFamilyMap,
  listDatesInMonth,
  productivityModelRows,
  sumVariantForMonth,
  sumVariantsForDay,
  type ModelColumn
} from './entryProductivityService'
