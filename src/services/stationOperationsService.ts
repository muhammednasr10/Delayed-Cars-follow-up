import { supabase } from '../lib/supabase'
import { operationCodeFor } from '../Utils/timeStudyParser'
import {
  formatStationDisplayCode,
  inferParentStationCode,
  workerIndexFromStationCode
} from '../Utils/stationHierarchy'
import { createStation, deactivateStation } from './settingsService'
import type {
  OperationHardware,
  ParentStationOperationsGroup,
  StationOperationDetail,
  StationOperationsGroup,
  WorkerOperationsGroup
} from '../Types/timeStudy'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

type StationJoin = {
  station_number: string
  station_name: string
  worker1_operations_summary?: string | null
  sort_order: number | null
  parent_station_id?: string | null
  line_name?: string | null
  work_areas?: { name: string } | null
}

type OpRow = {
  id: string
  station_id: string
  operation_code: string
  operation_name_ar: string
  operation_name_en: string | null
  operation_type: string
  technician_position: string | null
  tool_spec: string | null
  standard_time_minutes: number | null
  worker_time_minutes: number | null
  station_time_minutes: number | null
  required_manpower_count: number
  sequence_no: number
  is_critical: boolean
  is_active: boolean
  notes: string | null
  stations: StationJoin | null
}

type StationMeta = {
  id: string
  station_number: string
  station_name: string
  parent_station_id: string | null
  sort_order: number
  line_name: string | null
  worker1_operations_summary: string | null
  workAreaId: string | null
  workAreaName: string | null
  headcountWorkers: number | null
  avgStationTimeMinutes: number | null
}

function mapOp(r: OpRow, hardware: OperationHardware[]): StationOperationDetail {
  const st = r.stations
  return {
    id: r.id,
    stationId: r.station_id,
    stationNumber: st?.station_number ?? '',
    stationName: st?.station_name ?? '',
    operationCode: r.operation_code,
    operationNameAr: r.operation_name_ar,
    operationNameEn: r.operation_name_en,
    operationType: r.operation_type,
    technicianPosition: r.technician_position,
    toolSpec: r.tool_spec,
    standardTimeMinutes: r.standard_time_minutes,
    workerTimeMinutes: r.worker_time_minutes,
    requiredManpowerCount: r.required_manpower_count,
    sequenceNo: r.sequence_no,
    isCritical: r.is_critical,
    isActive: r.is_active,
    notes: r.notes,
    hardware
  }
}

function opMinutes(op: StationOperationDetail): number {
  return op.workerTimeMinutes ?? op.standardTimeMinutes ?? 0
}

function sumWorkerMinutes(ops: StationOperationDetail[]): number {
  return ops.reduce((s, o) => s + opMinutes(o), 0)
}

async function loadOperationsRows(): Promise<OpRow[]> {
  let res = await client()
    .from('station_operations')
    .select('*, stations(station_number, station_name, worker1_operations_summary, sort_order, parent_station_id, line_name, work_areas(name))')
    .eq('is_active', true)
    .order('sequence_no')
  if (res.error && String(res.error.message).includes('worker1_operations_summary')) {
    res = await client()
      .from('station_operations')
      .select('*, stations(station_number, station_name, sort_order, parent_station_id, line_name, work_areas(name))')
      .eq('is_active', true)
      .order('sequence_no')
  } else if (res.error && String(res.error.message).includes('parent_station_id')) {
    res = await client()
      .from('station_operations')
      .select('*, stations(station_number, station_name, worker1_operations_summary, sort_order, work_areas(name))')
      .eq('is_active', true)
      .order('sequence_no')
  }
  if (res.error) throw new Error(res.error.message)
  return (res.data ?? []) as unknown as OpRow[]
}

