import { operationMatchesLineFilter } from './operationClassification'
import type { ModelLine } from './modelLines'
import type { ParentStationOperationsGroup } from '../Types/timeStudy'

export function filterParentGroupsByLine(
  parentGroups: ParentStationOperationsGroup[],
  activeLine: ModelLine,
  activeVariant: string,
  lineVariants: string[],
  lineFamilyId: string | null
): ParentStationOperationsGroup[] {
  return parentGroups
    .map(p => ({
      ...p,
      workers: p.workers.map(w => ({
        ...w,
        operations: w.operations.filter(op => {
          if (lineFamilyId && op.parentModelId && op.parentModelId !== lineFamilyId) return false
          return operationMatchesLineFilter(op.operationType, activeLine, activeVariant, lineVariants)
        })
      }))
    }))
    .filter(p => p.workers.length > 0)
}
