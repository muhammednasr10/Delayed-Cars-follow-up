import type { ParentStationOperationsGroup, StationOperationDetail, WorkerOperationsGroup } from '../Types/timeStudy'
import type { VehicleModel } from '../Types/settings'
import { MODEL_LINES, modelBelongsToLine, type ModelLine } from './modelLines'
import { operationMatchesLineFilter } from './operationClassification'
import { workerIndexFromStationCode } from './stationHierarchy'

function lineForModelName(name: string): ModelLine | undefined {
  return MODEL_LINES.find(line => modelBelongsToLine(name, line))
}

function isCommonOperation(op: Pick<StationOperationDetail, 'operationType'>): boolean {
  return (op.operationType || '').trim().toLowerCase() === 'common'
}

function workerLineIndex(worker: WorkerOperationsGroup): number | null {
  return worker.workerIndex ?? workerIndexFromStationCode(worker.stationNumber) ?? workerIndexFromStationCode(worker.displayCode)
}

function operationMatchesSelectedModels(
  op: StationOperationDetail,
  selectedModels: VehicleModel[],
  selectedIds: Set<string>,
  familyIds: Set<string>,
  lineByModelId: Map<string, ModelLine>,
  variantNamesByLine: Map<ModelLine, string[]>
): boolean {
  if (isCommonOperation(op)) return true
  if (op.parentModelId && selectedIds.has(op.parentModelId)) return true
  if (op.parentModelId && familyIds.has(op.parentModelId)) {
    for (const model of selectedModels) {
      const line = lineByModelId.get(model.id)
      if (!line) continue
      const variants = variantNamesByLine.get(line) ?? []
      if (operationMatchesLineFilter(op.operationType, line, model.name, variants)) return true
    }
    return false
  }
  return selectedModels.some(model => op.operationType.trim() === model.name)
}

function maxWorkerIndex(
  workers: WorkerOperationsGroup[],
  match: (worker: WorkerOperationsGroup) => boolean
): number | null {
  let max: number | null = null
  for (const worker of workers) {
    if (!match(worker)) continue
    const idx = workerLineIndex(worker)
    if (idx == null) continue
    max = max == null ? idx : Math.max(max, idx)
  }
  return max
}

export type StationOpsModelFilterOptions = {
  /** When a subset of models is selected, hide extra worker lines the model does not use. */
  trimWorkerLines?: boolean
  /** Stored per-line headcount for the current filter (stationId → worker cap). */
  headcountCapByStationId?: Map<string, number>
}

/** Filter parent station groups to operations (and worker lines) that match the selected IPL models. */
export function filterParentsForSelectedModels(
  parentGroups: ParentStationOperationsGroup[],
  selectedModels: VehicleModel[],
  options?: StationOpsModelFilterOptions
): ParentStationOperationsGroup[] {
  const trimWorkerLines = Boolean(options?.trimWorkerLines)
  const headcountCapByStationId = options?.headcountCapByStationId

  if (selectedModels.length === 0) {
    return parentGroups
      .map(parent => ({
        ...parent,
        workers: parent.workers.map(worker => ({ ...worker, operations: [] }))
      }))
      .filter(parent => parent.workers.length > 0)
  }

  const selectedIds = new Set(selectedModels.map(model => model.id))
  const familyIds = new Set(
    selectedModels.map(model => model.parent_model_id).filter((id): id is string => Boolean(id))
  )

  const lineByModelId = new Map<string, ModelLine>()
  const variantNamesByLine = new Map<ModelLine, string[]>()
  for (const model of selectedModels) {
    const line = lineForModelName(model.name)
    if (!line) continue
    lineByModelId.set(model.id, line)
    const list = variantNamesByLine.get(line) ?? []
    list.push(model.name)
    variantNamesByLine.set(line, list)
  }

  return parentGroups
    .map(parent => {
      const workers = parent.workers.map(worker => ({
        ...worker,
        operations: worker.operations.filter(op =>
          operationMatchesSelectedModels(op, selectedModels, selectedIds, familyIds, lineByModelId, variantNamesByLine)
        )
      }))

      const storedCap =
        (parent.stationId && headcountCapByStationId?.get(parent.stationId)) ||
        headcountCapByStationId?.get(parent.stationNumber) ||
        null

      const shouldTrim = Boolean(storedCap) || trimWorkerLines
      if (!shouldTrim) {
        return { ...parent, workers }
      }

      const specificMax = maxWorkerIndex(workers, w => w.operations.some(op => !isCommonOperation(op)))
      const anyMax = maxWorkerIndex(workers, w => w.operations.length > 0)
      const cap = storedCap ?? specificMax ?? anyMax
      if (cap == null) {
        return { ...parent, workers: workers.filter(w => w.operations.length > 0) }
      }

      return {
        ...parent,
        workers: workers.filter(worker => {
          const idx = workerLineIndex(worker)
          if (idx == null) return worker.operations.length > 0
          return idx <= cap
        })
      }
    })
    .filter(parent => {
      const storedCap =
        (parent.stationId && headcountCapByStationId?.get(parent.stationId)) ||
        headcountCapByStationId?.get(parent.stationNumber)
      if (storedCap) return parent.workers.length > 0
      return trimWorkerLines ? parent.workers.some(w => w.operations.length > 0) : parent.workers.length > 0
    })
}
