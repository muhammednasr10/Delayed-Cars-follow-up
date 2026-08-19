import { operationCodeFor } from '../../Utils/timeStudyParser'
import { client } from './shared'

export type OperationHardwareInput = {
  hardwareName: string
  hardwareQty: number | null
  hardwareType: string | null
  hardwareSize: string | null
}

export type StationOperationUpdate = {
  toolSpec: string | null
  operationNameAr: string
  operationNameEn: string | null
  operationType: string
  parentModelId: string | null
  standardTimeSeconds: number | null
  standardTimeMinutes: number | null
  workerTimeMinutes: number | null
  requiredManpowerCount: number
  technicianPosition: string | null
  taskPrecedence: string | null
  rankedPositionalWeight: number | null
  zoningConstraints: string | null
  notes: string | null
  isCritical: boolean
  hardware: OperationHardwareInput[]
}

async function replaceOperationHardware(operationId: string, hardware: OperationHardwareInput[]): Promise<void> {
  const { error: delErr } = await client()
    .from('operation_hardware_requirements')
    .delete()
    .eq('operation_id', operationId)
  if (delErr) throw new Error(delErr.message)

  const rows = hardware.filter(h => h.hardwareName.trim())
  if (rows.length === 0) return

  const { error } = await client()
    .from('operation_hardware_requirements')
    .insert(
      rows.map((h, i) => ({
        operation_id: operationId,
        hardware_name: h.hardwareName.trim(),
        hardware_qty: h.hardwareQty,
        hardware_type: h.hardwareType?.trim() || null,
        hardware_size: h.hardwareSize?.trim() || null,
        sort_order: i
      }))
    )
  if (error) throw new Error(error.message)
}

export async function updateStationOperation(id: string, input: StationOperationUpdate): Promise<void> {
  let { error } = await client()
    .from('station_operations')
    .update({
      tool_spec: input.toolSpec?.trim() || null,
      operation_name_ar: input.operationNameAr.trim(),
      operation_name_en: input.operationNameEn?.trim() || null,
      operation_type: input.operationType,
      parent_model_id: input.parentModelId || null,
      technician_position: input.technicianPosition?.trim() || null,
      task_precedence: input.taskPrecedence?.trim() || null,
      ranked_positional_weight: input.rankedPositionalWeight,
      zoning_constraints: input.zoningConstraints?.trim() || null,
      standard_time_seconds: input.standardTimeSeconds,
      standard_time_minutes: input.standardTimeMinutes,
      worker_time_minutes: input.workerTimeMinutes,
      required_manpower_count: input.requiredManpowerCount,
      notes: input.notes?.trim() || null,
      is_critical: input.isCritical
    })
    .eq('id', id)
  if (error && String(error.message).includes('parent_model_id')) {
    ;({ error } = await client()
      .from('station_operations')
      .update({
        tool_spec: input.toolSpec?.trim() || null,
        operation_name_ar: input.operationNameAr.trim(),
        operation_name_en: input.operationNameEn?.trim() || null,
        operation_type: input.operationType,
        technician_position: input.technicianPosition?.trim() || null,
        task_precedence: input.taskPrecedence?.trim() || null,
        ranked_positional_weight: input.rankedPositionalWeight,
        zoning_constraints: input.zoningConstraints?.trim() || null,
        standard_time_seconds: input.standardTimeSeconds,
        standard_time_minutes: input.standardTimeMinutes,
        worker_time_minutes: input.workerTimeMinutes,
        required_manpower_count: input.requiredManpowerCount,
        notes: input.notes?.trim() || null,
        is_critical: input.isCritical
      })
      .eq('id', id))
  }
  if (error) throw new Error(error.message)
  await replaceOperationHardware(id, input.hardware)
}

