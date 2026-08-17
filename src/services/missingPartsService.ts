import { supabase } from '../lib/supabase'
import { normalizeChassisVin } from '../Utils/vinValidation'
import {
  formatShortageCompleteNote,
  formatShortageDeleteNote,
  formatShortageEditNote,
  formatShortageFollowUpNote,
  formatShortageInstallNote,
  formatShortageReportNote,
  formatShortageRestoreNote,
  formatShortageTransferNote,
  logVehicleActivityNote,
  logVehicleActivityNotes
} from '../Utils/vehicleActivityNote'
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
  completing_department?: string | null
  follow_up_employee_id?: string | null
  follow_up_employee_name?: string | null
  priority: MissingPartDetail['priority']
  status: MissingPartDetail['status']
  qc_approved: boolean
  is_dr_item: boolean
  stopper_type: MissingPartDetail['stopperType']
  notes: string | null
  vin: string
  model_name: string | null
  color_name: string | null
  color_code?: string | null
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
  shortage_resolved_by?: string | null
  shortage_resolved_by_name?: string | null
  transferred_at?: string | null
  report_group_id: string | null
  station_id: string | null
  factory_org_unit_id: string | null
  pending_transfer_request_id?: string | null
  pending_restore_request_id?: string | null
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
    completingDepartment: row.completing_department ?? null,
    followUpEmployeeId: row.follow_up_employee_id ?? null,
    followUpEmployeeName: row.follow_up_employee_name ?? null,
    priority: row.priority,
    status: row.status,
    qcApproved: row.qc_approved,
    isDrItem: row.is_dr_item,
    stopperType: row.stopper_type ?? 'car_stopper',
    notes: row.notes,
    vin: row.vin,
    modelName: row.model_name ?? '',
    colorName: row.color_name,
    colorCode: row.color_code ?? null,
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
    shortageResolvedByName: row.shortage_resolved_by_name ?? null,
    transferredAt: row.transferred_at ?? null,
    reportGroupId: row.report_group_id,
    stationId: row.station_id,
    factoryOrgUnitId: row.factory_org_unit_id,
    pendingTransferRequestId: row.pending_transfer_request_id ?? null,
    pendingRestoreRequestId: row.pending_restore_request_id ?? null
  }
}

type ShortageRowLite = {
  id: string
  vehicle_id: string
  part_description: string
  required_qty: number | string
  reason: string
  department: string
  completing_department: string | null
  follow_up_employee_id: string | null
  priority: string
  stopper_type: string | null
  notes: string | null
  status: string
}

async function fetchShortageRow(id: string): Promise<ShortageRowLite | null> {
  const { data, error } = await requireClient()
    .from('missing_parts')
    .select(
      'id, vehicle_id, part_description, required_qty, reason, department, completing_department, follow_up_employee_id, priority, stopper_type, notes, status'
    )
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  return data as ShortageRowLite
}

async function resolveEmployeeLabel(employeeId: string | null | undefined): Promise<string | null> {
  if (!employeeId) return null
  const { data } = await requireClient().from('employees').select('full_name, employee_code').eq('id', employeeId).maybeSingle()
  if (!data) return null
  const row = data as { full_name: string; employee_code: string | null }
  return row.employee_code ? `${row.full_name} (${row.employee_code})` : row.full_name
}

async function resolveOrgUnitLabel(unitId: string | null | undefined): Promise<string | null> {
  if (!unitId) return null
  const { data } = await requireClient().from('factory_org_units').select('name').eq('id', unitId).maybeSingle()
  if (data) return (data as { name: string }).name
  const { data: legacy } = await requireClient()
    .from('mp_department_options')
    .select('label_ar')
    .eq('code', unitId)
    .maybeSingle()
  return legacy ? (legacy as { label_ar: string }).label_ar : unitId
}

