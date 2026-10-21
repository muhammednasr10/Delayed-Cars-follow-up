import type { ParentStationOperationsGroup, WorkerOperationsGroup } from '../Types/timeStudy'
import type { IplCompareRow } from './iplModelCompare'
import { modelQtyForBomRow } from './bomQtyByModel'
import { displayBomStationCode } from './bomStationCode'
import { iplFitStatusForModel } from './iplFitStatus'
import { iplOperationKindFromName } from './iplOperationKind'
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

export type LinkedHardwarePartRef = {
  partNumber: string
  partName: string | null
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

export const IPL_PART_OPS_MAX = 12

export function emptyIplPartOpSlot(stationKey: string): IplPartOpSlot {
  return { kind: '', workerId: '', stationKey }
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
            kind: iplOperationKindFromName(operation.operationNameAr),
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
          linked.push({ partNumber, partName: hardware.hardwareSize })
        }
      }
    }
  }
  return linked
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
  return rows.map(slot => slot ?? emptyIplPartOpSlot(fallback))
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