export async function createStationOperation(stationId: string, input: StationOperationUpdate): Promise<void> {
  const { data: st } = await client().from('stations').select('station_number').eq('id', stationId).single()
  if (!st) throw new Error('Station not found')

  const { data: last } = await client()
    .from('station_operations')
    .select('sequence_no')
    .eq('station_id', stationId)
    .order('sequence_no', { ascending: false })
    .limit(1)
  const seq = ((last?.[0]?.sequence_no as number) ?? 0) + 1
  const code = operationCodeFor(String(st.station_number), seq, input.operationNameAr.trim())

  const payload: Record<string, unknown> = {
    station_id: stationId,
    operation_code: code,
    tool_spec: input.toolSpec?.trim() || null,
    operation_name_ar: input.operationNameAr.trim(),
    operation_name_en: input.operationNameEn?.trim() || null,
    operation_type: input.operationType,
    parent_model_id: input.parentModelId || null,
    technician_position: input.technicianPosition?.trim() || null,
    task_precedence: input.taskPrecedence?.trim() || null,
    ranked_positional_weight: input.rankedPositionalWeight,
    zoning_constraints: input.zoningConstraints?.trim() || null,
    standard_time_seconds: input.standardTimeSeconds,
    standard_time_minutes: input.standardTimeMinutes,
    worker_time_minutes: input.workerTimeMinutes,
    required_manpower_count: input.requiredManpowerCount,
    notes: input.notes?.trim() || null,
    is_critical: input.isCritical,
    sequence_no: seq,
    is_active: true
  }

  let insertRes = await client().from('station_operations').insert(payload).select('id').single()
  if (insertRes.error && String(insertRes.error.message).includes('parent_model_id')) {
    const { parent_model_id: _drop, ...fallback } = payload
    insertRes = await client().from('station_operations').insert(fallback).select('id').single()
  }
  if (insertRes.error) throw new Error(insertRes.error.message)

  const operationId = insertRes.data?.id as string
  if (operationId) await replaceOperationHardware(operationId, input.hardware)
}

export async function updateStationWorker1Summary(stationId: string, summary: string): Promise<void> {
  const { error } = await client()
    .from('stations')
    .update({ worker1_operations_summary: summary.trim() || null })
    .eq('id', stationId)
  if (error) throw new Error(error.message)
}

export async function deactivateStationOperation(id: string): Promise<void> {
  const { error } = await client().from('station_operations').update({ is_active: false }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function moveStationOperation(operationId: string, targetStationId: string): Promise<void> {
  const { data: op, error: opErr } = await client()
    .from('station_operations')
    .select('id, station_id, operation_name_ar, operation_code, sequence_no')
    .eq('id', operationId)
    .eq('is_active', true)
    .single()
  if (opErr || !op) throw new Error(opErr?.message ?? 'Operation not found')
  if (op.station_id === targetStationId) return

  const { data: targetSt, error: stErr } = await client()
    .from('stations')
    .select('station_number')
    .eq('id', targetStationId)
    .eq('is_active', true)
    .single()
  if (stErr || !targetSt) throw new Error(stErr?.message ?? 'Target worker not found')

  const { data: dup } = await client()
    .from('station_operations')
    .select('id')
    .eq('station_id', targetStationId)
    .eq('operation_name_ar', op.operation_name_ar)
    .eq('is_active', true)
    .neq('id', operationId)
    .maybeSingle()
  if (dup) throw new Error('OPERATION_NAME_EXISTS_ON_TARGET')

  const { data: last } = await client()
    .from('station_operations')
    .select('sequence_no')
    .eq('station_id', targetStationId)
    .eq('is_active', true)
    .order('sequence_no', { ascending: false })
    .limit(1)
  const seq = ((last?.[0]?.sequence_no as number) ?? 0) + 1
  const newCode = operationCodeFor(String(targetSt.station_number), seq, op.operation_name_ar as string)

  const { error: updErr } = await client()
    .from('station_operations')
    .update({ station_id: targetStationId, operation_code: newCode, sequence_no: seq })
    .eq('id', operationId)
  if (updErr) throw new Error(updErr.message)

  await client().from('operation_time_studies').update({ station_id: targetStationId }).eq('operation_id', operationId)
  await client()
    .from('vehicle_model_operations')
    .update({ station_id: targetStationId })
    .eq('operation_id', operationId)

  const { data: skill } = await client()
    .from('training_skills')
    .select('id')
    .eq('station_operation_id', operationId)
    .maybeSingle()
  if (skill?.id) {
    await client().from('training_skills').update({ station_id: targetStationId }).eq('id', skill.id)
  }
}
