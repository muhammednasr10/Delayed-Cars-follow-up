import { assignIplPartToWorkerLine } from '../services/stationOperationsService'
import { lookupPartByNumber } from '../services/operationPartsService'
import type { ParentStationOperationsGroup } from '../Types/timeStudy'
import type { VehicleModel } from '../Types/settings'
import type { IplCompareRow } from '../Utils/iplModelCompare'
import {
  emptyIplPartOpSlot,
  placementsOf,
  readStoredIplPartAssignments,
  toStationPartFromCompare,
  workersForStation,
  type IplPartOpSlot,
  type IplPartStationGroup,
  type LinkedHardwarePartRef
} from '../Utils/iplPartOperationsModel'
import { workerIndexFromStationCode } from '../Utils/stationHierarchy'
import { normalizePartNumber } from '../Utils/partNumberNormalize'

export type SaveIplPartOperationsInput = {
  row: IplCompareRow
  models: string[]
  groups: ParentStationOperationsGroup[]
  vehicleModels: VehicleModel[]
  multi: boolean
  byStation: boolean
  homeKey: string
  rows: IplPartOpSlot[]
  groupRows: Record<string, IplPartOpSlot[]>
  stationGroups: IplPartStationGroup[]
  fittedModelNames: string[]
  linkHardware: boolean
  linkedHardware: LinkedHardwarePartRef[]
  t: (key: string, vars?: Record<string, string | number>) => string
}

function workerOnStation(
  groups: ParentStationOperationsGroup[],
  stationKey: string,
  preferredId: string
): string {
  const choices = workersForStation(groups, stationKey)
  if (choices.some(worker => worker.stationId === preferredId)) return preferredId
  const preferred = groups.flatMap(group => group.workers).find(worker => worker.stationId === preferredId)
  const lineIndex = preferred ? workerIndexFromStationCode(preferred.stationNumber) : null
  if (lineIndex != null) {
    const sameLine = choices.find(choice => {
      const worker = groups.flatMap(group => group.workers).find(item => item.stationId === choice.stationId)
      return worker != null && workerIndexFromStationCode(worker.stationNumber) === lineIndex
    })
    if (sameLine) return sameLine.stationId
  }
  return choices[0]?.stationId ?? ''
}