async function loadStationMeta(): Promise<Map<string, StationMeta>> {
  const fullSelect =
    'id, station_number, station_name, parent_station_id, sort_order, line_name, work_area_id, worker1_operations_summary, headcount_workers, avg_station_time_minutes, work_areas(name)'
  let rows: Record<string, unknown>[] = []
  let { data, error } = await client().from('stations').select(fullSelect).eq('is_active', true)
  if (error?.message.includes('worker1_operations_summary') || error?.message.includes('headcount_workers')) {
    const retry = await client()
      .from('stations')
      .select('id, station_number, station_name, parent_station_id, sort_order, line_name, work_area_id, work_areas(name)')
      .eq('is_active', true)
    if (retry.error) throw new Error(retry.error.message)
    rows = (retry.data ?? []) as Record<string, unknown>[]
  } else if (error?.message.includes('parent_station_id')) {
    const retry = await client()
      .from('stations')
      .select('id, station_number, station_name, sort_order, line_name, worker1_operations_summary, work_areas(name)')
      .eq('is_active', true)
    if (retry.error) throw new Error(retry.error.message)
    rows = (retry.data ?? []) as Record<string, unknown>[]
  } else {
    if (error) throw new Error(error.message)
    rows = (data ?? []) as Record<string, unknown>[]
  }
  const map = new Map<string, StationMeta>()
  for (const row of rows) {
    const wa = row.work_areas as { name: string } | null
    map.set(row.id as string, {
      id: row.id as string,
      station_number: String(row.station_number),
      station_name: String(row.station_name),
      parent_station_id: (row.parent_station_id as string | null) ?? null,
      sort_order: Number(row.sort_order ?? 0),
      line_name: (row.line_name as string | null) ?? null,
      worker1_operations_summary: (row.worker1_operations_summary as string | null) ?? null,
      workAreaId: (row.work_area_id as string | null) ?? null,
      workAreaName: wa?.name ?? null,
      headcountWorkers: row.headcount_workers != null ? Number(row.headcount_workers) : null,
      avgStationTimeMinutes: row.avg_station_time_minutes != null ? Number(row.avg_station_time_minutes) : null
    })
  }
  return map
}

function buildHierarchy(
  ops: OpRow[],
  hwMap: Map<string, OperationHardware[]>,
  stationMeta: Map<string, StationMeta>,
  filterIds: Set<string> | null
): ParentStationOperationsGroup[] {
  const byChild = new Map<string, StationOperationDetail[]>()
  for (const row of ops) {
    const op = mapOp(row, hwMap.get(row.id) ?? [])
    if (filterIds && !filterIds.has(op.id)) continue
    const list = byChild.get(row.station_id) ?? []
    list.push(op)
    byChild.set(row.station_id, list)
  }

  const parentBuckets = new Map<string, { parent: StationMeta | null; parentCode: string; workers: WorkerOperationsGroup[] }>()

  for (const [childId, childOps] of byChild) {
    const meta = stationMeta.get(childId)
    const stNum = meta?.station_number ?? childOps[0]?.stationNumber ?? childId
    const parentId = meta?.parent_station_id ?? null
    const inferredCode = inferParentStationCode(stNum)
    const parentMeta = parentId ? stationMeta.get(parentId) : null
    const parentCode = parentMeta?.station_number ?? inferredCode ?? stNum
    const bucketKey = parentId ?? parentCode

    const worker: WorkerOperationsGroup = {
      stationId: childId,
      stationNumber: stNum,
      displayCode: stNum,
      workerIndex: workerIndexFromStationCode(stNum),
      stationName: meta?.station_name ?? childOps[0]?.stationName ?? stNum,
      worker1OperationsSummary: meta?.worker1_operations_summary ?? null,
      sortOrder: meta?.sort_order ?? 0,
      totalWorkerTimeMinutes: sumWorkerMinutes(childOps),
      operations: childOps.sort((a, b) => a.sequenceNo - b.sequenceNo)
    }

    const bucket = parentBuckets.get(bucketKey)
    if (bucket) bucket.workers.push(worker)
    else {
      parentBuckets.set(bucketKey, {
        parent: parentMeta ?? (parentId ? stationMeta.get(parentId) ?? null : null),
        parentCode,
        workers: [worker]
      })
    }
  }

  const parents: ParentStationOperationsGroup[] = []
  for (const [, bucket] of parentBuckets) {
    const p = bucket.parent
    const parentCode = bucket.parentCode
    const workers = bucket.workers.sort((a, b) => a.sortOrder - b.sortOrder || (a.workerIndex ?? 99) - (b.workerIndex ?? 99))
    const workerTotals = workers.map(w => w.totalWorkerTimeMinutes).filter(t => t > 0)
    const displayName = p?.station_name && p.station_name.trim() !== parentCode
      ? p.station_name
      : parentCode

    const computedWorkers = workers.length
    const computedAvg = workerTotals.length
      ? workerTotals.reduce((s, t) => s + t, 0) / workerTotals.length
      : null

    parents.push({
      stationId: p?.id ?? null,
      stationNumber: parentCode,
      displayCode: formatStationDisplayCode(parentCode),
      stationName: displayName,
      worker1OperationsSummary: p?.worker1_operations_summary ?? null,
      workAreaId: p?.workAreaId ?? null,
      workAreaName: p?.workAreaName ?? (workers[0] ? stationMeta.get(workers[0].stationId)?.workAreaName ?? null : null),
      lineName: p?.line_name ?? null,
      headcountWorkersOverride: p?.headcountWorkers ?? null,
      avgStationTimeOverride: p?.avgStationTimeMinutes ?? null,
      totalWorkers: p?.headcountWorkers ?? computedWorkers,
      avgStationTimeMinutes: p?.avgStationTimeMinutes ?? computedAvg,
      sortOrder: p?.sort_order ?? workers[0]?.sortOrder ?? 0,
      workers
    })
  }

  return parents.sort((a, b) => a.sortOrder - b.sortOrder || a.stationNumber.localeCompare(b.stationNumber))
}

