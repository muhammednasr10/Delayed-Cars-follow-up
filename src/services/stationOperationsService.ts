import { supabase } from '../lib/supabase'
import { operationCodeFor } from '../Utils/timeStudyParser'
import {
  formatStationDisplayCode,
  formatStationWorkerDisplayCode,
  inferParentStationCode,
  normalizeStationReferenceCode,
  normalizeStationBaseCode,
  composeStationNumber,
  workerIndexFromStationCode
} from '../Utils/stationHierarchy'
import { createStation, deactivateStation, updateStation } from './settingsService'
import type { Station } from '../Types/settings'
import type {
  OperationHardware,
  ParentStationOperationsGroup,
  StationOperationDetail,
  StationOperationsGroup,
  WorkerOperationsGroup
} from '../Types/timeStudy'
import { countWorkerLines, resolveMasterStationRecord } from '../Utils/stationMaster'

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
  parent_model_id?: string | null
  technician_position: string | null
  tool_spec: string | null
  standard_time_seconds: number | null
  standard_time_minutes: number | null
  worker_time_minutes: number | null
  station_time_minutes: number | null
  required_manpower_count: number
  task_precedence: string | null
  ranked_positional_weight: number | null
  zoning_constraints: string | null
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

function mapOp(r: OpRow, hardware: OperationHardware[], parentModelName?: string | null): StationOperationDetail {
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
    parentModelId: r.parent_model_id ?? null,
    parentModelName: parentModelName ?? null,
    technicianPosition: r.technician_position,
    toolSpec: r.tool_spec,
    standardTimeSeconds: r.standard_time_seconds != null ? Number(r.standard_time_seconds) : null,
    standardTimeMinutes: r.standard_time_minutes != null ? Number(r.standard_time_minutes) : null,
    workerTimeMinutes: r.worker_time_minutes != null ? Number(r.worker_time_minutes) : null,
    stationTimeMinutes: r.station_time_minutes != null ? Number(r.station_time_minutes) : null,
    requiredManpowerCount: r.required_manpower_count,
    taskPrecedence: r.task_precedence,
    rankedPositionalWeight: r.ranked_positional_weight != null ? Number(r.ranked_positional_weight) : null,
    zoningConstraints: r.zoning_constraints,
    sequenceNo: r.sequence_no,
    isCritical: r.is_critical,
    isActive: r.is_active,
    notes: r.notes,
    hardware
  }
}

function operationStandardMinutes(op: StationOperationDetail): number {
  if (op.standardTimeMinutes != null && Number.isFinite(op.standardTimeMinutes)) return op.standardTimeMinutes
  if (op.standardTimeSeconds != null && Number.isFinite(op.standardTimeSeconds)) return op.standardTimeSeconds / 60
  return 0
}

function sumWorkerMinutes(ops: StationOperationDetail[]): number {
  return ops.reduce((s, o) => s + operationStandardMinutes(o), 0)
}

function isParentContainerRow(meta: StationMeta, allMeta: Map<string, StationMeta>): boolean {
  if (inferParentStationCode(meta.station_number)) return false
  for (const other of allMeta.values()) {
    if (other.parent_station_id === meta.id) return true
  }
  return false
}

function makeWorkerGroup(
  childId: string,
  meta: StationMeta | null,
  stNum: string,
  childOps: StationOperationDetail[]
): WorkerOperationsGroup {
  return {
    stationId: childId,
    stationNumber: stNum,
    displayCode: stNum,
    workerIndex: workerIndexFromStationCode(stNum),
    stationName: meta?.station_name ?? childOps[0]?.stationName ?? stNum,
    worker1OperationsSummary: meta?.worker1_operations_summary ?? null,
    sortOrder: meta?.sort_order ?? 0,
    totalWorkerTimeMinutes: sumWorkerMinutes(childOps),
    operations: [...childOps].sort((a, b) => a.sequenceNo - b.sequenceNo)
  }
}

type ParentBucket = { parent: StationMeta | null; parentCode: string; workers: WorkerOperationsGroup[] }

function hasChildWorkerLines(parentId: string, stationMeta: Map<string, StationMeta>): boolean {
  for (const meta of stationMeta.values()) {
    if (meta.parent_station_id === parentId) return true
  }
  return false
}

