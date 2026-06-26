import { normalizeStationReferenceCode } from './stationHierarchy'
import type { StationManpowerDayEdit } from '../Types/stationManpowerDaily'

export type ManpowerDayState = {
  generalRows: StationManpowerDayEdit[]
  /** صفوف مخصّصة لكل موديل (محطات مُعدَّلة فقط) */
  modelRows: Map<string, StationManpowerDayEdit[]>
  /** محطات تجاوزت القالب العام لكل موديل */
  overrideStations: Map<string, Set<string>>
}

export function emptyManpowerDayState(generalRows: StationManpowerDayEdit[]): ManpowerDayState {
  return { generalRows, modelRows: new Map(), overrideStations: new Map() }
}

function sameAssignments(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((id, i) => id === b[i])
}

export function detectModelOverrides(
  generalRows: StationManpowerDayEdit[],
  modelRows: StationManpowerDayEdit[]
): Set<string> {
  const overrides = new Set<string>()
  for (const row of modelRows) {
    const base = generalRows.find(r => r.stationId === row.stationId)
    if (!base) continue
    if (!sameAssignments(row.employeeIds, base.employeeIds)) {
      overrides.add(row.stationId)
    }
  }
  return overrides
}

export function effectiveModelRows(
  generalRows: StationManpowerDayEdit[],
  modelId: string,
  state: ManpowerDayState
): StationManpowerDayEdit[] {
  const overrides = state.overrideStations.get(modelId) ?? new Set<string>()
  const custom = state.modelRows.get(modelId) ?? []
  return generalRows.map(row => {
    if (!overrides.has(row.stationId)) return { ...row }
    const customRow = custom.find(r => r.stationId === row.stationId)
    return customRow ? { ...customRow } : { ...row }
  })
}

export function propagateGeneralToModels(state: ManpowerDayState, modelIds: string[]): ManpowerDayState {
  const modelRows = new Map(state.modelRows)
  for (const modelId of modelIds) {
    const overrides = state.overrideStations.get(modelId) ?? new Set<string>()
    if (overrides.size === 0) {
      modelRows.delete(modelId)
      continue
    }
    const existing = modelRows.get(modelId) ?? []
    const kept = existing.filter(r => overrides.has(r.stationId))
    modelRows.set(modelId, kept)
  }
  return { ...state, generalRows: state.generalRows.map(r => ({ ...r })), modelRows }
}

export function assignedCountForRows(rows: StationManpowerDayEdit[]): number {
  return rows.reduce((sum, row) => sum + row.employeeIds.length, 0)
}

export function assignedCountForParent(
  parentCode: string,
  rows: StationManpowerDayEdit[]
): number {
  return assignedCountForRows(
    rows.filter(row => normalizeStationReferenceCode(row.stationNumber) === parentCode)
  )
}

/** أقصى عدد عمال معيّنين لمجموعة محطة عبر العام وجميع الموديلات */
export function maxAssignedCountForParent(
  parentCode: string,
  state: ManpowerDayState,
  modelIds: string[]
): number {
  const counts = [
    assignedCountForParent(parentCode, state.generalRows),
    ...modelIds.map(id => assignedCountForParent(parentCode, effectiveModelRows(state.generalRows, id, state)))
  ]
  return Math.max(0, ...counts)
}

export function upsertModelOverride(
  state: ManpowerDayState,
  modelId: string,
  stationId: string,
  patch: Partial<Pick<StationManpowerDayEdit, 'employeeIds'>>,
  baseRow: StationManpowerDayEdit
): ManpowerDayState {
  const overrideStations = new Map(state.overrideStations)
  const modelOverrides = new Set(overrideStations.get(modelId) ?? [])
  modelOverrides.add(stationId)
  overrideStations.set(modelId, modelOverrides)

  const modelRows = new Map(state.modelRows)
  const list = [...(modelRows.get(modelId) ?? [])]
  const idx = list.findIndex(r => r.stationId === stationId)
  const nextRow: StationManpowerDayEdit = {
    ...(idx >= 0 ? list[idx] : baseRow),
    ...patch,
    stationId
  }
  if (idx >= 0) list[idx] = nextRow
  else list.push(nextRow)
  modelRows.set(modelId, list)

  return { ...state, modelRows, overrideStations }
}

export function updateGeneralRow(
  state: ManpowerDayState,
  stationId: string,
  patch: Partial<Pick<StationManpowerDayEdit, 'employeeIds'>>,
  modelIds: string[]
): ManpowerDayState {
  const generalRows = state.generalRows.map(row =>
    row.stationId === stationId ? { ...row, ...patch } : { ...row }
  )
  return propagateGeneralToModels({ ...state, generalRows }, modelIds)
}
