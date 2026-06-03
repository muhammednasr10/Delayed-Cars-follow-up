import type { ModelLine } from './modelLines'
import {
  classificationAppliesToVariant,
  classificationBelongsToLine,
  formatOperationClassification as formatLineClassification,
  getPresetsForLine,
  normalizeClassification,
  operationMatchesLineFilter,
  type ClassificationPreset
} from './lineClassifications'
import { MODEL_LINE_STYLES, type ModelLineScope } from './modelLines'

export type { ClassificationPreset }
export { getPresetsForLine, normalizeClassification, classificationAppliesToVariant, operationMatchesLineFilter }

export const OPERATION_CLASSIFICATION_PRESETS = getPresetsForLine('T4')

export function formatOperationClassification(raw: string, line?: ModelLine): string {
  return formatLineClassification(raw, line)
}

export function primaryModelLineScope(classification: string): ModelLineScope {
  const s = classification.trim().toLowerCase()
  if (!s || s === 'common') return 'common'
  if (s.includes('foton')) return 'Foton'
  if (s.startsWith('gd')) return 'GD'
  if (s.includes('t8')) return 'T8'
  if (s.includes('t7')) return 'T7'
  if (s.includes('t4')) return 'T4'
  return 'other'
}

export function classificationBadgeClass(label: string, scope?: ModelLineScope): string {
  if (scope && scope !== 'other' && scope !== 'common') return MODEL_LINE_STYLES[scope].badge
  if (label === 'Common' || label === 'common') return 'bg-slate-600/40 text-slate-200'
  if (label.includes('only')) return 'bg-amber-500/15 text-amber-200'
  if (label.startsWith('(')) return 'bg-violet-500/15 text-violet-200'
  return 'bg-slate-800 text-slate-300'
}

/** @deprecated use classificationBelongsToLine + operationMatchesLineFilter */
export function classificationMatchesLine(classification: string, line: ModelLine): boolean {
  return classificationBelongsToLine(classification, line)
}