/** Persist IPL part → worker assignments. Returns an error message or null on success. */
export async function saveIplPartOperations(input: SaveIplPartOperationsInput): Promise<string | null> {
  const {
    row,
    models,
    groups,
    vehicleModels,
    multi,
    byStation,
    homeKey,
    rows,
    groupRows,
    stationGroups,
    fittedModelNames,
    linkHardware,
    linkedHardware,
    t
  } = input

  const stationPart = toStationPartFromCompare(row, models)
  if (!stationPart) return t('common.error')

  const sharedRows = multi
    ? rows
    : [{ kind: rows[0]?.kind ?? '', workerId: rows[0]?.workerId ?? '', stationKey: homeKey }]
  const grouped = stationGroups.map(group => {
    const slots = groupRows[group.stationKey] ?? [emptyIplPartOpSlot(group.stationKey)]
    const active = multi
      ? slots
      : [
          {
            ...slots[0],
            stationKey: group.stationKey,
            kind: slots[0]?.kind ?? '',
            workerId: slots[0]?.workerId ?? ''
          }
        ]
    return { group, active }
  })

  if (!byStation && multi && sharedRows.length < 2) return t('bom.partOps.needCount')
  if (
    byStation &&
    grouped.some(
      item => item.active.length === 0 || item.active.some(slot => !slot.kind || !slot.workerId)
    )
  ) {
    return t('bom.partOps.needKindWorker')
  }
  if (!byStation && sharedRows.some(slot => !slot.kind || !slot.workerId || (multi && !slot.stationKey))) {
    return t('bom.partOps.needKindWorker')
  }
  if (linkHardware && linkedHardware.length === 0) return t('bom.partOps.needHardware')

  const catalog = vehicleModels.filter(model => fittedModelNames.includes(model.name))
  const parentModel = catalog[0]
  if (!parentModel) return t('bom.partOps.noModel')

  const operations = groups.flatMap(group => group.workers.flatMap(worker => worker.operations))
  const operationType = 'common'
  const sharedParentId = catalog.length === 1 ? parentModel.id : null
  const hardware = linkHardware
    ? linkedHardware.map(item => ({
        hardwareName: item.partNumber,
        hardwareQty: item.qty > 0 ? item.qty : 1,
        hardwareType: null,
        hardwareSize: item.partName
      }))
    : []
  const stored = readStoredIplPartAssignments(groups, stationPart.partId)
  const assigned: { workerId: string; kind: string; copyIndex: number; stationKey: string }[] = []

  async function writeSet(partNumber: string, stationKey: string, slots: IplPartOpSlot[]) {
    const existing = stored
      .filter(item => item.partNumber === partNumber && item.noteStation === stationKey)
      .map(item => item.copyIndex)
    for (let index = 0; index < slots.length; index += 1) {
      if (slots[index].workerId) {
        assigned.push({
          workerId: slots[index].workerId,
          kind: slots[index].kind,
          copyIndex: index,
          stationKey
        })
      }
      await assignIplPartToWorkerLine({
        part: stationPart!,
        workerStationId: slots[index].workerId,
        parentModelId: sharedParentId,
        operationType,
        operationKind: slots[index].kind,
        copyIndex: index,
        partNumberKey: partNumber || undefined,
        stationKey: stationKey || undefined,
        hardware,
        operations
      })
    }
    for (const index of existing) {
      if (index < slots.length) continue
      await assignIplPartToWorkerLine({
        part: stationPart!,
        workerStationId: null,
        parentModelId: sharedParentId,
        operationType,
        operationKind: '',
        copyIndex: index,
        partNumberKey: partNumber || undefined,
        stationKey: stationKey || undefined,
        hardware,
        operations
      })
    }
  }

  const placements = placementsOf(row, models)
  const distinctStations = new Set(placements.map(item => item.stationKey).filter(Boolean))
  const stationsDiffer = distinctStations.size > 1

  const uniqueStationPlacements = [
    ...new Map(placements.filter(item => item.stationKey).map(item => [item.stationKey, item])).values()
  ]

  if (byStation) {
    for (const item of grouped) {
      const stationKey = item.group.stationKey
      const slots = item.active.map(slot => ({
        ...slot,
        stationKey,
        workerId: workerOnStation(groups, stationKey, slot.workerId)
      }))
      if (slots.some(slot => !slot.kind || !slot.workerId)) {
        return t('bom.partOps.noWorkerOnStation', { station: item.group.stationLabel || stationKey })
      }
      await writeSet('', stationKey, slots)
    }
    const keep = new Set(grouped.map(item => `#${item.group.stationKey}`))
    for (const item of stored) {
      if (keep.has(`${item.partNumber}#${item.noteStation}`)) continue
      await writeSet(item.partNumber, item.noteStation, [])
    }
  } else if (!multi && stationsDiffer) {
    const slot = sharedRows[0]
    for (const placement of uniqueStationPlacements) {
      const workerId = workerOnStation(groups, placement.stationKey, slot?.workerId ?? '')
      if (!slot?.kind || !workerId) {
        return t('bom.partOps.noWorkerOnStation', { station: placement.stationLabel || placement.stationKey })
      }
      await writeSet('', placement.stationKey, [
        { kind: slot.kind, workerId, stationKey: placement.stationKey }
      ])
    }
    const keep = new Set(uniqueStationPlacements.map(item => `#${item.stationKey}`))
    for (const item of stored) {
      if (keep.has(`${item.partNumber}#${item.noteStation}`)) continue
      await writeSet(item.partNumber, item.noteStation, [])
    }
  } else {
    await writeSet('', '', sharedRows)
    for (const item of stored) {
      if (!item.partNumber && !item.noteStation) continue
      await writeSet(item.partNumber, item.noteStation, [])
    }
  }

  if (linkHardware) {
    const uniqueSlots: typeof assigned = []
    const seen = new Set<string>()
    for (const slot of assigned) {
      const key = `${slot.workerId}#${slot.copyIndex}#${slot.stationKey}`
      if (seen.has(key)) continue
      seen.add(key)
      uniqueSlots.push(slot)
    }
    const parentKey = normalizePartNumber(stationPart.partNumber)
    for (const item of linkedHardware) {
      if (normalizePartNumber(item.partNumber) === parentKey) continue
      const hit = await lookupPartByNumber(item.partNumber)
      if (!hit) continue
      const hardwarePart = {
        bomItemId: hit.id,
        partId: hit.id,
        partNumber: hit.part_number,
        partName: hit.part_name_ar || hit.part_number,
        quantity: item.qty > 0 ? item.qty : 1,
        models: stationPart.models
      }
      for (const slot of uniqueSlots) {
        await assignIplPartToWorkerLine({
          part: hardwarePart,
          workerStationId: slot.workerId,
          parentModelId: sharedParentId,
          operationType,
          operationKind: slot.kind,
          copyIndex: slot.copyIndex,
          partNumberKey: hit.part_number,
          stationKey: slot.stationKey || undefined,
          hardware: [],
          operations
        })
      }
    }
  }

  return null
}
