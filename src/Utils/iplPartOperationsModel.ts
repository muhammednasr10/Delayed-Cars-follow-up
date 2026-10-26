import type { ParentStationOperationsGroup, StationOperationDetail, WorkerOperationsGroup } from '../Types/timeStudy'
import type { IplCompareRow } from './iplModelCompare'
import { modelQtyForBomRow } from './bomQtyByModel'
import { displayBomStationCode } from './bomStationCode'
import { iplFitStatusForModel } from './iplFitStatus'
import { DEFAULT_IPL_OPERATION_KIND, iplOperationKindFromName, iplPartNameFromOperation } from './iplOperationKind'
import { iplDisplayPartNumber } from './iplModelParts'
import {
  iplPartCopyFromNotes,
  iplPartIdFromNotes,
  iplPartNumberFromNotes,
  iplPartStationFromNotes,
  iplStationKey,
  type IplStationPart
} from './iplStationParts'
import { formatStationWorkerDisplayCode } from './stationHierarchy'
import { normalizePartNumber } from './partNumberNormalize'

export type LinkedHardwarePartRef = {
  partNumber: string
  partName: string | null
  qty: number
}

export type IplPartOpSlot = { kind: string; workerId: string; stationKey: string }

function partIdFromCompareRow(row: IplCompareRow): string | null {
  const items = [...row.byModel.values()]
  return items.find(item => item.part_id)?.part_id ?? items[0]?.part_id ?? null
}

export type IplPartWorkerChoice = {
  stationId: string
  stationKey: string
  stationLabel: string
  label: string
}

export type IplPartStationChoice = { key: string; label: string }

export type IplPartModelGroup = {
  partNumber: string
  models: string[]
  stationKey: string
  stationLabel: string
}

export type IplPartStationGroup = {
  stationKey: string
  stationLabel: string
  models: string[]
  partNumbers: string[]
}

export type HardwareParentLink = {
  parentPartId: string
  parentName: string
  workerId: string
  workerLabel: string
  stationKey: string
}

export const IPL_PART_OPS_MAX = 12

export function emptyIplPartOpSlot(stationKey: string): IplPartOpSlot {
  return { kind: DEFAULT_IPL_OPERATION_KIND, workerId: '', stationKey }
}

function workerLabel(worker: WorkerOperationsGroup): string {
  const code = formatStationWorkerDisplayCode(worker.displayCode || worker.stationNumber)
  const line = code.match(/L\d+/i)?.[0]?.toUpperCase() ?? code
  const name = worker.worker1OperationsSummary?.trim()
  return name ? `${line} — ${name}` : line
}

export function fittedModelsForPartOps(row: IplCompareRow, models: string[]) {
  return models.flatMap(model => {
    const item = row.byModel.get(model)
    if (!item || iplFitStatusForModel(item, model) !== 'fitted') return []
    const partNumber = iplDisplayPartNumber(item.part_number)
    const station = displayBomStationCode(item.station_code_text || item.station_number || '') || '—'
    const quantity = modelQtyForBomRow(item, model) || item.quantity || 0
    return [{ model, item, partNumber, station, quantity }]
  })
}

export function toStationPartFromCompare(row: IplCompareRow, models: string[]): IplStationPart | null {
  const partId = partIdFromCompareRow(row)
  if (!partId) return null
  const fitted = fittedModelsForPartOps(row, models)
  const first = fitted[0]
  return {
    bomItemId: first?.item.id || partId,
    partId,
    partNumber: first?.partNumber ?? '',
    partName: row.partNameAr && row.partNameAr !== '—' ? row.partNameAr : row.partNameEn || '—',
    quantity: first?.quantity || 0,
    models: fitted.map(entry => ({
      modelName: entry.model,
      partNumber: entry.partNumber,
      quantity: entry.quantity
    }))
  }
}

export function groupStationKey(group: ParentStationOperationsGroup): string {
  return iplStationKey(group.stationNumber) || iplStationKey(group.displayCode)
}

