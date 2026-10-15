import { isPendingBomItemId } from '../../Utils/iplModelParts'
import { iplOperationName } from '../../Utils/iplOperationKind'
import { iplPartIdFromNotes, iplPartNote, type IplStationPart } from '../../Utils/iplStationParts'
import type { StationOperationDetail } from '../../Types/timeStudy'
import { addOperationPart } from '../operationPartsService'
import { createStationOperation, deactivateStationOperation, moveStationOperation, updateIplOperationLabel } from './operationsCrud'

export async function assignIplPartToWorkerLine(input: {
  part: IplStationPart
  workerStationId: string | null
  parentModelId: string
  operationType: string
  operationKind?: string
  operations: StationOperationDetail[]
}): Promise<void> {
  const existing = input.operations.find(op => iplPartIdFromNotes(op.notes) === input.part.partId) ?? null
  const operationNameAr = iplOperationName(
    input.operationKind ?? '',
    input.part.partName === '—' ? input.part.partNumber : input.part.partName
  )
  if (!input.workerStationId) {
    if (existing) await deactivateStationOperation(existing.id)
    return
  }
  if (!existing) {
    const operationId = await createStationOperation(input.workerStationId, {
      toolSpec: null,
      operationNameAr,
      operationNameEn: null,
      operationType: input.operationType,
      parentModelId: input.parentModelId,
      standardTimeSeconds: null,
      standardTimeMinutes: null,
      workerTimeMinutes: null,
      requiredManpowerCount: 1,
      technicianPosition: null,
      taskPrecedence: null,
      rankedPositionalWeight: null,
      zoningConstraints: null,
      notes: iplPartNote(input.part.partId),
      isCritical: false,
      hardware: []
    })
    await addOperationPart({
      operation_id: operationId,
      part_id: input.part.partId,
      bom_item_id: isPendingBomItemId(input.part.bomItemId) ? null : input.part.bomItemId,
      quantity: input.part.quantity
    })
    return
  }
  if (existing.stationId !== input.workerStationId) {
    await moveStationOperation(existing.id, input.workerStationId)
  }
  if (
    existing.operationNameAr !== operationNameAr ||
    existing.operationType !== input.operationType ||
    existing.parentModelId !== input.parentModelId
  ) {
    await updateIplOperationLabel(existing.id, {
      operationNameAr,
      operationType: input.operationType,
      parentModelId: input.parentModelId
    })
  }
}