function appendWorkerToBuckets(
  parentBuckets: Map<string, ParentBucket>,
  stationMeta: Map<string, StationMeta>,
  childId: string,
  meta: StationMeta | undefined,
  childOps: StationOperationDetail[]
): void {
  const stNum = meta?.station_number ?? childOps[0]?.stationNumber ?? childId
  const parentId = meta?.parent_station_id ?? null
  const inferredCode = inferParentStationCode(stNum)
  const parentMeta = parentId ? stationMeta.get(parentId) ?? null : null
  const parentCode = parentMeta?.station_number ?? inferredCode ?? stNum
  const bucketKey = normalizeStationReferenceCode(
    parentMeta?.station_number ?? inferredCode ?? normalizeStationReferenceCode(stNum)
  )
  const worker = makeWorkerGroup(childId, meta ?? null, stNum, childOps)

  if (meta && hasChildWorkerLines(meta.id, stationMeta) && !/-L\d+$/i.test(meta.station_number)) {
    return
  }

  const bucket = parentBuckets.get(bucketKey)
  if (bucket) {
    bucket.workers.push(worker)
    if (!bucket.parent && parentMeta) bucket.parent = parentMeta
  } else {
    parentBuckets.set(bucketKey, { parent: parentMeta, parentCode, workers: [worker] })
  }
}

function findMasterStationMeta(baseCode: string, stationMeta: Map<string, StationMeta>): StationMeta | null {
  const norm = normalizeStationReferenceCode(baseCode)
  for (const meta of stationMeta.values()) {
    if (meta.parent_station_id) continue
    if (/-L\d+$/i.test(meta.station_number)) continue
    if (normalizeStationReferenceCode(meta.station_number) === norm) return meta
  }
  return null
}

