import { supabase } from '../lib/supabase'
import type { TrainingLevel } from '../Types/enums'
import type { EmployeeStationLevel } from '../Types/training'
import { MAX_STATION_LEVEL_TRACK } from '../Utils/stationWorkerTracks'

const WORK_LEVELS = new Set<TrainingLevel>(['level_1', 'level_2', 'level_3', 'level_4'])

function client() {
  if (!supabase) throw new Error('Supabase is not configured. Check .env')
  return supabase
}

type Row = {
  id: string
  employee_id: string
  station_id: string
  level_track: number
  level: TrainingLevel
}

function mapRow(r: Row): EmployeeStationLevel {
  return {
    id: r.id,
    employeeId: r.employee_id,
    stationId: r.station_id,
    levelTrack: r.level_track,
    level: r.level
  }
}

export async function getEmployeeStationLevels(): Promise<EmployeeStationLevel[]> {
  const { data, error } = await client()
    .from('employee_station_training_levels')
    .select('id, employee_id, station_id, level_track, level')
    .order('employee_id')
  if (error) throw new Error(error.message)
  return (data as Row[]).map(mapRow)
}

export async function countEmployeeLevelsOnTracks(
  stationId: string,
  tracks: number[]
): Promise<{ total: number; byTrack: { track: number; count: number }[] }> {
  const unique = [...new Set(tracks.filter(t => t >= 1 && t <= MAX_STATION_LEVEL_TRACK))]
  if (unique.length === 0) return { total: 0, byTrack: [] }

  const { data, error } = await client()
    .from('employee_station_training_levels')
    .select('level_track')
    .eq('station_id', stationId)
    .in('level_track', unique)
  if (error) throw new Error(error.message)

  const counts = new Map<number, number>()
  for (const row of data ?? []) {
    const track = Number((row as { level_track: number }).level_track)
    counts.set(track, (counts.get(track) ?? 0) + 1)
  }
  const byTrack = unique
    .map(track => ({ track, count: counts.get(track) ?? 0 }))
    .filter(row => row.count > 0)
  return { total: byTrack.reduce((sum, row) => sum + row.count, 0), byTrack }
}

export async function countEmployeeLevelsForStation(stationId: string): Promise<number> {
  const { count, error } = await client()
    .from('employee_station_training_levels')
    .select('*', { count: 'exact', head: true })
    .eq('station_id', stationId)
  if (error) throw new Error(error.message)
  return count ?? 0
}

/** Deletes training assignments on tracks above `keepThroughTrack` (e.g. keep 2 → remove L3+). */
export async function deleteEmployeeLevelsAboveTrack(
  stationId: string,
  keepThroughTrack: number
): Promise<number> {
  const { data, error } = await client()
    .from('employee_station_training_levels')
    .delete()
    .eq('station_id', stationId)
    .gt('level_track', keepThroughTrack)
    .select('id')
  if (error) throw new Error(error.message)
  return (data ?? []).length
}

export async function deleteEmployeeLevelsOnTracks(stationId: string, tracks: number[]): Promise<number> {
  const unique = [...new Set(tracks.filter(t => t >= 1 && t <= MAX_STATION_LEVEL_TRACK))]
  if (unique.length === 0) return 0
  const { data, error } = await client()
    .from('employee_station_training_levels')
    .delete()
    .eq('station_id', stationId)
    .in('level_track', unique)
    .select('id')
  if (error) throw new Error(error.message)
  return (data ?? []).length
}

export async function deleteEmployeeLevelsForStation(stationId: string): Promise<number> {
  const { data, error } = await client()
    .from('employee_station_training_levels')
    .delete()
    .eq('station_id', stationId)
    .select('id')
  if (error) throw new Error(error.message)
  return (data ?? []).length
}

export async function setEmployeeStationLevel(
  employeeId: string,
  stationId: string,
  levelTrack: number,
  level: TrainingLevel | null
): Promise<void> {
  if (levelTrack < 1 || levelTrack > MAX_STATION_LEVEL_TRACK) throw new Error('Invalid level track')

  if (level === null) {
    const { error } = await client()
      .from('employee_station_training_levels')
      .delete()
      .eq('employee_id', employeeId)
      .eq('station_id', stationId)
      .eq('level_track', levelTrack)
    if (error) throw new Error(error.message)
    return
  }
  if (!WORK_LEVELS.has(level)) throw new Error('Invalid training level')

  const { error } = await client()
    .from('employee_station_training_levels')
    .upsert(
      { employee_id: employeeId, station_id: stationId, level_track: levelTrack, level },
      { onConflict: 'employee_id,station_id,level_track' }
    )
  if (error) throw new Error(error.message)
}