export async function getParentStationOperationsGroups(
  filterIds: Set<string> | null = null
): Promise<ParentStationOperationsGroup[]> {
  const ops = await loadOperationsRows()
  const opIds = ops.map(o => o.id)
  const hwMap = new Map<string, OperationHardware[]>()
  if (opIds.length > 0) {
    const { data: hw } = await client()
      .from('operation_hardware_requirements')
      .select('*')
      .in('operation_id', opIds)
      .order('sort_order')
    ;(hw ?? []).forEach(h => {
      const list = hwMap.get(h.operation_id as string) ?? []
      list.push({
        id: h.id as string,
        hardwareName: h.hardware_name as string,
        hardwareQty: h.hardware_qty as number | null,
        hardwareType: h.hardware_type as string | null,
        hardwareSize: h.hardware_size as string | null
      })
      hwMap.set(h.operation_id as string, list)
    })
  }
  const stationMeta = await loadStationMeta()
  return buildHierarchy(ops, hwMap, stationMeta, filterIds)
}

/** Flat per-child-station groups (legacy) */
export async function getStationOperationsGroups(): Promise<StationOperationsGroup[]> {
  const parents = await getParentStationOperationsGroups()
  return parents.flatMap(p =>
    p.workers.map(w => ({
      stationId: w.stationId,
      stationNumber: w.stationNumber,
      stationName: w.stationName,
      worker1OperationsSummary: w.worker1OperationsSummary,
      sortOrder: w.sortOrder,
      operations: w.operations
    }))
  )
}

export async function getOperationIdsForModel(modelId: string | null): Promise<Set<string> | null> {
  if (!modelId) return null
  return getOperationIdsForModels([modelId])
}

export async function getOperationIdsForModels(modelIds: string[]): Promise<Set<string> | null> {
  if (modelIds.length === 0) return new Set()
  const ids = new Set<string>()
  const { data, error } = await client()
    .from('vehicle_model_operations')
    .select('operation_id')
    .eq('is_active', true)
    .in('vehicle_model_id', modelIds)
  if (error) throw new Error(error.message)
  ;(data ?? []).forEach(r => ids.add(r.operation_id as string))

  const { data: famRows } = await client()
    .from('vehicle_model_operations')
    .select('operation_id, model_family_id')
    .eq('is_active', true)
    .is('vehicle_model_id', null)
    .not('model_family_id', 'is', null)
  if (famRows?.length) {
    const { data: members } = await client()
      .from('vehicle_model_family_members')
      .select('family_id, vehicle_model_id')
      .in('vehicle_model_id', modelIds)
    const familyIds = new Set((members ?? []).map(m => m.family_id as string))
    famRows.forEach(r => {
      if (familyIds.has(r.model_family_id as string)) ids.add(r.operation_id as string)
    })
  }

  return ids
}

