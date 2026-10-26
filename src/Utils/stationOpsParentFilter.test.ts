import { describe, expect, it } from 'vitest'
import { filterParentsForSelectedModels } from './stationOpsParentFilter'
import type { ParentStationOperationsGroup, StationOperationDetail, WorkerOperationsGroup } from '../Types/timeStudy'
import type { VehicleModel } from '../Types/settings'

function model(id: string, name: string, parent_model_id: string | null = null): VehicleModel {
  return {
    id,
    name,
    model_kind: parent_model_id ? 'variant' : 'family',
    parent_model_id,
    parent_company: null,
    agency: null,
    is_active: true
  }
}

function op(id: string, operationType: string): StationOperationDetail {
  return {
    id,
    stationId: 'w',
    stationNumber: 'PBS01-L1',
    stationName: 'Rack',
    operationCode: id,
    operationNameAr: id,
    operationNameEn: null,
    operationType,
    parentModelId: null,
    parentModelName: null,
    technicianPosition: null,
    toolSpec: null,
    standardTimeSeconds: null,
    standardTimeMinutes: null,
    workerTimeMinutes: null,
    stationTimeMinutes: null,
    requiredManpowerCount: 1,
    taskPrecedence: null,
    rankedPositionalWeight: null,
    zoningConstraints: null,
    sequenceNo: 1,
    isCritical: false,
    isActive: true,
    notes: null,
    hardware: []
  }
}

function worker(index: number, operations: StationOperationDetail[]): WorkerOperationsGroup {
  return {
    stationId: `w${index}`,
    stationNumber: `PBS01-L${index}`,
    displayCode: `PBS01-L${index}`,
    workerIndex: index,
    stationName: 'Rack',
    worker1OperationsSummary: null,
    sortOrder: index,
    totalWorkerTimeMinutes: 0,
    operations
  }
}

function parent(workers: WorkerOperationsGroup[]): ParentStationOperationsGroup {
  return {
    stationId: 'p1',
    stationNumber: 'PBS-01',
    displayCode: 'PBS-01',
    stationName: 'الرفوف راك شمال',
    worker1OperationsSummary: null,
    workAreaId: null,
    workAreaName: null,
    lineName: null,
    totalWorkers: 6,
    avgStationTimeMinutes: null,
    headcountWorkersOverride: 6,
    avgStationTimeOverride: null,
    sortOrder: 1,
    workers
  }
}

const t7 = model('t7', 'T7-PRO/v2')
const t8 = model('t8', 'T8/v1')

const station = parent([
  worker(1, [op('c1', 'common'), op('a', 'T7-PRO/v2'), op('b', 'T8/v1')]),
  worker(2, [op('c2', 'common'), op('a2', 'T7-PRO/v2'), op('b2', 'T8/v1')]),
  worker(3, [op('c3', 'common'), op('a3', 'T7-PRO/v2')]),
  worker(4, [op('c4', 'common'), op('a4', 'T7-PRO/v2')]),
  worker(5, [op('c5', 'common'), op('b5', 'T8/v1')]),
  worker(6, [op('c6', 'common'), op('b6', 'T8/v1')])
])

describe('filterParentsForSelectedModels', () => {
  it('keeps all worker lines when not trimming', () => {
    const rows = filterParentsForSelectedModels([station], [t7])
    expect(rows[0].workers.map(w => w.workerIndex)).toEqual([1, 2, 3, 4, 5, 6])
    expect(rows[0].totalWorkers).toBe(6)
  })

  it('shows 4 workers for a model that only uses L1–L4', () => {
    const rows = filterParentsForSelectedModels([station], [t7], { trimWorkerLines: true })
    expect(rows[0].workers.map(w => w.workerIndex)).toEqual([1, 2, 3, 4])
    expect(rows[0].workers.flatMap(w => w.operations.map(o => o.operationType)).every(t => t === 'common' || t === 'T7-PRO/v2')).toBe(true)
  })

  it('shows 6 workers for a model that uses L1–L6', () => {
    const rows = filterParentsForSelectedModels([station], [t8], { trimWorkerLines: true })
    expect(rows[0].workers.map(w => w.workerIndex)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('uses the max worker count when two models are selected', () => {
    const rows = filterParentsForSelectedModels([station], [t7, t8], { trimWorkerLines: true })
    expect(rows[0].workers.map(w => w.workerIndex)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('hides a station with no operations for the selected model', () => {
    const other = parent([worker(1, [op('x', 'GD/v3')])])
    const rows = filterParentsForSelectedModels([other], [t7], { trimWorkerLines: true })
    expect(rows).toHaveLength(0)
  })

  it('uses stored T4 headcount even when all models are selected', () => {
    const rows = filterParentsForSelectedModels([station], [t7, t8], {
      headcountCapByStationId: new Map([['p1', 4]])
    })
    expect(rows[0].workers.map(w => w.workerIndex)).toEqual([1, 2, 3, 4])
  })
})
