import { supabase } from '../lib/supabase'
import type { ProductionLineStop, ProductionLineStopInput } from '../Types/productionStop'

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

type Row = {
  id: string
  stop_reason: string
  started_at: string
  ended_at: string
  department: string
  lost_vehicles: number
  notes: string | null
  created_at: string
  updated_at: string
}

function mapRow(row: Row): ProductionLineStop {
  return {
    id: row.id,
    stopReason: row.stop_reason,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    department: row.department,
    lostVehicles: row.lost_vehicles,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function toPayload(input: ProductionLineStopInput) {
  return {
    stop_reason: input.stopReason.trim(),
    started_at: input.startedAt,
    ended_at: input.endedAt,
    department: input.department,
    lost_vehicles: Math.max(0, Math.floor(input.lostVehicles)),
    notes: input.notes?.trim() || null
  }
}

export async function getProductionLineStops(year?: number, month?: number): Promise<ProductionLineStop[]> {
  let query = requireClient().from('production_line_stops').select('*').order('started_at', { ascending: false })

  if (year && month) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const endMonth = month === 12 ? 1 : month + 1
    const endYear = month === 12 ? year + 1 : year
    const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01`
    query = query.gte('started_at', start).lt('started_at', end)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return ((data ?? []) as Row[]).map(mapRow)
}

export async function createProductionLineStop(input: ProductionLineStopInput): Promise<ProductionLineStop> {
  const { data, error } = await requireClient().from('production_line_stops').insert(toPayload(input)).select('*').single()
  if (error) throw new Error(error.message)
  return mapRow(data as Row)
}

export async function updateProductionLineStop(id: string, input: ProductionLineStopInput): Promise<ProductionLineStop> {
  const { data, error } = await requireClient().from('production_line_stops').update(toPayload(input)).eq('id', id).select('*').single()
  if (error) throw new Error(error.message)
  return mapRow(data as Row)
}

export async function deleteProductionLineStop(id: string): Promise<void> {
  const { error } = await requireClient().from('production_line_stops').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export function stopDurationMinutes(startedAt: string, endedAt: string): number {
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  if (!Number.isFinite(ms) || ms <= 0) return 0
  return Math.round(ms / 60_000)
}

/** Per-day stop downtime (minutes) and lost vehicles from the line-stops log. */
export function aggregateStopsByDate(
  stops: { startedAt: string; endedAt: string; lostVehicles: number }[]
): { minutesByDate: Map<string, number>; lostVehiclesByDate: Map<string, number> } {
  const minutesByDate = new Map<string, number>()
  const lostVehiclesByDate = new Map<string, number>()
  for (const stop of stops) {
    const date = stop.startedAt.slice(0, 10)
    const minutes = stopDurationMinutes(stop.startedAt, stop.endedAt)
    minutesByDate.set(date, (minutesByDate.get(date) ?? 0) + minutes)
    lostVehiclesByDate.set(date, (lostVehiclesByDate.get(date) ?? 0) + stop.lostVehicles)
  }
  return { minutesByDate, lostVehiclesByDate }
}

/** @deprecated Use aggregateStopsByDate — hours kept for legacy snapshots */
export function sumStopDowntimeHoursByDate(
  stops: { startedAt: string; endedAt: string }[]
): Map<string, number> {
  const map = new Map<string, number>()
  for (const stop of stops) {
    const date = stop.startedAt.slice(0, 10)
    const hours = stopDurationMinutes(stop.startedAt, stop.endedAt) / 60
    map.set(date, (map.get(date) ?? 0) + hours)
  }
  return map
}

export function sumStopLostVehiclesByDate(
  stops: { startedAt: string; lostVehicles: number }[]
): Map<string, number> {
  const map = new Map<string, number>()
  for (const stop of stops) {
    const date = stop.startedAt.slice(0, 10)
    map.set(date, (map.get(date) ?? 0) + stop.lostVehicles)
  }
  return map
}