function buildEditChanges(before: ShortageRowLite, input: UpdateMissingPartInput): string[] {
  const changes: string[] = []
  if (before.part_description.trim() !== input.partDescription.trim()) {
    changes.push(`الوصف «${before.part_description}» ← «${input.partDescription.trim()}»`)
  }
  if (Number(before.required_qty) !== Number(input.requiredQty)) {
    changes.push(`الكمية ${before.required_qty} ← ${input.requiredQty}`)
  }
  if (before.reason !== input.reason) changes.push(`تصنيف السبب ${before.reason} ← ${input.reason}`)
  if (before.department !== input.department) changes.push(`القسم المتسبب ${before.department} ← ${input.department}`)
  if (before.priority !== input.priority) changes.push(`الأولوية ${before.priority} ← ${input.priority}`)
  if ((before.stopper_type ?? 'car_stopper') !== input.stopperType) {
    changes.push(`نوع الإيقاف ${before.stopper_type ?? 'car_stopper'} ← ${input.stopperType}`)
  }
  const nextNotes = input.notes?.trim() || null
  if ((before.notes ?? null) !== nextNotes) changes.push('تعديل الملاحظات')
  return changes
}

export async function updateMissingPartRecord(
  id: string,
  input: UpdateMissingPartInput,
  options?: { skipActivityNote?: boolean }
): Promise<void> {
  const before = options?.skipActivityNote ? null : await fetchShortageRow(id)
  const { error } = await requireClient().rpc('update_missing_part_record', {
    p_id: id,
    p_part_description: input.partDescription.trim(),
    p_required_qty: input.requiredQty,
    p_reason: input.reason,
    p_department: input.department,
    p_priority: input.priority,
    p_stopper_type: input.stopperType,
    p_notes: input.notes?.trim() || null,
    ...(input.assignFollowUp
      ? {
          p_completing_department: input.completingDepartment || null,
          p_follow_up_employee_id: input.followUpEmployeeId || null,
          p_assign_follow_up: true
        }
      : {})
  })
  if (error) throw new Error(error.message)

  if (options?.skipActivityNote || !before) return

  if (input.assignFollowUp) {
    const [deptLabel, empLabel] = await Promise.all([
      resolveOrgUnitLabel(input.completingDepartment),
      resolveEmployeeLabel(input.followUpEmployeeId)
    ])
    await logVehicleActivityNote(
      before.vehicle_id,
      formatShortageFollowUpNote({
        partLabels: [before.part_description],
        completingDepartmentLabel: deptLabel,
        followUpEmployeeLabel: empLabel
      })
    )
    return
  }

  const changes = buildEditChanges(before, input)
  if (changes.length === 0) return
  await logVehicleActivityNote(
    before.vehicle_id,
    formatShortageEditNote(input.partDescription.trim() || before.part_description, changes)
  )
}

export async function assignMissingPartFollowUp(
  parts: MissingPartDetail[],
  completingDepartment: string | null,
  followUpEmployeeId: string | null
): Promise<number> {
  const targets = parts.filter(p => p.status !== 'closed' && p.status !== 'cancelled')
  for (const p of targets) {
    await updateMissingPartRecord(
      p.id,
      {
        partDescription: p.partDescription,
        requiredQty: p.requiredQty,
        reason: p.reason,
        department: p.department,
        priority: p.priority,
        stopperType: p.stopperType,
        notes: p.notes ?? undefined,
        completingDepartment,
        followUpEmployeeId,
        assignFollowUp: true
      },
      { skipActivityNote: true }
    )
  }

  const [deptLabel, empLabel] = await Promise.all([
    resolveOrgUnitLabel(completingDepartment),
    resolveEmployeeLabel(followUpEmployeeId)
  ])
  const byVehicle = new Map<string, string[]>()
  for (const p of targets) {
    const list = byVehicle.get(p.vehicleId) ?? []
    list.push(p.partDescription)
    byVehicle.set(p.vehicleId, list)
  }
  await logVehicleActivityNotes(
    [...byVehicle.entries()].map(([vehicleId, partLabels]) => ({
      vehicleId,
      body: formatShortageFollowUpNote({
        partLabels,
        completingDepartmentLabel: deptLabel,
        followUpEmployeeLabel: empLabel
      })
    }))
  )

  return targets.length
}

