import {
  formatStationDisplayCode,
  formatStationWorkerDisplayCode,
  inferParentStationCode,
  normalizeStationBaseCode,
  normalizeStationReferenceCode,
  workerIndexFromStationCode
} from '../../Utils/stationHierarchy'
import type {
  OperationHardware,
  ParentStationOperationsGroup,
  StationOperationDetail,
  WorkerOperationsGroup
} from '../../Types/timeStudy'
import {
  client,
  type OpRow,
  type StationMeta,
  mapOp,
  sumWorkerMinutes,
  isParentContainerRow,
  makeWorkerGroup,
  hasChildWorkerLines,
  findMasterStationMeta
} from './shared'

type ParentBucket = { parent: StationMeta | null; parentCode: string; workers: WorkerOperationsGroup[] }

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
  const parentMeta = parentId ? (stationMeta.get(parentId) ?? null) : null
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

function enrichWorkersForHeadcount(group: ParentStationOperationsGroup, stationMeta: Map<string, StationMeta>): void {
  const base = normalizeStationReferenceCode(group.stationNumber)
  const masterMeta = findMasterStationMeta(base, stationMeta)
  const target = masterMeta?.headcountWorkers ?? group.headcountWorkersOverride ?? group.totalWorkers ?? 0
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

  group.workers.sort((a, b) => a.sortOrder - b.sortOrder || (a.workerIndex ?? 99) - (b.workerIndex ?? 99))
}

async function loadOperationsRows(): Promise<OpRow[]> {
  let res = await client()
    .from('station_operations')
    .select(
      '*, stations(station_number, station_name, worker1_operations_summary, sort_order, parent_station_id, line_name, work_areas(name))'
    )
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
      .select(
        '*, stations(station_number, station_name, worker1_operations_summary, sort_order, parent_station_id, line_name, work_areas(name))'
      )
      .eq('is_active', true)
      .order('sequence_no')
  }
  if (res.error) throw new Error(res.error.message)
  return (res.data ?? []) as unknown as OpRow[]
}

export async function loadStationMeta(): Promise<Map<string, StationMeta>> {
  const fullSelect =
    'id, station_number, station_name, parent_station_id, sort_order, line_name, work_area_id, worker1_operations_summary, headcount_workers, avg_station_time_minutes, work_areas(name)'
  let rows: Record<string, unknown>[]
  const { data, error } = await client().from('stations').select(fullSelect).eq('is_active', true)
  if (error?.message.includes('worker1_operations_summary') || error?.message.includes('headcount_workers')) {
    const retry = await client()
      .from('stations')
      .select(
        'id, station_number, station_name, parent_station_id, sort_order, line_name, work_area_id, work_areas(name)'
      )
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
    const modelName = row.parent_model_id ? (parentModelNames.get(row.parent_model_id) ?? null) : null
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
    const workers = bucket.workers.sort(
      (a, b) => a.sortOrder - b.sortOrder || (a.workerIndex ?? 99) - (b.workerIndex ?? 99)
    )
    const workerMeta = workers[0] ? stationMeta.get(workers[0].stationId) : null
    const codeSource = p?.station_number ?? workerMeta?.station_number ?? bucket.parentCode
    const resolvedCode = normalizeStationReferenceCode(codeSource)
    const masterMeta = findMasterStationMeta(resolvedCode, stationMeta)
    const commonName =
      p?.station_name?.trim() || masterMeta?.station_name?.trim() || workerMeta?.station_name?.trim() || resolvedCode
    const workerTotals = workers.map(w => w.totalWorkerTimeMinutes).filter(t => t > 0)
    const computedWorkers = workers.length
    const computedAvg = workerTotals.length ? workerTotals.reduce((s, t) => s + t, 0) / workerTotals.length : null
    const headcount = masterMeta?.headcountWorkers ?? p?.headcountWorkers ?? workerMeta?.headcountWorkers ?? null

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
        (workers[0] ? (stationMeta.get(workers[0].stationId)?.workAreaName ?? null) : null),
      lineName: p?.line_name ?? masterMeta?.line_name ?? workerMeta?.line_name ?? null,
      headcountWorkersOverride: headcount,
      avgStationTimeOverride:
        p?.avgStationTimeMinutes ?? masterMeta?.avgStationTimeMinutes ?? workerMeta?.avgStationTimeMinutes ?? null,
      totalWorkers: headcount ?? computedWorkers,
      avgStationTimeMinutes:
        p?.avgStationTimeMinutes ??
        masterMeta?.avgStationTimeMinutes ??
        workerMeta?.avgStationTimeMinutes ??
        computedAvg,
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

export async function getStationOperationsGroups() {
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
