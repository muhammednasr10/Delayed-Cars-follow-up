import { supabase } from '../lib/supabase'
import type {
  MissingPartDetail,
  ReportMissingPartInput,
  ReportMissingPartsBatchInput,
  ReportMissingPartsBatchResult,
  UpdateMissingPartInput
} from '../Types/missingPart'

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
  stopper_type: MissingPartDetail['stopperType']
  notes: string | null
  vin: string
  model_name: string | null
  color_name: string | null
  color_hex: string | null
  station_number: string | null
  station_name: string | null
  station_line_name: string | null
  station_area: string | null
  station_department: MissingPartDetail['stationDepartment']
  station_person: string | null
  created_by: string | null
  created_by_name: string | null
  created_by_email: string | null
  created_at: string
  updated_at: string
  shortage_resolved_at: string | null
  report_group_id: string | null
  station_id: string | null
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
    stopperType: row.stopper_type ?? 'car_stopper',
    notes: row.notes,
    vin: row.vin,
    modelName: row.model_name ?? '',
    colorName: row.color_name,
    colorHex: row.color_hex,
    stationNumber: row.station_number,
    stationName: row.station_name,
    stationLineName: row.station_line_name,
    stationArea: row.station_area,
    stationDepartment: row.station_department,
    stationPerson: row.station_person,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    shortageResolvedAt: row.shortage_resolved_at,
    reportGroupId: row.report_group_id,
    stationId: row.station_id
  }
}

export async function updateMissingPartRecord(id: string, input: UpdateMissingPartInput): Promise<void> {
  const { error } = await requireClient().rpc('update_missing_part_record', {
    p_id: id,
    p_part_description: input.partDescription.trim(),
    p_required_qty: input.requiredQty,
    p_reason: input.reason,
    p_department: input.department,
    p_priority: input.priority,
    p_stopper_type: input.stopperType,
    p_notes: input.notes?.trim() || null
  })
  if (error) throw new Error(error.message)
}

export async function deleteMissingPartRecord(id: string): Promise<void> {
  const { error } = await requireClient().rpc('delete_missing_part_record', { p_id: id })
  if (error) throw new Error(error.message)
}

export async function completeVehicleShortage(vehicleId: string): Promise<void> {
  const { error } = await requireClient().rpc('complete_vehicle_shortage', { p_vehicle_id: vehicleId })
  if (error) throw new Error(error.message)
}

export async function getMissingParts(): Promise<MissingPartDetail[]> {
  const { data, error } = await requireClient()
    .from('v_missing_parts_detail')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return ((data ?? []) as DetailRow[]).map(mapDetail)
}

// Mark a part as installed (fully or by quantity). Does not archive the vehicle.
export async function installMissingPart(missingPartId: string, quantity: number): Promise<void> {
  const { error } = await requireClient().rpc('install_part', {
    p_missing_part_id: missingPartId,
    p_quantity: quantity
  })
  if (error) throw new Error(error.message)
}

/** Set installed qty to required for all open lines on the given vehicles. */
export async function bulkInstallVehiclesToFull(
  vehicleIds: string[],
  pool: MissingPartDetail[]
): Promise<{ vehicles: number; lines: number }> {
  const vehicleSet = new Set(vehicleIds)
  const targets = pool.filter(
    p =>
      vehicleSet.has(p.vehicleId) &&
      p.status !== 'closed' &&
      p.status !== 'cancelled' &&
      p.installedQty < p.requiredQty
  )
  for (const p of targets) {
    const delta = p.requiredQty - p.installedQty
    await installMissingPart(p.id, delta)
  }
  return { vehicles: vehicleSet.size, lines: targets.length }
}

// Record a QC decision on a part. 'pass' approves (and the RPC closes it when
// fully installed); 'fail' reopens it for rework.
export async function recordQc(vehicleId: string, result: 'pass' | 'fail', missingPartId: string): Promise<void> {
  const { error } = await requireClient().rpc('record_qc_inspection', {
    p_vehicle_id: vehicleId,
    p_result: result,
    p_missing_part_id: missingPartId
  })
  if (error) throw new Error(error.message)
}

export async function setVehicleStation(vehicleId: string, stationId: string | null): Promise<void> {
  const { error } = await requireClient().rpc('set_vehicle_current_station', {
    p_vehicle_id: vehicleId,
    p_station_id: stationId
  })
  if (error) throw new Error(error.message)
}

export async function cancelMissingPart(missingPartId: string): Promise<void> {
  const { error } = await requireClient().from('missing_parts').update({ status: 'cancelled' }).eq('id', missingPartId)
  if (error) throw new Error(error.message)
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
    p_stopper_type: input.stopperType,
    p_notes: input.notes || null
  })

  if (error) throw new Error(error.message)
  return data as string
}

export async function reportMissingPartsBatch(
  input: ReportMissingPartsBatchInput
): Promise<ReportMissingPartsBatchResult> {
  const vins = input.vins.map(v => v.trim()).filter(Boolean)
  const parts = input.parts
    .map(p => ({
      part_description: p.partDescription.trim(),
      required_qty: Math.max(1, p.requiredQty),
      reason: p.reason,
      department: p.department,
      station_id: p.stationId || null
    }))
    .filter(p => p.part_description)

  const { data, error } = await requireClient().rpc('report_missing_parts_batch', {
    p_vins: vins,
    p_model_id: input.modelId,
    p_parts: parts,
    p_color_id: input.colorId || null,
    p_station_id: input.stationId || null,
    p_reason: input.reason,
    p_department: input.department,
    p_priority: input.priority,
    p_stopper_type: input.stopperType,
    p_notes: input.notes || null
  })

  if (error) throw new Error(error.message)
  const row = data as ReportMissingPartsBatchResult
  return {
    vehicle_count: row.vehicle_count ?? vins.length,
    part_line_count: row.part_line_count ?? parts.length,
    missing_part_count: row.missing_part_count ?? vins.length * parts.length
  }
}