export function homeStationKey(row: IplCompareRow, models: string[]): string {
  const counts = new Map<string, number>()
  for (const entry of fittedModelsForPartOps(row, models)) {
    const key = iplStationKey(entry.item.station_code_text || entry.item.station_number || '')
    if (!key) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
}

export function modelGroupsOf(row: IplCompareRow, models: string[]): IplPartModelGroup[] {
  const map = new Map<string, IplPartModelGroup>()
  for (const entry of fittedModelsForPartOps(row, models)) {
    const stationKey = iplStationKey(entry.item.station_code_text || entry.item.station_number || '')
    const group = map.get(entry.partNumber) ?? {
      partNumber: entry.partNumber,
      models: [],
      stationKey,
      stationLabel: entry.station
    }
    group.models.push(entry.model)
    if (!group.stationKey && stationKey) {
      group.stationKey = stationKey
      group.stationLabel = entry.station
    }
    map.set(entry.partNumber, group)
  }
  return [...map.values()]
}

export function stationGroupsOf(row: IplCompareRow, models: string[]): IplPartStationGroup[] {
  const map = new Map<string, IplPartStationGroup>()
  for (const entry of fittedModelsForPartOps(row, models)) {
    const stationKey = iplStationKey(entry.item.station_code_text || entry.item.station_number || '')
    if (!stationKey) continue
    const group = map.get(stationKey) ?? {
      stationKey,
      stationLabel: entry.station,
      models: [],
      partNumbers: []
    }
    if (!group.models.includes(entry.model)) group.models.push(entry.model)
    if (entry.partNumber && !group.partNumbers.includes(entry.partNumber)) {
      group.partNumbers.push(entry.partNumber)
    }
    map.set(stationKey, group)
  }
  return [...map.values()]
}

export function partFitsMultipleStations(row: IplCompareRow, models: string[]): boolean {
  return stationGroupsOf(row, models).length > 1
}

export type StoredIplPartAssignment = {
  partNumber: string
  stationKey: string
  noteStation: string
  copyIndex: number
  slot: IplPartOpSlot
}

export function readStoredIplPartAssignments(
  groups: ParentStationOperationsGroup[],
  partId: string
): StoredIplPartAssignment[] {
  const seen = new Set<string>()
  const stored: StoredIplPartAssignment[] = []
  for (const group of groups) {
    const stationKey = groupStationKey(group)
    for (const worker of group.workers) {
      for (const operation of worker.operations) {
        if (iplPartIdFromNotes(operation.notes) !== partId) continue
        const partNumber = iplPartNumberFromNotes(operation.notes)
        const copyIndex = iplPartCopyFromNotes(operation.notes)
        const notedStation = iplPartStationFromNotes(operation.notes)
        const stationFromNote = notedStation || stationKey
        const key = `${partNumber}#${copyIndex}#${stationFromNote}`
        if (seen.has(key)) continue
        seen.add(key)
        stored.push({
          partNumber,
          stationKey: stationFromNote,
          noteStation: notedStation,
          copyIndex,
          slot: {
            kind: iplOperationKindFromName(operation.operationNameAr) || DEFAULT_IPL_OPERATION_KIND,
            workerId: worker.stationId,
            stationKey: stationFromNote
          }
        })
      }
    }
  }
  return stored.sort((a, b) => a.copyIndex - b.copyIndex)
}

export function readLinkedHardwareForPart(
  groups: ParentStationOperationsGroup[],
  partId: string
): LinkedHardwarePartRef[] {
  const seen = new Set<string>()
  const linked: LinkedHardwarePartRef[] = []
  for (const group of groups) {
    for (const worker of group.workers) {
      for (const operation of worker.operations) {
        if (iplPartIdFromNotes(operation.notes) !== partId) continue
        for (const hardware of operation.hardware) {
          const partNumber = hardware.hardwareName.trim()
          if (!partNumber || seen.has(partNumber)) continue
          seen.add(partNumber)
          linked.push({
            partNumber,
            partName: hardware.hardwareSize,
            qty: hardware.hardwareQty != null && hardware.hardwareQty > 0 ? hardware.hardwareQty : 1
          })
        }
      }
    }
  }
  return linked
}

export function readHardwareParentLinks(
  groups: ParentStationOperationsGroup[],
  hardwarePartNumbers: string[]
): HardwareParentLink[] {
  const keys = new Set(hardwarePartNumbers.map(number => normalizePartNumber(number)).filter(Boolean))
  if (keys.size === 0) return []
  const links: HardwareParentLink[] = []
  const seen = new Set<string>()
  for (const group of groups) {
    const stationKey = groupStationKey(group)
    for (const worker of group.workers) {
      for (const operation of worker.operations) {
        const parentPartId = iplPartIdFromNotes(operation.notes)
        if (!parentPartId) continue
        const linked = operation.hardware.some(item => keys.has(normalizePartNumber(item.hardwareName)))
        if (!linked) continue
        const id = `${parentPartId}#${worker.stationId}`
        if (seen.has(id)) continue
        seen.add(id)
        const parentName = iplPartNameFromOperation(operation.operationNameAr) || operation.operationNameAr
        links.push({
          parentPartId,
          parentName,
          workerId: worker.stationId,
          workerLabel: workerLabel(worker),
          stationKey
        })
      }
    }
  }
  return links
}

export function placementsOf(
  row: IplCompareRow,
  modelNames: string[]
): { partNumber: string; stationKey: string; stationLabel: string }[] {
  const map = new Map<string, { partNumber: string; stationKey: string; stationLabel: string }>()
  for (const entry of fittedModelsForPartOps(row, modelNames)) {
    const stationKey = iplStationKey(entry.item.station_code_text || entry.item.station_number || '')
    const id = `${stationKey}@@${entry.partNumber}`
    if (!map.has(id)) map.set(id, { partNumber: entry.partNumber, stationKey, stationLabel: entry.station })
  }
  return [...map.values()]
}

export function slotsForPartNumber(
  stored: { partNumber: string; copyIndex: number; slot: IplPartOpSlot }[],
  partNumber: string,
  fallback: string
): IplPartOpSlot[] {
  const matches = stored.filter(item => item.partNumber === partNumber).sort((a, b) => a.copyIndex - b.copyIndex)
  if (matches.length === 0) return [emptyIplPartOpSlot(fallback)]
  const rows: IplPartOpSlot[] = []
  for (const item of matches) rows[item.copyIndex] = item.slot
  return rows.map(slot => {
    const next = slot ?? emptyIplPartOpSlot(fallback)
    return { ...next, kind: next.kind || DEFAULT_IPL_OPERATION_KIND }
  })
}

export function slotsForStation(
  stored: StoredIplPartAssignment[],
  stationKey: string,
  fallback: string
): IplPartOpSlot[] {
  const matches = stored
    .filter(item => item.stationKey === stationKey || item.noteStation === stationKey)
    .sort((a, b) => a.copyIndex - b.copyIndex)
  if (matches.length === 0) return [emptyIplPartOpSlot(fallback)]
  const byCopy = new Map<number, IplPartOpSlot>()
  for (const item of matches) {
    if (!byCopy.has(item.copyIndex)) byCopy.set(item.copyIndex, item.slot)
  }
  return [...byCopy.keys()]
    .sort((a, b) => a - b)
    .map(index => {
      const next = byCopy.get(index) ?? emptyIplPartOpSlot(fallback)
      return { ...next, kind: next.kind || DEFAULT_IPL_OPERATION_KIND }
    })
}

export function stationChoices(groups: ParentStationOperationsGroup[]): IplPartStationChoice[] {
  const choices: IplPartStationChoice[] = []
  for (const group of groups) {
    const key = groupStationKey(group)
    if (!key || group.workers.length === 0) continue
    choices.push({
      key,
      label: group.stationName ? `${group.displayCode} — ${group.stationName}` : group.displayCode
    })
  }
  return choices
}

export function workersForStation(
  groups: ParentStationOperationsGroup[],
  stationKey: string
): IplPartWorkerChoice[] {
  const choices: IplPartWorkerChoice[] = []
  for (const group of groups) {
    const key = groupStationKey(group)
    if (!stationKey || key !== stationKey) continue
    const stationLabel = group.stationName ? `${group.displayCode} — ${group.stationName}` : group.displayCode
    for (const worker of group.workers) {
      choices.push({
        stationId: worker.stationId,
        stationKey: key,
        stationLabel,
        label: workerLabel(worker)
      })
    }
  }
  return choices
}

export function compareRowPartNumberKeys(row: IplCompareRow, models: string[]): string[] {
  const keys = new Set<string>()
  for (const model of models) {
    const pn = iplDisplayPartNumber(row.byModel.get(model)?.part_number)
    if (pn) keys.add(normalizePartNumber(pn))
  }
  return [...keys]
}

/** One IPL part on a worker should appear once per copy, even if models use different part numbers. */
export function dedupeIplOperationsOnWorker(ops: StationOperationDetail[]): StationOperationDetail[] {
  const kept: StationOperationDetail[] = []
  const indexByKey = new Map<string, number>()
  for (const op of ops) {
    const partId = iplPartIdFromNotes(op.notes)
    if (!partId) {
      kept.push(op)
      continue
    }
    const key = `${partId}#${iplPartCopyFromNotes(op.notes)}`
    const existingAt = indexByKey.get(key)
    if (existingAt == null) {
      indexByKey.set(key, kept.length)
      kept.push(op)
      continue
    }
    const current = kept[existingAt]
    const preferNext = !iplPartNumberFromNotes(op.notes) && Boolean(iplPartNumberFromNotes(current.notes))
    if (preferNext) kept[existingAt] = op
  }
  return kept
}

export function iplQtyByPartNumberKey(rows: IplCompareRow[], models: string[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const row of rows) {
    for (const model of models) {
      const item = row.byModel.get(model)
      if (!item) continue
      const pn = iplDisplayPartNumber(item.part_number)
      if (!pn) continue
      const key = normalizePartNumber(pn)
      const qty = modelQtyForBomRow(item, model) || item.quantity || 0
      if (qty > 0) map.set(key, Math.max(map.get(key) ?? 0, qty))
    }
  }
  return map
}