function enrichWorkersForHeadcount(
  group: ParentStationOperationsGroup,
  stationMeta: Map<string, StationMeta>
): void {
  const base = normalizeStationReferenceCode(group.stationNumber)
  const masterMeta = findMasterStationMeta(base, stationMeta)
  const target =
    masterMeta?.headcountWorkers ?? group.headcountWorkersOverride ?? group.totalWorkers ?? 0
  if (target < 1) return

  if (masterMeta?.headcountWorkers != null) {
    group.headcountWorkersOverride = masterMeta.headcountWorkers
    group.totalWorkers = masterMeta.headcountWorkers
  }
  if (masterMeta?.id) group.stationId = masterMeta.id

  const known = new Set(
    group.workers
      .map(w => w.workerIndex ?? workerIndexFromStationCode(w.stationNumber))
      .filter((n): n is number => n != null)
  )

  for (const meta of stationMeta.values()) {
    const idx = workerIndexFromStationCode(meta.station_number)
    if (idx == null || idx < 1 || idx > target || known.has(idx)) continue
    const inferred = inferParentStationCode(meta.station_number)
    if (!inferred) continue
    if (normalizeStationBaseCode(inferred) !== normalizeStationBaseCode(base)) continue
    group.workers.push(makeWorkerGroup(meta.id, meta, meta.station_number, []))
    known.add(idx)
  }

  group.workers.sort(
    (a, b) => a.sortOrder - b.sortOrder || (a.workerIndex ?? 99) - (b.workerIndex ?? 99)
  )
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
  } else if (res.error && String(res.error.message).includes('parent_model_id')) {
    res = await client()
      .from('station_operations')
      .select('*, stations(station_number, station_name, worker1_operations_summary, sort_order, parent_station_id, line_name, work_areas(name))')
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
  filterIds: Set<string> | null,
  parentModelNames: Map<string, string>
): ParentStationOperationsGroup[] {
  const byChild = new Map<string, StationOperationDetail[]>()
  for (const row of ops) {
    const modelName = row.parent_model_id ? parentModelNames.get(row.parent_model_id) ?? null : null
    const op = mapOp(row, hwMap.get(row.id) ?? [], modelName)
    if (filterIds && !filterIds.has(op.id)) continue
    const list = byChild.get(row.station_id) ?? []
    list.push(op)
    byChild.set(row.station_id, list)
  }

  const parentBuckets = new Map<string, ParentBucket>()

  for (const [childId, childOps] of byChild) {
    appendWorkerToBuckets(parentBuckets, stationMeta, childId, stationMeta.get(childId), childOps)
  }

  // Stations saved without operations yet still appear in the list.
  if (!filterIds) {
    for (const [stationId, meta] of stationMeta) {
      if (byChild.has(stationId)) continue
      if (isParentContainerRow(meta, stationMeta)) continue
      appendWorkerToBuckets(parentBuckets, stationMeta, stationId, meta, [])
    }
  }

  const parents: ParentStationOperationsGroup[] = []
  for (const [, bucket] of parentBuckets) {
    const p = bucket.parent
    const workers = bucket.workers.sort((a, b) => a.sortOrder - b.sortOrder || (a.workerIndex ?? 99) - (b.workerIndex ?? 99))
    const workerMeta = workers[0] ? stationMeta.get(workers[0].stationId) : null
    const codeSource = p?.station_number ?? workerMeta?.station_number ?? bucket.parentCode
    const resolvedCode = normalizeStationReferenceCode(codeSource)
    const masterMeta = findMasterStationMeta(resolvedCode, stationMeta)
    const commonName =
      p?.station_name?.trim() ||
      masterMeta?.station_name?.trim() ||
      workerMeta?.station_name?.trim() ||
      resolvedCode
    const workerTotals = workers.map(w => w.totalWorkerTimeMinutes).filter(t => t > 0)
    const computedWorkers = workers.length
    const computedAvg = workerTotals.length
      ? workerTotals.reduce((s, t) => s + t, 0) / workerTotals.length
      : null
    const headcount =
      masterMeta?.headcountWorkers ?? p?.headcountWorkers ?? workerMeta?.headcountWorkers ?? null

    const group: ParentStationOperationsGroup = {
      stationId: masterMeta?.id ?? p?.id ?? workerMeta?.id ?? null,
      stationNumber: resolvedCode,
      displayCode: formatStationDisplayCode(resolvedCode),
      stationName: commonName,
      worker1OperationsSummary:
        p?.worker1_operations_summary ??
        masterMeta?.worker1_operations_summary ??
        workerMeta?.worker1_operations_summary ??
        null,
      workAreaId: p?.workAreaId ?? masterMeta?.workAreaId ?? workerMeta?.workAreaId ?? null,
      workAreaName:
        p?.workAreaName ??
        masterMeta?.workAreaName ??
        workerMeta?.workAreaName ??
        (workers[0] ? stationMeta.get(workers[0].stationId)?.workAreaName ?? null : null),
      lineName: p?.line_name ?? masterMeta?.line_name ?? workerMeta?.line_name ?? null,
      headcountWorkersOverride: headcount,
      avgStationTimeOverride: p?.avgStationTimeMinutes ?? masterMeta?.avgStationTimeMinutes ?? workerMeta?.avgStationTimeMinutes ?? null,
      totalWorkers: headcount ?? computedWorkers,
      avgStationTimeMinutes: p?.avgStationTimeMinutes ?? masterMeta?.avgStationTimeMinutes ?? workerMeta?.avgStationTimeMinutes ?? computedAvg,
      sortOrder: p?.sort_order ?? masterMeta?.sort_order ?? workers[0]?.sortOrder ?? 0,
      workers
    }
    enrichWorkersForHeadcount(group, stationMeta)
    parents.push(group)
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
  const parentIds = [...new Set(ops.map(o => o.parent_model_id).filter(Boolean))] as string[]
  const parentModelNames = new Map<string, string>()
  if (parentIds.length > 0) {
    const { data: modelRows, error: modelErr } = await client()
      .from('vehicle_models')
      .select('id, name')
      .in('id', parentIds)
    if (modelErr && !String(modelErr.message).includes('parent_model_id')) throw new Error(modelErr.message)
    ;(modelRows ?? []).forEach(r => parentModelNames.set(r.id as string, String(r.name)))
  }
  return buildHierarchy(ops, hwMap, stationMeta, filterIds, parentModelNames)
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

export type LineBalanceWorkerLine = {
  stationId: string
  stationNumber: string
  displayCode: string
}

/** Worker lines (e.g. PBS01-L1) at a master station that have operations for the given model(s). */
export async function getWorkerLinesForStationAndModels(
  masterStationId: string,
  modelIds: string[]
): Promise<LineBalanceWorkerLine[]> {
  if (!masterStationId || modelIds.length === 0) return []

  const opIds = await getOperationIdsForModels(modelIds)
  const groups = await getParentStationOperationsGroups(opIds && opIds.size > 0 ? opIds : null)

  let parent = groups.find(g => g.stationId === masterStationId)
  if (!parent) {
    const { data: row } = await client()
      .from('stations')
      .select('station_number')
      .eq('id', masterStationId)
      .maybeSingle()
    if (row) {
      const code = normalizeStationReferenceCode(String(row.station_number))
      parent = groups.find(g => normalizeStationReferenceCode(g.stationNumber) === code)
    }
  }
  if (!parent) return []

  return parent.workers
    .map(w => ({
      stationId: w.stationId,
      stationNumber: w.stationNumber,
      displayCode: formatStationWorkerDisplayCode(w.displayCode || w.stationNumber)
    }))
    .sort(
      (a, b) =>
        (workerIndexFromStationCode(a.stationNumber) ?? 99) - (workerIndexFromStationCode(b.stationNumber) ?? 99) ||
        a.displayCode.localeCompare(b.displayCode, undefined, { numeric: true, sensitivity: 'base' })
    )
}

export async function updateStationWorker1Summary(stationId: string, summary: string): Promise<void> {
  const { error } = await client()
    .from('stations')
    .update({ worker1_operations_summary: summary.trim() || null })
    .eq('id', stationId)
  if (error) throw new Error(error.message)
}

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

  const { error } = await client().from('operation_hardware_requirements').insert(
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
  let { error } = await client().from('station_operations').update({
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
  }).eq('id', id)
  if (error && String(error.message).includes('parent_model_id')) {
    ;({ error } = await client().from('station_operations').update({
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
    }).eq('id', id))
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

function resolveHeadcountTarget(master: Station, headcount?: number | null): number {
  if (headcount != null && Number.isFinite(headcount) && headcount >= 1) return Math.floor(headcount)
  if (master.headcount_workers != null && master.headcount_workers >= 1) return Math.floor(master.headcount_workers)
  return 1
}

async function countActiveOperations(stationId: string): Promise<number> {
  const { count, error } = await client()
    .from('station_operations')
    .select('*', { count: 'exact', head: true })
    .eq('station_id', stationId)
    .eq('is_active', true)
  if (error) throw new Error(error.message)
  return count ?? 0
}

async function resolveMasterStationRow(masterOrWorker: Station): Promise<Station> {
  if (!/-L\d+$/i.test(masterOrWorker.station_number)) return masterOrWorker

  if (masterOrWorker.parent_station_id) {
    const { data, error } = await client()
      .from('stations')
      .select('*')
      .eq('id', masterOrWorker.parent_station_id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (data) return data as Station
  }

  const base = normalizeStationReferenceCode(masterOrWorker.station_number)
  const { data, error } = await client().from('stations').select('*').eq('is_active', true)
  if (error) throw new Error(error.message)
  const found = (data ?? []).find(
    s =>
      normalizeStationReferenceCode(s.station_number) === base &&
      !/-L\d+$/i.test(s.station_number) &&
      !s.parent_station_id
  ) as Station | undefined
  return found ?? masterOrWorker
}

/** يضمن أن خطوط العمال L1..Ln تطابق إجمالي عدد العمال على المحطة المرجعية */
export async function syncWorkerLinesToHeadcount(
  masterOrWorker: Station,
  headcount?: number | null
): Promise<Station[]> {
  const master = await resolveMasterStationRow(masterOrWorker)
  const target = resolveHeadcountTarget(master, headcount)
  const base = normalizeStationReferenceCode(master.station_number)
  const linkParentId = /-L\d+$/i.test(master.station_number) ? null : master.id

  let children: Record<string, unknown>[] = []
  if (linkParentId) {
    const { data, error: childErr } = await client()
      .from('stations')
      .select('*')
      .eq('parent_station_id', linkParentId)
      .order('station_number')
    if (childErr) throw new Error(childErr.message)
    children = (data ?? []) as Record<string, unknown>[]
  }

  const { data: bySuffix, error: suffixErr } = await client()
    .from('stations')
    .select('*')
    .ilike('station_number', `${base}-L%`)
    .order('station_number')
  if (suffixErr) throw new Error(suffixErr.message)

  const workersByIndex = new Map<number, Station>()
  const register = (row: Record<string, unknown>) => {
    const st = row as Station
    const idx = workerIndexFromStationCode(st.station_number)
    if (idx == null) return
    const existing = workersByIndex.get(idx)
    if (
      !existing ||
      (linkParentId && st.parent_station_id === linkParentId && existing.parent_station_id !== linkParentId)
    ) {
      workersByIndex.set(idx, st)
    }
  }
  for (const row of children ?? []) register(row)
  for (const row of bySuffix ?? []) register(row)

  const ensured: Station[] = []
  for (let i = 1; i <= target; i++) {
    const workerNum = composeStationNumber(base, `L${i}`)
    let worker = workersByIndex.get(i)

    if (worker) {
      if (!worker.is_active) {
        worker = await updateStation(worker.id, {
          is_active: true,
          ...(linkParentId ? { parent_station_id: linkParentId } : {})
        })
      } else if (linkParentId && worker.parent_station_id !== linkParentId) {
        worker = await updateStation(worker.id, { parent_station_id: linkParentId })
      }
      workersByIndex.set(i, worker)
      ensured.push(worker)
      continue
    }

    const { data: existing, error: existErr } = await client()
      .from('stations')
      .select('*')
      .eq('station_number', workerNum)
      .maybeSingle()
    if (existErr) throw new Error(existErr.message)

    if (existing) {
      worker = existing.is_active
        ? ((linkParentId && existing.parent_station_id !== linkParentId
            ? await updateStation(existing.id as string, { parent_station_id: linkParentId })
            : existing) as Station)
        : await updateStation(existing.id as string, {
            is_active: true,
            ...(linkParentId ? { parent_station_id: linkParentId } : {})
          })
    } else {
      worker = await createStation({
        station_number: workerNum,
        station_name: master.station_name,
        parent_station_id: linkParentId,
        work_area_id: master.work_area_id ?? null,
        line_name: master.line_name ?? null,
        station_type: master.station_type ?? 'main_line',
        sort_order: (master.sort_order ?? 0) + i,
        is_active: master.is_active !== false
      })
    }

    workersByIndex.set(i, worker)
    ensured.push(worker)
  }

  const l1 = workersByIndex.get(1)
  if (l1) {
    const moveFromIds = new Set<string>()
    if (linkParentId) moveFromIds.add(linkParentId)
    if (masterOrWorker.id !== l1.id) moveFromIds.add(masterOrWorker.id)
    if (master.id !== l1.id && master.id !== masterOrWorker.id) moveFromIds.add(master.id)
    for (const fromId of moveFromIds) {
      const { error: moveErr } = await client()
        .from('station_operations')
        .update({ station_id: l1.id })
        .eq('station_id', fromId)
        .eq('is_active', true)
      if (moveErr) throw new Error(moveErr.message)
    }
  }

  for (const [idx, worker] of workersByIndex) {
    if (idx <= target || !worker.is_active) continue
    const opCount = await countActiveOperations(worker.id)
    if (opCount === 0) await deactivateStation(worker.id)
  }

  return ensured.sort(
    (a, b) =>
      (workerIndexFromStationCode(a.station_number) ?? 0) -
      (workerIndexFromStationCode(b.station_number) ?? 0)
  )
}

/** يضمن وجود خطوط العمال حسب إجمالي عدد العمال (أو L1 على الأقل) */
export async function ensureFirstWorkerLine(master: Station): Promise<Station> {
  const lines = await syncWorkerLinesToHeadcount(master)
  return lines.find(l => workerIndexFromStationCode(l.station_number) === 1) ?? lines[0] ?? master
}

/** مزامنة خطوط العمال لكل المحطات التي يقل فيها عدد الخطوط عن إجمالي العمال */
export async function syncAllWorkerHeadcountsFromGroups(
  parentGroups: ParentStationOperationsGroup[],
  allStations: Station[]
): Promise<boolean> {
  let changed = false
  for (const parent of parentGroups) {
    const target = parent.headcountWorkersOverride ?? parent.totalWorkers ?? 0
    if (target < 1 || countWorkerLines(parent) >= target) continue
    const master = resolveMasterStationRecord(parent, allStations)
    if (!master) continue
    await syncWorkerLinesToHeadcount(master, target)
    changed = true
  }
  return changed
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
