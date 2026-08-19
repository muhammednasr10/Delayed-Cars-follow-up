import { supabase } from '../../lib/supabase'
import {
  inferParentStationCode,
  normalizeStationReferenceCode,
  workerIndexFromStationCode
} from '../../Utils/stationHierarchy'
import type {
  OperationHardware,
  StationOperationDetail
} from '../../Types/timeStudy'

export function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export type StationJoin = {
  station_number: string
  station_name: string
  worker1_operations_summary?: string | null
  sort_order: number | null
  parent_station_id?: string | null
  line_name?: string | null
  work_areas?: { name: string } | null
}

export type OpRow = {
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

export type StationMeta = {
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

export function mapOp(r: OpRow, hardware: OperationHardware[], parentModelName?: string | null): StationOperationDetail {
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

export function operationStandardMinutes(op: StationOperationDetail): number {
  if (op.standardTimeMinutes != null && Number.isFinite(op.standardTimeMinutes)) return op.standardTimeMinutes
  if (op.standardTimeSeconds != null && Number.isFinite(op.standardTimeSeconds)) return op.standardTimeSeconds / 60
  return 0
}

export function sumWorkerMinutes(ops: StationOperationDetail[]): number {
  return ops.reduce((s, o) => s + operationStandardMinutes(o), 0)
}

export function isParentContainerRow(meta: StationMeta, allMeta: Map<string, StationMeta>): boolean {
  if (inferParentStationCode(meta.station_number)) return false
  for (const other of allMeta.values()) {
    if (other.parent_station_id === meta.id) return true
  }
  return false
}

export function makeWorkerGroup(
  childId: string,
  meta: StationMeta | null,
  stNum: string,
  childOps: StationOperationDetail[]
): import('../../Types/timeStudy').WorkerOperationsGroup {
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

export function hasChildWorkerLines(parentId: string, stationMeta: Map<string, StationMeta>): boolean {
  for (const meta of stationMeta.values()) {
    if (meta.parent_station_id === parentId) return true
  }
  return false
}

export function findMasterStationMeta(baseCode: string, stationMeta: Map<string, StationMeta>): StationMeta | null {
  const norm = normalizeStationReferenceCode(baseCode)
  for (const meta of stationMeta.values()) {
    if (meta.parent_station_id) continue
    if (/-L\d+$/i.test(meta.station_number)) continue
    if (normalizeStationReferenceCode(meta.station_number) === norm) return meta
  }
  return null
}
