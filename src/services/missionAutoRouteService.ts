import { supabase } from '../lib/supabase'
import type {
  CreateAutoRoutedMissionInput,
  MissionAutoRoute,
  MissionAutoRouteEvent,
  MissionAutoRouteInput
} from '../Types/missionAutoRoute'
import { MISSION_AUTO_ROUTE_EVENTS } from '../Types/missionAutoRoute'

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

type RouteRow = {
  event_type: MissionAutoRouteEvent
  assignee_employee_id: string | null
  enabled: boolean
  updated_at: string
  employees?:
    | { full_name: string; employee_code: string }
    | { full_name: string; employee_code: string }[]
    | null
}

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function mapRoute(row: RouteRow): MissionAutoRoute {
  const emp = relOne(row.employees)
  return {
    eventType: row.event_type,
    assigneeEmployeeId: row.assignee_employee_id,
    assigneeName: emp?.full_name ?? null,
    assigneeCode: emp?.employee_code ?? null,
    enabled: row.enabled,
    updatedAt: row.updated_at
  }
}

const EMPTY: MissionAutoRoute[] = MISSION_AUTO_ROUTE_EVENTS.map(eventType => ({
  eventType,
  assigneeEmployeeId: null,
  assigneeName: null,
  assigneeCode: null,
  enabled: true,
  updatedAt: new Date(0).toISOString()
}))

export async function listMissionAutoRoutes(): Promise<MissionAutoRoute[]> {
  const { data, error } = await requireClient()
    .from('mission_auto_routes')
    .select(
      'event_type, assignee_employee_id, enabled, updated_at, employees:employees!mission_auto_routes_assignee_employee_id_fkey(full_name, employee_code)'
    )
    .order('event_type')
  if (error) {
    const m = error.message.toLowerCase()
    if (m.includes('schema cache') || m.includes('does not exist') || m.includes('mission_auto_routes')) {
      return EMPTY
    }
    throw new Error(error.message)
  }
  const mapped = ((data ?? []) as RouteRow[]).map(mapRoute)
  const byType = new Map(mapped.map(r => [r.eventType, r]))
  return MISSION_AUTO_ROUTE_EVENTS.map(eventType => byType.get(eventType) ?? EMPTY.find(e => e.eventType === eventType)!)
}

export async function saveMissionAutoRoute(input: MissionAutoRouteInput): Promise<void> {
  const { error } = await requireClient()
    .from('mission_auto_routes')
    .upsert(
      {
        event_type: input.eventType,
        assignee_employee_id: input.assigneeEmployeeId || null,
        enabled: input.enabled,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'event_type' }
    )
  if (error) throw new Error(error.message)
}

/** Creates a fixed-route mission when a rule is configured. Never throws — source saves must not fail. */
export async function tryCreateAutoRoutedMission(
  input: CreateAutoRoutedMissionInput
): Promise<string | null> {
  try {
    const { data, error } = await requireClient().rpc('create_auto_routed_mission', {
      p_event_type: input.eventType,
      p_title: input.title,
      p_description: input.description ?? null,
      p_source_vehicle_id: input.sourceVehicleId ?? null,
      p_source_missing_part_id: input.sourceMissingPartId ?? null,
      p_source_scratch_id: input.sourceScratchId ?? null,
      p_source_damaged_part_id: input.sourceDamagedPartId ?? null,
      p_source_internal_quality_id: input.sourceInternalQualityId ?? null,
      p_source_quality_note_id: input.sourceQualityNoteId ?? null,
      p_source_vin: input.sourceVin ?? null,
      p_source_model_name: input.sourceModelName ?? null
    })
    if (error) {
      const m = error.message.toLowerCase()
      // Soft-miss only when the RPC is not installed yet — do not swallow other failures.
      const missingFn =
        error.code === 'PGRST202' ||
        error.code === '42883' ||
        ((m.includes('schema cache') || m.includes('could not find the function') || m.includes('does not exist')) &&
          m.includes('create_auto_routed_mission'))
      if (!missingFn) console.warn('tryCreateAutoRoutedMission', error.message)
      return null
    }
    return (data as string | null) ?? null
  } catch (e) {
    console.warn('tryCreateAutoRoutedMission', e)
    return null
  }
}
