import { supabase } from '../lib/supabase'
import { stationsForManpowerDaily } from '../Utils/stationManpowerGroups'
import type { StationManpowerDailyRow, StationManpowerHistoryEntry } from '../Types/stationManpowerDaily'
import type { Station } from '../Types/settings'

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

type Row = {
  id: string
  work_date: string
  station_id: string
  employee_id: string
  vehicle_model_id: string | null
  notes: string | null
}

type LabelRow = {
  station_id: string
  operations_summary: string | null
}

function mapRow(row: Row): StationManpowerDailyRow {
  return {
    id: row.id,
    workDate: row.work_date,
    stationId: row.station_id,
    employeeId: row.employee_id,
    vehicleModelId: row.vehicle_model_id,
    notes: row.notes
  }
}

function monthBounds(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const last = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { start, end }
}

function applyModelFilter<T extends { eq: Function; is: Function }>(
  query: T,
  vehicleModelId: string | null
): T {
  if (vehicleModelId) return query.eq('vehicle_model_id', vehicleModelId) as T
  return query.is('vehicle_model_id', null) as T
}

export async function getStationManpowerForDate(
  workDate: string,
  vehicleModelId: string | null = null
): Promise<StationManpowerDailyRow[]> {
  let query = requireClient()
    .from('station_manpower_daily')
    .select('id, work_date, station_id, employee_id, vehicle_model_id, notes')
    .eq('work_date', workDate)
  query = applyModelFilter(query, vehicleModelId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map(r => mapRow(r as Row))
}

export async function getAllStationManpowerForDate(workDate: string): Promise<StationManpowerDailyRow[]> {
  const { data, error } = await requireClient()
    .from('station_manpower_daily')
    .select('id, work_date, station_id, employee_id, vehicle_model_id, notes')
    .eq('work_date', workDate)

  if (error) throw new Error(error.message)
  return (data ?? []).map(r => mapRow(r as Row))
}

export type EmployeeDailyStationAssignment = {
  workDate: string
  stationId: string
  stationNumber: string
  stationName: string
  vehicleModelId: string | null
  vehicleModelName: string | null
}

export async function getEmployeeStationManpowerForDate(
  employeeId: string,
  workDate: string
): Promise<EmployeeDailyStationAssignment[]> {
  const { data, error } = await requireClient()
    .from('station_manpower_daily')
    .select(
      `
      work_date,
      station_id,
      vehicle_model_id,
      stations!inner(station_number, station_name),
      vehicle_models(name)
    `
    )
    .eq('work_date', workDate)
    .eq('employee_id', employeeId)

  if (error) throw new Error(error.message)

  return (data ?? []).flatMap(row => {
    const station = relOne(
      row.stations as { station_number: string; station_name: string } | { station_number: string; station_name: string }[] | null
    )
    if (!station) return []
    const model = relOne(row.vehicle_models as { name: string } | { name: string }[] | null)
    return [
      {
        workDate: row.work_date as string,
        stationId: row.station_id as string,
        stationNumber: station.station_number,
        stationName: station.station_name,
        vehicleModelId: (row.vehicle_model_id as string | null) ?? null,
        vehicleModelName: model?.name ?? null
      }
    ]
  })
}

/** صفوف توزيع موديل محدّد لمحطات معيّنة (للتحقق من تجاوز القالب العام). */
export async function getModelScopeManpowerForStations(
  workDate: string,
  stationIds: string[]
): Promise<StationManpowerDailyRow[]> {
  if (stationIds.length === 0) return []

  const { data, error } = await requireClient()
    .from('station_manpower_daily')
    .select('id, work_date, station_id, employee_id, vehicle_model_id, notes')
    .eq('work_date', workDate)
    .in('station_id', stationIds)
    .not('vehicle_model_id', 'is', null)

  if (error) throw new Error(error.message)
  return (data ?? []).map(r => mapRow(r as Row))
}

export async function getWorkerOperationLabels(
  workDate: string,
  vehicleModelId: string | null = null
): Promise<Map<string, string>> {
  let query = requireClient()
    .from('station_manpower_worker_labels')
    .select('station_id, operations_summary')
    .eq('work_date', workDate)
  query = applyModelFilter(query, vehicleModelId)

  const { data, error } = await query
  if (error) {
    if (error.message.includes('station_manpower_worker_labels')) return new Map()
    throw new Error(error.message)
  }

  const map = new Map<string, string>()
  for (const row of (data ?? []) as LabelRow[]) {
    map.set(row.station_id, row.operations_summary ?? '')
  }
  return map
}

export async function getAllWorkerOperationLabels(
  workDate: string
): Promise<{ general: Map<string, string>; byModel: Map<string, Map<string, string>> }> {
  const { data, error } = await requireClient()
    .from('station_manpower_worker_labels')
    .select('station_id, operations_summary, vehicle_model_id')
    .eq('work_date', workDate)

  if (error) {
    if (error.message.includes('station_manpower_worker_labels')) {
      return { general: new Map(), byModel: new Map() }
    }
    throw new Error(error.message)
  }

  const general = new Map<string, string>()
  const byModel = new Map<string, Map<string, string>>()
  for (const row of (data ?? []) as (LabelRow & { vehicle_model_id: string | null })[]) {
    const summary = row.operations_summary ?? ''
    if (row.vehicle_model_id) {
      const modelMap = byModel.get(row.vehicle_model_id) ?? new Map<string, string>()
      modelMap.set(row.station_id, summary)
      byModel.set(row.vehicle_model_id, modelMap)
    } else {
      general.set(row.station_id, summary)
    }
  }
  return { general, byModel }
}

export async function saveStationManpowerForDate(
  workDate: string,
  vehicleModelId: string | null,
  assignments: { stationId: string; employeeIds: string[] }[]
): Promise<void> {
  const client = requireClient()
  let deleteQuery = client.from('station_manpower_daily').delete().eq('work_date', workDate)
  deleteQuery = applyModelFilter(deleteQuery, vehicleModelId)
  const { error: delErr } = await deleteQuery
  if (delErr) throw new Error(delErr.message)

  const rows: Record<string, unknown>[] = []
  for (const item of assignments) {
    for (const employeeId of item.employeeIds) {
      if (!employeeId) continue
      rows.push({
        work_date: workDate,
        station_id: item.stationId,
        employee_id: employeeId,
        vehicle_model_id: vehicleModelId
      })
    }
  }
  if (rows.length === 0) return

  const { error } = await client.from('station_manpower_daily').insert(rows)
  if (error) throw new Error(error.message)
}

export async function saveModelStationManpowerOverrides(
  workDate: string,
  vehicleModelId: string,
  assignments: { stationId: string; employeeIds: string[] }[]
): Promise<void> {
  const client = requireClient()
  const { error: delErr } = await client
    .from('station_manpower_daily')
    .delete()
    .eq('work_date', workDate)
    .eq('vehicle_model_id', vehicleModelId)
  if (delErr) throw new Error(delErr.message)

  const rows: Record<string, unknown>[] = []
  for (const item of assignments) {
    for (const employeeId of item.employeeIds) {
      if (!employeeId) continue
      rows.push({
        work_date: workDate,
        station_id: item.stationId,
        employee_id: employeeId,
        vehicle_model_id: vehicleModelId
      })
    }
  }
  if (rows.length === 0) return

  const { error } = await client.from('station_manpower_daily').insert(rows)
  if (error) throw new Error(error.message)
}

export async function saveWorkerOperationLabels(
  workDate: string,
  vehicleModelId: string | null,
  updates: { stationId: string; summary: string | null }[]
): Promise<void> {
  const client = requireClient()
  let deleteQuery = client.from('station_manpower_worker_labels').delete().eq('work_date', workDate)
  deleteQuery = applyModelFilter(deleteQuery, vehicleModelId)
  const { error: delErr } = await deleteQuery
  if (delErr) {
    if (delErr.message.includes('station_manpower_worker_labels')) return
    throw new Error(delErr.message)
  }

  const rows = updates
    .filter(item => item.summary?.trim())
    .map(item => ({
      work_date: workDate,
      station_id: item.stationId,
      vehicle_model_id: vehicleModelId,
      operations_summary: item.summary!.trim()
    }))
  if (rows.length === 0) return

  const { error } = await client.from('station_manpower_worker_labels').insert(rows)
  if (error) throw new Error(error.message)
}

export async function saveModelWorkerOperationLabels(
  workDate: string,
  vehicleModelId: string,
  updates: { stationId: string; summary: string | null }[]
): Promise<void> {
  const client = requireClient()
  const { error: delErr } = await client
    .from('station_manpower_worker_labels')
    .delete()
    .eq('work_date', workDate)
    .eq('vehicle_model_id', vehicleModelId)
  if (delErr) {
    if (delErr.message.includes('station_manpower_worker_labels')) return
    throw new Error(delErr.message)
  }

  const rows = updates
    .filter(item => item.summary?.trim())
    .map(item => ({
      work_date: workDate,
      station_id: item.stationId,
      vehicle_model_id: vehicleModelId,
      operations_summary: item.summary!.trim()
    }))
  if (rows.length === 0) return

  const { error } = await client.from('station_manpower_worker_labels').insert(rows)
  if (error) throw new Error(error.message)
}

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export async function getStationManpowerHistory(year: number, month: number): Promise<StationManpowerHistoryEntry[]> {
  const { start, end } = monthBounds(year, month)
  const { data, error } = await requireClient()
    .from('station_manpower_daily')
    .select(
      `
      id,
      work_date,
      notes,
      stations!inner(station_number, station_name),
      employees!inner(employee_code, full_name)
    `
    )
    .gte('work_date', start)
    .lte('work_date', end)
    .order('work_date', { ascending: false })

  if (error) throw new Error(error.message)

  const entries = (data ?? []).flatMap(r => {
    const station = relOne(r.stations as { station_number: string; station_name: string } | { station_number: string; station_name: string }[] | null)
    const employee = relOne(r.employees as { employee_code: string; full_name: string } | { employee_code: string; full_name: string }[] | null)
    if (!station || !employee) return []
    return [{
      id: r.id as string,
      workDate: r.work_date as string,
      stationNumber: station.station_number,
      stationName: station.station_name,
      employeeCode: employee.employee_code,
      employeeName: employee.full_name,
      notes: (r.notes as string | null) ?? null
    }]
  })

  return entries.sort(
    (a, b) =>
      b.workDate.localeCompare(a.workDate) ||
      a.stationNumber.localeCompare(b.stationNumber, 'ar') ||
      a.employeeName.localeCompare(b.employeeName, 'ar')
  )
}

export function buildStationManpowerDayRows(
  stations: Station[],
  saved: StationManpowerDailyRow[],
  operationLabels: Map<string, string> = new Map()
): { stationId: string; stationNumber: string; stationName: string; operationsSummary: string; employeeIds: string[] }[] {
  const byStation = new Map<string, string[]>()
  for (const row of saved) {
    const list = byStation.get(row.stationId) ?? []
    list.push(row.employeeId)
    byStation.set(row.stationId, list)
  }

  return stationsForManpowerDaily(stations).map(station => ({
    stationId: station.id,
    stationNumber: station.station_number,
    stationName: station.station_name,
    operationsSummary: operationLabels.get(station.id) ?? '',
    employeeIds: byStation.get(station.id) ?? []
  }))
}
