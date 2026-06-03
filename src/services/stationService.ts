import { supabase } from '../lib/supabase'
import type { Station } from '../Types/settings'

// Centralized station data access. Components/hooks should use this module
// instead of querying the `stations` table directly.
export { getStations, createStation, updateStation, deactivateStation, deleteStation } from './settingsService'

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured. Check .env')
  return supabase
}

// PostgREST `or` filters are comma/parenthesis separated, so strip those chars.
function sanitize(term: string): string {
  return term.replace(/[,()*%]/g, ' ').trim()
}

const STATION_COLUMNS =
  'id, station_number, station_name, work_area_id, line_name, responsible_department, responsible_person, is_active, work_areas(id, name)'

// Search active stations by name, code, or line.
export async function searchStations(term: string): Promise<Station[]> {
  const clean = sanitize(term)
  if (!clean) return []

  const pattern = `%${clean}%`
  const { data, error } = await requireClient()
    .from('stations')
    .select(STATION_COLUMNS)
    .eq('is_active', true)
    .or(`station_name.ilike.${pattern},station_number.ilike.${pattern},line_name.ilike.${pattern}`)
    .order('station_number')
    .limit(10)

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as Station[]
}

// Quick-create a station from a typed name (admins/authorized only). The typed
// text is used for both code and name; details can be enriched later in Settings.
export async function quickCreateStation(name: string): Promise<Station> {
  const value = name.trim()
  const { data, error } = await requireClient()
    .from('stations')
    .insert({ station_number: value, station_name: value, is_active: true })
    .select(STATION_COLUMNS)
    .single()

  if (error) throw new Error(error.message)
  return data as unknown as Station
}
