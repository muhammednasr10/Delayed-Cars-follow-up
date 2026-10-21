import { isPendingBomItemId } from '../../Utils/iplModelParts'
import { iplOperationName } from '../../Utils/iplOperationKind'
import {
  iplPartCopyFromNotes,
  iplPartIdFromNotes,
  iplPartNote,
  iplPartNumberFromNotes,
  iplPartStationFromNotes,
  type IplStationPart
} from '../../Utils/iplStationParts'
import type { StationOperationDetail } from '../../Types/timeStudy'
import { addOperationPart } from '../operationPartsService'
import { client } from './shared'
import {
  createStationOperation,
  deactivateStationOperation,
  moveStationOperation,
  setStationOperationHardware,
  updateIplOperationLabel,
  type OperationHardwareInput
} from './operationsCrud'

export async function listAssignedIplPartIds(): Promise<Set<string>> {
  const { data, error } = await client()
    .from('station_operations')
    .select('notes')
    .eq('is_active', true)
    .like('notes', 'ipl-part:%')
  if (error) throw new Error(error.message)
  const ids = new Set<string>()
  for (const row of data ?? []) {
    const id = iplPartIdFromNotes((row as { notes: string | null }).notes)
    if (id) ids.add(id)
  }
  return ids
}

export async function assignIplPartToWorkerLine(input: {
  part: IplStationPart
  workerStationId: string | null
  parentModelId: string | null
  operationType: string
  operationKind?: string
  /** 0 is the original row. A higher index is a copy with its own operation type. */
  copyIndex?: number
  /** Set when each part number is assigned to its own worker. */
  partNumberKey?: string
  /** Keeps the same part number on every station the models use. */
  stationKey?: string
  /** When set, replaces the hardware linked to this operation. */
  hardware?: OperationHardwareInput[]
  operations: StationOperationDetail[]
}): Promise<void> {
  const copyIndex = input.copyIndex ?? 0
  const partNumberKey = input.partNumberKey?.trim() ?? ''
  const stationKey = input.stationKey?.trim() ?? ''
  const note = iplPartNote(input.part.partId, copyIndex, partNumberKey || undefined, stationKey || undefined)
  const matches = (op: StationOperationDetail, station: string) =>
    iplPartIdFromNotes(op.notes) === input.part.partId &&
    iplPartCopyFromNotes(op.notes) === copyIndex &&
    iplPartNumberFromNotes(op.notes) === partNumberKey &&
    iplPartStationFromNotes(op.notes) === station
  let existing = input.operations.find(op => matches(op, stationKey)) ?? null
  if (!existing && stationKey) {
    existing = input.operations.find(op => matches(op, '')) ?? null
  }
  const operationName = iplOperationName(
    input.operationKind ?? '',
    input.part.partName === '—' ? input.part.partNumber : input.part.partName
  )
  const operationNameAr = partNumberKey ? `${operationName} · ${partNumberKey}` : operationName
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
      notes: note,
      isCritical: false,
      hardware: input.hardware ?? []
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
    existing.stationId = input.workerStationId
  }
  if (existing.notes !== note) {
    const { error } = await client().from('station_operations').update({ notes: note }).eq('id', existing.id)
    if (error) throw new Error(error.message)
    existing.notes = note
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
  if (input.hardware) await setStationOperationHardware(existing.id, input.hardware)
}
