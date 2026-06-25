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

export function productivityModelRows(models: VehicleModel[]): VehicleModel[] {
  const active = models.filter(m => m.is_active)
  const variants = active.filter(m => m.model_kind === 'variant' || m.parent_model_id)
  const rows = variants.length > 0 ? variants : active
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, 'ar'))
}

export function modelDisplayLabel(model: VehicleModel): string {
  if (model.parent_name && model.parent_name !== model.name) {
    return `${model.parent_name} — ${model.name}`
  }
  return model.name
}

export type ModelColumn =
  | { kind: 'family'; familyId: string; label: string; variantIds: string[] }
  | { kind: 'variant'; model: VehicleModel; label: string }

export function buildModelColumns(models: VehicleModel[]): ModelColumn[] {
  const variants = productivityModelRows(models)
  const byFamily = new Map<string, VehicleModel[]>()
  const familyNames = new Map<string, string>()

  for (const variant of variants) {
    const familyId = variant.parent_model_id ?? variant.id
    const familyName = variant.parent_name ?? variant.name
    familyNames.set(familyId, familyName)
    const list = byFamily.get(familyId) ?? []
    list.push(variant)
    byFamily.set(familyId, list)
  }

  const columns: ModelColumn[] = []
  for (const [familyId, familyVariants] of [...byFamily.entries()].sort((a, b) =>
    (familyNames.get(a[0]) ?? '').localeCompare(familyNames.get(b[0]) ?? '', 'ar')
  )) {
    const sorted = [...familyVariants].sort((a, b) => a.name.localeCompare(b.name, 'ar'))
    columns.push({
      kind: 'family',
      familyId,
      label: familyNames.get(familyId) ?? '',
      variantIds: sorted.map(v => v.id)
    })
    for (const variant of sorted) {
      columns.push({ kind: 'variant', model: variant, label: variant.name })
    }
  }
  return columns
}

export function sumVariantsForDay(
  grid: Map<string, number>,
  variantIds: string[],
  workDate: string
): number {
  return variantIds.reduce((sum, modelId) => sum + (grid.get(`${modelId}|${workDate}`) ?? 0), 0)
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
  for (const model of modelRows) {
    for (const workDate of dates) {
      grid.set(`${model.id}|${workDate}`, 0)
    }
  }
  for (const record of records) {
    grid.set(`${record.modelId}|${record.workDate}`, record.quantity)
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
