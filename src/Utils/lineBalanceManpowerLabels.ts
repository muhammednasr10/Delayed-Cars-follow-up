import { MODEL_LINES, modelBelongsToLine, type ModelLine } from './modelLines'
import { normalizeStationReferenceCode } from './stationHierarchy'
import type { ParentStationOperationsGroup } from '../Types/timeStudy'
import type { VehicleModel } from '../Types/settings'

export function resolveModelLineForFamily(familyName: string): ModelLine | null {
  for (const line of MODEL_LINES) {
    if (modelBelongsToLine(familyName, line)) return line
  }
  return null
}

function parentHeadcount(parent: ParentStationOperationsGroup): number {
  return parent.headcountWorkersOverride ?? parent.totalWorkers ?? parent.workers.length
}

export function buildLineBalanceLabelsForFamily(
  parentGroups: ParentStationOperationsGroup[],
  _models: VehicleModel[],
  _familyModel: VehicleModel
): Map<string, string> {
  const map = new Map<string, string>()
  for (const parent of parentGroups) {
    for (const worker of parent.workers) {
      map.set(worker.stationId, worker.worker1OperationsSummary?.trim() ?? '')
    }
  }
  return map
}

export function buildLineBalanceLabelsByModel(
  parentGroups: ParentStationOperationsGroup[],
  models: VehicleModel[],
  familyModels: VehicleModel[]
): Map<string, Map<string, string>> {
  const out = new Map<string, Map<string, string>>()
  for (const family of familyModels) {
    out.set(family.id, buildLineBalanceLabelsForFamily(parentGroups, models, family))
  }
  return out
}

export function buildLineBalanceHeadcountByModel(
  parentGroups: ParentStationOperationsGroup[],
  familyModels: VehicleModel[]
): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>()
  for (const family of familyModels) {
    const map = new Map<string, number>()
    for (const parent of parentGroups) {
      const code = normalizeStationReferenceCode(parent.stationNumber)
      map.set(code, parentHeadcount(parent))
    }
    out.set(family.id, map)
  }
  return out
}

export function maxHeadcountForParent(
  parentCode: string,
  headcountByModel: Map<string, Map<string, number>>,
  modelIds: string[],
  fallback: number
): number {
  const fromModels = modelIds.map(id => headcountByModel.get(id)?.get(parentCode) ?? 0)
  return Math.max(fallback, ...fromModels, 0)
}

export type ModelLabelEntry = { modelId: string; modelName: string; label: string }

export function labelsForStationAcrossModels(
  stationId: string,
  labelsByModel: Map<string, Map<string, string>>,
  familyModels: VehicleModel[]
): ModelLabelEntry[] {
  return familyModels.map(model => ({
    modelId: model.id,
    modelName: model.name,
    label: labelsByModel.get(model.id)?.get(stationId)?.trim() ?? ''
  }))
}

export function formatOperationsLabelComparison(
  entries: ModelLabelEntry[],
  t: (key: string, vars?: Record<string, string | number>) => string
): string {
  const withLabel = entries.filter(e => e.label)
  if (withLabel.length === 0) return t('manpower.daily.operationsCompare.empty')

  const byNormalized = new Map<string, { label: string; models: string[] }>()
  for (const entry of withLabel) {
    const key = entry.label.toLowerCase()
    const bucket = byNormalized.get(key) ?? { label: entry.label, models: [] }
    bucket.models.push(entry.modelName)
    byNormalized.set(key, bucket)
  }

  if (byNormalized.size === 1) {
    const only = [...byNormalized.values()][0]
    if (only.models.length === entries.length) {
      return t('manpower.daily.operationsCompare.allMatch', { label: only.label })
    }
  }

  const parts: string[] = []
  for (const bucket of byNormalized.values()) {
    const models = bucket.models.join(t('manpower.daily.operationsCompare.listSep'))
    if (bucket.models.length >= 2) {
      parts.push(t('manpower.daily.operationsCompare.matchGroup', { models, label: bucket.label }))
    } else {
      parts.push(t('manpower.daily.operationsCompare.unique', { model: bucket.models[0], label: bucket.label }))
    }
  }
  return parts.join(t('manpower.daily.operationsCompare.separator'))
}