export async function deleteMissingPartRecord(id: string): Promise<void> {
  const before = await fetchShortageRow(id)
  const { error } = await requireClient().rpc('delete_missing_part_record', { p_id: id })
  if (error) throw new Error(error.message)
  if (before) {
    await logVehicleActivityNote(before.vehicle_id, formatShortageDeleteNote(before.part_description))
  }
}

/** Stamp open lines onto a shared report group (e.g. before adding more chassis). */
export async function attachMissingPartsToReportGroup(ids: string[], reportGroupId: string): Promise<void> {
  if (ids.length === 0) return
  const { error } = await requireClient()
    .from('missing_parts')
    .update({ report_group_id: reportGroupId })
    .in('id', ids)
  if (error) throw new Error(error.message)
}

export async function completeVehicleShortage(
  vehicleId: string,
  options?: { skipActivityNote?: boolean }
): Promise<void> {
  const { error } = await requireClient().rpc('complete_vehicle_shortage', { p_vehicle_id: vehicleId })
  if (error) throw new Error(error.message)
  if (!options?.skipActivityNote) {
    await logVehicleActivityNote(vehicleId, formatShortageCompleteNote())
  }
}

export async function restoreVehicleShortage(vehicleId: string): Promise<void> {
  const { error } = await requireClient().rpc('restore_vehicle_shortage', { p_vehicle_id: vehicleId })
  if (!error) {
    await logVehicleActivityNote(vehicleId, formatShortageRestoreNote())
    return
  }
  const missingFn =
    error.message.includes('Could not find the function') || error.message.includes('schema cache')
  if (missingFn) {
    throw new Error(
      'دالة إرجاع السيارة من الأرشيف غير مفعّلة على Supabase. نفّذ supabase/scripts/apply_restore_vehicle_shortage.sql'
    )
  }
  throw new Error(error.message)
}

/** ترحيل سبب نقص واحد: يُغلق السطر ويُعلَّم transferred_at دون تركيب فعلي؛ إن لم يبقَ مفتوح تُأرشف السيارة. */
export async function transferMissingPartIssue(
  missingPartId: string,
  options?: { vehicleId?: string; remainingOpenOnVehicle?: number }
): Promise<{ vehicle_id: string; vehicle_archived: boolean }> {
  const before = await fetchShortageRow(missingPartId)
  const { data, error } = await requireClient().rpc('transfer_missing_part_issue', {
    p_missing_part_id: missingPartId
  })

  if (!error) {
    const row = (data ?? {}) as { vehicle_id?: string; vehicle_archived?: boolean }
    const vehicleId = row.vehicle_id ?? options?.vehicleId ?? before?.vehicle_id ?? ''
    const archived = Boolean(row.vehicle_archived)
    if (vehicleId) {
      await logVehicleActivityNote(
        vehicleId,
        formatShortageTransferNote(before?.part_description ?? '', archived)
      )
    }
    return {
      vehicle_id: vehicleId,
      vehicle_archived: archived
    }
  }

  const missingFn =
    error.message.includes('Could not find the function') || error.message.includes('schema cache')
  if (!missingFn) throw new Error(error.message)

  const vehicleId = options?.vehicleId
  if (!vehicleId) {
    throw new Error(
      'دالة ترحيل السبب غير مفعّلة على Supabase. نفّذ supabase/scripts/apply_missing_part_transferred_at.sql'
    )
  }

  const remainingOpen = options?.remainingOpenOnVehicle ?? 1
  const { error: closeErr } = await requireClient()
    .from('missing_parts')
    .update({
      status: 'closed',
      qc_approved: true,
      transferred_at: new Date().toISOString()
    })
    .eq('id', missingPartId)

  if (closeErr) {
    throw new Error(
      'دالة ترحيل السبب غير مفعّلة على Supabase. نفّذ supabase/scripts/apply_missing_part_transferred_at.sql'
    )
  }

  if (remainingOpen <= 1) {
    await logVehicleActivityNote(vehicleId, formatShortageTransferNote(before?.part_description ?? '', true))
    await completeVehicleShortage(vehicleId, { skipActivityNote: true })
    return { vehicle_id: vehicleId, vehicle_archived: true }
  }

  await logVehicleActivityNote(vehicleId, formatShortageTransferNote(before?.part_description ?? '', false))
  return { vehicle_id: vehicleId, vehicle_archived: false }
}

