import { assignIplPartToWorkerLine } from '../services/stationOperationsService'
import type { ParentStationOperationsGroup } from '../Types/timeStudy'
import type { VehicleModel } from '../Types/settings'
import type { IplCompareRow } from '../Utils/iplModelCompare'
import {
  emptyIplPartOpSlot,
  placementsOf,
  readStoredIplPartAssignments,
  toStationPartFromCompare,
  workersForStation,
  type IplPartModelGroup,
  type IplPartOpSlot,
  type LinkedHardwarePartRef
} from '../Utils/iplPartOperationsModel'
import { workerIndexFromStationCode } from '../Utils/stationHierarchy'

export type SaveIplPartOperationsInput = {
  row: IplCompareRow
  models: string[]
  groups: ParentStationOperationsGroup[]
  vehicleModels: VehicleModel[]
  multi: boolean
  byModel: boolean
  homeKey: string
  rows: IplPartOpSlot[]
  groupRows: Record<string, IplPartOpSlot[]>
  modelGroups: IplPartModelGroup[]
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
    byModel,
    homeKey,
    rows,
    groupRows,
    modelGroups,
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
  const grouped = modelGroups.map(group => {
    const slots = groupRows[group.partNumber] ?? [emptyIplPartOpSlot(group.stationKey)]
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

  if (!byModel && multi && sharedRows.length < 2) return t('bom.partOps.needCount')
  if (
    byModel &&
    grouped.some(
      item =>
        item.active.length === 0 ||
        item.active.some(slot => !slot.kind || !slot.workerId || (multi && !slot.stationKey))
    )
  ) {
    return t('bom.partOps.needKindWorker')
  }
  if (!byModel && sharedRows.some(slot => !slot.kind || !slot.workerId || (multi && !slot.stationKey))) {
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
        hardwareQty: 1,
        hardwareType: null,
        hardwareSize: item.partName
      }))
    : []
  const stored = readStoredIplPartAssignments(groups, stationPart.partId)

  async function writeSet(partNumber: string, stationKey: string, slots: IplPartOpSlot[]) {
    const existing = stored
      .filter(item => item.partNumber === partNumber && item.noteStation === stationKey)
      .map(item => item.copyIndex)
    for (let index = 0; index < slots.length; index += 1) {
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
  const distinctNumbers = new Set(placements.map(item => item.partNumber).filter(number => number && number !== '—'))
  const distinctStations = new Set(placements.map(item => item.stationKey).filter(Boolean))
  const numbersDiffer = distinctNumbers.size > 1
  const stationsDiffer = distinctStations.size > 1

  if (!byModel && !multi && (numbersDiffer || stationsDiffer)) {
    const slot = sharedRows[0]
    for (const placement of placements) {
      const workerId = workerOnStation(groups, placement.stationKey, slot?.workerId ?? '')
      if (!slot?.kind || !workerId) {
        return t('bom.partOps.noWorkerOnStation', { station: placement.stationLabel || placement.stationKey })
      }
      await writeSet(numbersDiffer ? placement.partNumber : '', placement.stationKey, [
        { kind: slot.kind, workerId, stationKey: placement.stationKey }
      ])
    }
    const keep = new Set(placements.map(item => `${numbersDiffer ? item.partNumber : ''}#${item.stationKey}`))
    for (const item of stored) {
      if (keep.has(`${item.partNumber}#${item.noteStation}`)) continue
      await writeSet(item.partNumber, item.noteStation, [])
    }
  } else if (byModel) {
    for (const item of grouped) {
      const stationKeys = [
        ...new Set(
          placements
            .filter(place => place.partNumber === item.group.partNumber)
            .map(place => place.stationKey)
            .filter(Boolean)
        )
      ]
      const targets = stationKeys.length > 0 ? stationKeys : [item.group.stationKey]
      for (const stationKey of targets) {
        const slots = item.active.map(slot => ({
          ...slot,
          stationKey,
          workerId: workerOnStation(groups, stationKey, slot.workerId)
        }))
        if (slots.some(slot => !slot.kind || !slot.workerId)) {
          const label = placements.find(place => place.stationKey === stationKey)?.stationLabel || stationKey
          return t('bom.partOps.noWorkerOnStation', { station: label })
        }
        await writeSet(item.group.partNumber, stationKey, slots)
      }
    }
    await writeSet('', '', [])
    const keep = new Set(
      grouped.flatMap(item => {
        const stationKeys = placements
          .filter(place => place.partNumber === item.group.partNumber)
          .map(place => place.stationKey)
          .filter(Boolean)
        const targets = stationKeys.length > 0 ? stationKeys : [item.group.stationKey]
        return targets.map(stationKey => `${item.group.partNumber}#${stationKey}`)
      })
    )
    for (const item of stored) {
      if (!item.partNumber && !item.noteStation) continue
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

  return null
}
