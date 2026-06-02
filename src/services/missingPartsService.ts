import { supabase } from '../lib/supabase'
import type { MissingPartDetail, ReportMissingPartInput } from '../Types/missingPart'

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

type DetailRow = {
  id: string
  vehicle_id: string
  part_description: string
  required_qty: number | string
  installed_qty: number | string
  remaining_qty: number | string
  reason: MissingPartDetail['reason']
  department: MissingPartDetail['department']
  priority: MissingPartDetail['priority']
  status: MissingPartDetail['status']
  qc_approved: boolean
  is_dr_item: boolean
  notes: string | null
  vin: string
  model_name: string | null
  color_name: string | null
  color_hex: string | null
  station_number: string | null
  station_name: string | null
  created_by: string | null
  created_by_name: string | null
  created_by_email: string | null
  created_at: string
  updated_at: string
}

function mapDetail(row: DetailRow): MissingPartDetail {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    partDescription: row.part_description,
    requiredQty: Number(row.required_qty),
    installedQty: Number(row.installed_qty),
    remainingQty: Number(row.remaining_qty),
    reason: row.reason,
    department: row.department,
    priority: row.priority,
    status: row.status,
    qcApproved: row.qc_approved,
    isDrItem: row.is_dr_item,
    notes: row.notes,
    vin: row.vin,
    modelName: row.model_name ?? '',
    colorName: row.color_name,
    colorHex: row.color_hex,
    stationNumber: row.station_number,
    stationName: row.station_name,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export async function getMissingParts(): Promise<MissingPartDetail[]> {
  const { data, error } = await requireClient()
    .from('v_missing_parts_detail')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return ((data ?? []) as DetailRow[]).map(mapDetail)
}

// Atomic RPC: finds/creates the vehicle by VIN, then records the shortage.
export async function reportMissingPart(input: ReportMissingPartInput): Promise<string> {
  const { data, error } = await requireClient().rpc('report_missing_part', {
    p_vin: input.vin,
    p_model_id: input.modelId,
    p_part_description: input.partDescription,
    p_color_id: input.colorId || null,
    p_station_id: input.stationId || null,
    p_required_qty: input.requiredQty,
    p_reason: input.reason,
    p_department: input.department,
    p_priority: input.priority,
    p_is_dr_item: input.isDrItem,
    p_notes: input.notes || null
  })

  if (error) throw new Error(error.message)
  return data as string
}