/** VINs already registered on this model (vehicles table). */
export async function findExistingVehicleVins(vins: string[], modelId: string): Promise<string[]> {
  const normalized = [...new Set(vins.map(v => normalizeChassisVin(v).toUpperCase()).filter(v => /^\d{4}$/.test(v)))]
  if (!normalized.length || !modelId) return []

  const { data, error } = await requireClient()
    .from('vehicles')
    .select('vin')
    .eq('model_id', modelId)
    .eq('is_deleted', false)
    .in('vin', normalized)

  if (error) throw new Error(error.message)
  return (data ?? []).map(row => String((row as { vin: string }).vin))
}

export async function getMissingParts(): Promise<MissingPartDetail[]> {
  const { data, error } = await requireClient()
    .from('v_missing_parts_detail')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return ((data ?? []) as DetailRow[]).map(mapDetail)
}

export async function getMissingPartsByVins(vins: string[]): Promise<MissingPartDetail[]> {
  const normalized = [...new Set(vins.map(v => normalizeChassisVin(v).toUpperCase()).filter(v => /^\d{4}$/.test(v)))]
  if (normalized.length === 0) return []
  const { data, error } = await requireClient()
    .from('v_missing_parts_detail')
    .select('*')
    .in('vin', normalized)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data ?? []) as DetailRow[]).map(mapDetail)
}

// Mark a part as installed (fully or by quantity). Does not archive the vehicle.
export async function installMissingPart(missingPartId: string, quantity: number): Promise<void> {
  const before = await fetchShortageRow(missingPartId)
  const { error } = await requireClient().rpc('install_part', {
    p_missing_part_id: missingPartId,
    p_quantity: quantity
  })
  if (error) throw new Error(error.message)
  if (before) {
    await logVehicleActivityNote(before.vehicle_id, formatShortageInstallNote(before.part_description, quantity))
  }
}

/** Set installed qty to required for all open lines on the given vehicles. */
export async function bulkInstallVehiclesToFull(
  vehicleIds: string[],
  pool: MissingPartDetail[]
): Promise<{ vehicles: number; lines: number }> {
  const vehicleSet = new Set(vehicleIds)
  const targets = pool.filter(
    p =>
      vehicleSet.has(p.vehicleId) && p.status !== 'closed' && p.status !== 'cancelled' && p.installedQty < p.requiredQty
  )
  for (const p of targets) {
    const delta = p.requiredQty - p.installedQty
    await installMissingPart(p.id, delta)
  }
  return { vehicles: vehicleSet.size, lines: targets.length }
}

// Record a QC decision on a part. 'pass' approves (and the RPC closes it when
// fully installed); 'fail' reopens it for rework.
export async function setVehicleStation(vehicleId: string, stationId: string | null): Promise<void> {
  const { error } = await requireClient().rpc('set_vehicle_current_station', {
    p_vehicle_id: vehicleId,
    p_station_id: stationId
  })
  if (error) throw new Error(error.message)
  await logVehicleActivityNote(
    vehicleId,
    stationId ? 'تغيير المحطة الحالية للسيارة.' : 'إزالة المحطة الحالية للسيارة.'
  )
}

