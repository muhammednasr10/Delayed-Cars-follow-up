import { supabase } from '../lib/supabase'
import type { TrainingLevel } from '../Types/enums'
import type { EmployeeStationLevel } from '../Types/training'

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

export async function setEmployeeStationLevel(
  employeeId: string,
  stationId: string,
  levelTrack: number,
  level: TrainingLevel | null
): Promise<void> {
  if (levelTrack < 1 || levelTrack > 4) throw new Error('Invalid level track')

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
