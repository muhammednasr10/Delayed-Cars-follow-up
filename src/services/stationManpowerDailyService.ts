import { supabase } from '../lib/supabase'
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
  notes: string | null
}


function mapRow(row: Row): StationManpowerDailyRow {
  return {
    id: row.id,
    workDate: row.work_date,
    stationId: row.station_id,
    employeeId: row.employee_id,
    notes: row.notes
  }
}

function monthBounds(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const last = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { start, end }
}

export async function getStationManpowerForDate(workDate: string): Promise<StationManpowerDailyRow[]> {
  const { data, error } = await requireClient()
    .from('station_manpower_daily')
    .select('id, work_date, station_id, employee_id, notes')
    .eq('work_date', workDate)

  if (error) throw new Error(error.message)
  return (data ?? []).map(r => mapRow(r as Row))
}

export async function saveStationManpowerForDate(
  workDate: string,
  assignments: { stationId: string; employeeIds: string[] }[]
): Promise<void> {
  const client = requireClient()
  const { error: delErr } = await client.from('station_manpower_daily').delete().eq('work_date', workDate)
  if (delErr) throw new Error(delErr.message)

  const rows: Record<string, unknown>[] = []
  for (const item of assignments) {
    for (const employeeId of item.employeeIds) {
      if (!employeeId) continue
      rows.push({
        work_date: workDate,
        station_id: item.stationId,
        employee_id: employeeId
      })
    }
  }
  if (rows.length === 0) return

  const { error } = await client.from('station_manpower_daily').insert(rows)
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
  saved: StationManpowerDailyRow[]
): { stationId: string; stationNumber: string; stationName: string; laborSummary: string | null; employeeIds: string[] }[] {
  const byStation = new Map<string, string[]>()
  for (const row of saved) {
    const list = byStation.get(row.stationId) ?? []
    list.push(row.employeeId)
    byStation.set(row.stationId, list)
  }

  return [...stations]
    .filter(s => s.is_active)
    .sort((a, b) => {
      const ao = a.sort_order ?? 0
      const bo = b.sort_order ?? 0
      if (ao !== bo) return ao - bo
      return a.station_number.localeCompare(b.station_number, 'ar')
    })
    .map(station => ({
      stationId: station.id,
      stationNumber: station.station_number,
      stationName: station.station_name,
      laborSummary: station.worker1_operations_summary ?? null,
      employeeIds: byStation.get(station.id) ?? []
    }))
}