export async function recordQc(vehicleId: string, result: 'pass' | 'fail', missingPartId: string): Promise<void> {
  const before = await fetchShortageRow(missingPartId)
  const { error } = await requireClient().rpc('record_qc_inspection', {
    p_vehicle_id: vehicleId,
    p_result: result,
    p_missing_part_id: missingPartId
  })
  if (error) throw new Error(error.message)
  const part = before?.part_description?.trim() || 'بدون وصف'
  await logVehicleActivityNote(
    vehicleId,
    result === 'pass' ? `فحص جودة مقبول لنقص «${part}».` : `فحص جودة مرفوض لنقص «${part}».`
  )
}

export async function cancelMissingPart(missingPartId: string): Promise<void> {
  const before = await fetchShortageRow(missingPartId)
  const { error } = await requireClient().from('missing_parts').update({ status: 'cancelled' }).eq('id', missingPartId)
  if (error) throw new Error(error.message)
  if (before) {
    await logVehicleActivityNote(before.vehicle_id, `إلغاء نقص «${before.part_description.trim() || 'بدون وصف'}».`)
  }
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
  const vins = input.vins.map(v => v.trim()).filter(v => /^\d{4}$/.test(v))
  const parts = input.parts
    .map(p => ({
      part_description: p.partDescription.trim(),
      required_qty: Math.max(1, p.requiredQty),
      reason: p.reason,
      department: p.department,
      station_id: p.stationId || null,
      completing_department: p.completingDepartment || null,
      follow_up_employee_id: p.followUpEmployeeId || null
    }))
    .filter(p => p.part_description)

  const baseParams = {
    p_vins: vins,
    p_model_id: input.modelId,
    p_parts: parts,
    p_color_id: input.colorId || null,
    p_station_id: input.stationId || null,
    p_reason: input.reason,
    p_department: input.department,
    p_priority: input.priority ?? 'normal',
    p_stopper_type: input.stopperType ?? 'car_stopper',
    p_notes: input.notes || null
  }

  const withOrg = input.factoryOrgUnitId
    ? { ...baseParams, p_factory_org_unit_id: input.factoryOrgUnitId }
    : baseParams
  const withGroup = input.reportGroupId
    ? { ...withOrg, p_report_group_id: input.reportGroupId }
    : withOrg

  let data: unknown
  let error: { message: string } | null

  ;({ data, error } = await requireClient().rpc('report_missing_parts_batch', withGroup))

  if (error && error.message.includes('Could not find the function') && 'p_report_group_id' in withGroup) {
    ;({ data, error } = await requireClient().rpc('report_missing_parts_batch', withOrg))
  }

  if (error && error.message.includes('Could not find the function') && 'p_factory_org_unit_id' in withOrg) {
    ;({ data, error } = await requireClient().rpc('report_missing_parts_batch', baseParams))
  }

  if (error) {
    if (error.message.includes('Could not find the function')) {
      throw new Error(
        'دالة تبليغ النواقص غير محدّثة على Supabase. نفّذ الملف supabase/migrations/0145_report_batch_attach_group.sql من SQL Editor.'
      )
    }
    throw new Error(error.message)
  }

  const row = data as ReportMissingPartsBatchResult & { vehicle_ids?: string[] }
  const vehicleIds = Array.isArray(row.vehicle_ids) ? row.vehicle_ids.filter(Boolean) : []
  const noteBody = formatShortageReportNote(parts.map(p => p.part_description))
  if (vehicleIds.length > 0) {
    await logVehicleActivityNotes(vehicleIds.map(vehicleId => ({ vehicleId, body: noteBody })))
  } else {
    // Fallback: resolve vehicles by reported VINs
    const { data: vehicleRows } = await requireClient()
      .from('vehicles')
      .select('id')
      .in('vin', vins.map(v => v.toUpperCase()))
      .eq('is_deleted', false)
    for (const v of vehicleRows ?? []) {
      await logVehicleActivityNote((v as { id: string }).id, noteBody)
    }
  }

  return {
    vehicle_count: row.vehicle_count ?? vins.length,
    part_line_count: row.part_line_count ?? parts.length,
    missing_part_count: row.missing_part_count ?? vins.length * parts.length,
    vehicle_ids: vehicleIds,
    report_group_id: row.report_group_id ?? null
  }
}
