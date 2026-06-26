import { supabase } from '../lib/supabase'
import type { EntryProductivityDay, EntryProductivityDayInput } from '../Types/entryProductivity'
import type { VehicleModel } from '../Types/settings'
import type { VehicleOverview } from '../Types/vehicle'

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

export function listDatesInMonth(year: number, month: number): string[] {
  const last = new Date(year, month, 0).getDate()
  const dates: string[] = []
  for (let day = 1; day <= last; day++) {
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
  }
  return dates
}

export function buildVariantToFamilyMap(models: VehicleModel[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const model of models) {
    if (model.model_kind === 'family') map.set(model.id, model.id)
  }
  for (const model of models) {
    if (model.parent_model_id && map.has(model.parent_model_id)) {
      map.set(model.id, model.parent_model_id)
    }
  }
  return map
}

export function productivityModelRows(models: VehicleModel[]): VehicleModel[] {
  return models
    .filter(m => m.is_active && m.model_kind === 'family')
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
}

export function modelDisplayLabel(model: VehicleModel): string {
  if (model.model_kind === 'family') return model.name
  if (model.parent_name && model.parent_name !== model.name) {
    return `${model.parent_name} — ${model.name}`
  }
  return model.name
}

export type ModelColumn = {
  kind: 'family'
  familyId: string
  label: string
  model: VehicleModel
}

export function buildModelColumns(models: VehicleModel[]): ModelColumn[] {
  return productivityModelRows(models).map(model => ({
    kind: 'family',
    familyId: model.id,
    label: model.name,
    model
  }))
}

export function sumVariantsForDay(
  grid: Map<string, number>,
  modelIds: string[],
  workDate: string
): number {
  return modelIds.reduce((sum, modelId) => sum + (grid.get(`${modelId}|${workDate}`) ?? 0), 0)
}

export function sumVariantForMonth(
  grid: Map<string, number>,
  modelId: string,
  dates: string[]
): number {
  return dates.reduce((sum, workDate) => sum + (grid.get(`${modelId}|${workDate}`) ?? 0), 0)
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

export async function getEntryProductivityMonth(year: number, month: number): Promise<EntryProductivityDay[]> {
  const { start, end } = monthBounds(year, month)
  const { data, error } = await requireClient()
    .from('entry_productivity_daily')
    .select('*')
    .gte('work_date', start)
    .lte('work_date', end)
    .order('work_date')

  if (error) throw new Error(error.message)
  return (data ?? []).map(r => mapDay(r as DayRow))
}

export async function bulkUpsertEntryProductivity(inputs: EntryProductivityDayInput[]): Promise<void> {
  if (inputs.length === 0) return
  const { error } = await requireClient()
    .from('entry_productivity_daily')
    .upsert(inputs.map(toPayload), { onConflict: 'model_id,work_date' })
  if (error) throw new Error(error.message)
}

export function buildMonthGrid(
  models: VehicleModel[],
  year: number,
  month: number,
  records: EntryProductivityDay[]
): Map<string, number> {
  const grid = new Map<string, number>()
  const dates = listDatesInMonth(year, month)
  const modelRows = productivityModelRows(models)
  const variantToFamily = buildVariantToFamilyMap(models)
  for (const model of modelRows) {
    for (const workDate of dates) {
      grid.set(`${model.id}|${workDate}`, 0)
    }
  }
  for (const record of records) {
    const familyId = variantToFamily.get(record.modelId) ?? record.modelId
    if (!modelRows.some(m => m.id === familyId)) continue
    const key = `${familyId}|${record.workDate}`
    grid.set(key, (grid.get(key) ?? 0) + record.quantity)
  }
  return grid
}

export function tallyVehiclesByModelDay(
  vehicles: VehicleOverview[],
  year: number,
  month: number
): Map<string, number> {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  const grid = new Map<string, number>()
  for (const vehicle of vehicles) {
    if (!vehicle.modelId || !vehicle.createdAt) continue
    const workDate = vehicle.createdAt.slice(0, 10)
    if (!workDate.startsWith(prefix)) continue
    const key = `${vehicle.modelId}|${workDate}`
    grid.set(key, (grid.get(key) ?? 0) + 1)
  }
  return grid
}

export function tallyVehiclesByFamilyDay(
  vehicles: VehicleOverview[],
  models: VehicleModel[],
  year: number,
  month: number
): Map<string, number> {
  const variantToFamily = buildVariantToFamilyMap(models)
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  const grid = new Map<string, number>()
  for (const vehicle of vehicles) {
    if (!vehicle.modelId || !vehicle.createdAt) continue
    const familyId = variantToFamily.get(vehicle.modelId)
    if (!familyId) continue
    const workDate = vehicle.createdAt.slice(0, 10)
    if (!workDate.startsWith(prefix)) continue
    const key = `${familyId}|${workDate}`
    grid.set(key, (grid.get(key) ?? 0) + 1)
  }
  return grid
}

export function gridToInputs(
  models: VehicleModel[],
  year: number,
  month: number,
  grid: Map<string, number>
): EntryProductivityDayInput[] {
  const inputs: EntryProductivityDayInput[] = []
  const modelRows = productivityModelRows(models)
  const dates = listDatesInMonth(year, month)
  for (const model of modelRows) {
    for (const workDate of dates) {
      const quantity = grid.get(`${model.id}|${workDate}`) ?? 0
      if (quantity > 0) {
        inputs.push({ modelId: model.id, workDate, quantity })
      }
    }
  }
  return inputs
}