export async function updateStationWorker1Summary(stationId: string, summary: string): Promise<void> {
  const { error } = await client()
    .from('stations')
    .update({ worker1_operations_summary: summary.trim() || null })
    .eq('id', stationId)
  if (error) throw new Error(error.message)
}

export type StationOperationUpdate = {
  operationNameAr: string
  operationNameEn: string | null
  operationType: string
  standardTimeMinutes: number | null
  workerTimeMinutes: number | null
  requiredManpowerCount: number
  notes: string | null
  isCritical: boolean
}

export async function updateStationOperation(id: string, input: StationOperationUpdate): Promise<void> {
  const { error } = await client().from('station_operations').update({
    operation_name_ar: input.operationNameAr.trim(),
    operation_name_en: input.operationNameEn?.trim() || null,
    operation_type: input.operationType,
    standard_time_minutes: input.standardTimeMinutes,
    worker_time_minutes: input.workerTimeMinutes,
    required_manpower_count: input.requiredManpowerCount,
    notes: input.notes?.trim() || null,
    is_critical: input.isCritical
  }).eq('id', id)
  if (error) throw new Error(error.message)
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

  const { error } = await client().from('station_operations').insert({
    station_id: stationId,
    operation_code: code,
    operation_name_ar: input.operationNameAr.trim(),
    operation_name_en: input.operationNameEn?.trim() || null,
    operation_type: input.operationType,
    standard_time_minutes: input.standardTimeMinutes,
    worker_time_minutes: input.workerTimeMinutes,
    required_manpower_count: input.requiredManpowerCount,
    notes: input.notes?.trim() || null,
    is_critical: input.isCritical,
    sequence_no: seq,
    is_active: true
  })
  if (error) throw new Error(error.message)
}

export async function deactivateStationOperation(id: string): Promise<void> {
  const { error } = await client().from('station_operations').update({ is_active: false }).eq('id', id)
  if (error) throw new Error(error.message)
}

/** نقل عملية من عامل (محطة فرعية) إلى عامل آخر — يحدّث station_id والكود والسجلات المرتبطة */
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
  await client().from('vehicle_model_operations').update({ station_id: targetStationId }).eq('operation_id', operationId)

  const { data: skill } = await client()
    .from('training_skills')
    .select('id')
    .eq('station_operation_id', operationId)
    .maybeSingle()
  if (skill?.id) {
    await client().from('training_skills').update({ station_id: targetStationId }).eq('id', skill.id)
  }
}

export async function createParentStation(input: {
  stationNumber: string
  stationName: string
  workAreaId?: string | null
  headcountWorkers?: number | null
  avgStationTimeMinutes?: number | null
}): Promise<string> {
  const row = await createStation({
    station_number: input.stationNumber.trim(),
    station_name: input.stationName.trim(),
    station_type: 'pbs',
    work_area_id: input.workAreaId || null,
    headcount_workers: input.headcountWorkers ?? null,
    avg_station_time_minutes: input.avgStationTimeMinutes ?? null
  })
  return row.id
}

export async function createWorkerStation(input: {
  parentStationId: string
  workerCode: string
  workerName?: string
}): Promise<string> {
  const row = await createStation({
    station_number: input.workerCode.trim(),
    station_name: input.workerName?.trim() || input.workerCode.trim(),
    parent_station_id: input.parentStationId,
    station_type: 'pbs'
  })
  return row.id
}

export async function deactivateStationWithWorkers(parentStationId: string, workerStationIds: string[]): Promise<void> {
  for (const id of workerStationIds) await deactivateStation(id)
  await deactivateStation(parentStationId)
}

export function suggestNextWorkerCode(parentNumber: string, workers: WorkerOperationsGroup[]): string {
  const indices = workers
    .map(w => workerIndexFromStationCode(w.stationNumber))
    .filter((n): n is number => n != null)
  const next = indices.length > 0 ? Math.max(...indices) + 1 : 1
  return `${parentNumber}-L${next}`
}
