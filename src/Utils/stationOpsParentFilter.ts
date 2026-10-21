import type { ParentStationOperationsGroup } from '../Types/timeStudy'
import type { VehicleModel } from '../Types/settings'
import { MODEL_LINES, modelBelongsToLine, type ModelLine } from './modelLines'
import { operationMatchesLineFilter } from './operationClassification'

function lineForModelName(name: string): ModelLine | undefined {
  return MODEL_LINES.find(line => modelBelongsToLine(name, line))
}

/** Filter parent station groups to operations that match the selected IPL models. */
export function filterParentsForSelectedModels(
  parentGroups: ParentStationOperationsGroup[],
  selectedModels: VehicleModel[]
): ParentStationOperationsGroup[] {
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
    .map(parent => ({
      ...parent,
      workers: parent.workers.map(worker => ({
        ...worker,
        operations: worker.operations.filter(op => {
          if ((op.operationType || '').trim().toLowerCase() === 'common') return true
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
        })
      }))
    }))
    .filter(parent => parent.workers.length > 0)
}
