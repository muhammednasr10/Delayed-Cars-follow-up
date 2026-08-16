import { supabase } from '../lib/supabase'
import type { MissingPartWorkflowRequest } from '../Types/missingPartWorkflow'

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

function missingFnError(error: { message: string }): boolean {
  return error.message.includes('Could not find the function') || error.message.includes('schema cache')
}

const APPLY_HINT = 'دالة اعتماد الترحيل غير مفعّلة على Supabase. نفّذ supabase/migrations/0150_missing_part_workflow_requests.sql'

type Row = {
  id: string
  kind: MissingPartWorkflowRequest['kind']
  status: MissingPartWorkflowRequest['status']
  missing_part_id: string | null
  vehicle_id: string
  from_station_id: string | null
  to_station_id: string | null
  requested_by: string | null
  requested_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  vin: string
  model_name: string | null
  part_description: string | null
  from_station_number: string | null
  from_station_name: string | null
  to_station_number: string | null
  to_station_name: string | null
  requested_by_name: string | null
  reviewed_by_name: string | null
}

function mapRow(row: Row): MissingPartWorkflowRequest {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    missingPartId: row.missing_part_id,
    vehicleId: row.vehicle_id,
    fromStationId: row.from_station_id,
    toStationId: row.to_station_id,
    requestedBy: row.requested_by,
    requestedAt: row.requested_at,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
    vin: row.vin,
    modelName: row.model_name ?? '',
    partDescription: row.part_description,
    fromStationNumber: row.from_station_number,
    fromStationName: row.from_station_name,
    toStationNumber: row.to_station_number,
    toStationName: row.to_station_name,
    requestedByName: row.requested_by_name,
    reviewedByName: row.reviewed_by_name
  }
}

export async function requestMissingPartTransfer(missingPartId: string, toStationId: string): Promise<void> {
  const { error } = await requireClient().rpc('request_missing_part_transfer', {
    p_missing_part_id: missingPartId,
    p_to_station_id: toStationId
  })
  if (!error) return
  if (missingFnError(error)) throw new Error(APPLY_HINT)
  throw new Error(error.message)
}

export async function requestVehicleShortageRestore(vehicleId: string): Promise<void> {
  const { error } = await requireClient().rpc('request_vehicle_shortage_restore', {
    p_vehicle_id: vehicleId
  })
  if (!error) return
  if (missingFnError(error)) throw new Error(APPLY_HINT)
  throw new Error(error.message)
}

export async function listMissingPartWorkflowRequests(
  status: MissingPartWorkflowRequest['status'] = 'pending'
): Promise<MissingPartWorkflowRequest[]> {
  const { data, error } = await requireClient()
    .from('v_missing_part_workflow_requests')
    .select('*')
    .eq('status', status)
    .order('requested_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map(row => mapRow(row as Row))
}

export async function reviewMissingPartWorkflowRequest(
  requestId: string,
  approve: boolean,
  note?: string
): Promise<void> {
  const { error } = await requireClient().rpc('review_missing_part_workflow_request', {
    p_id: requestId,
    p_approve: approve,
    p_note: note?.trim() || null
  })
  if (!error) return
  if (missingFnError(error)) throw new Error(APPLY_HINT)
  throw new Error(error.message)
}
