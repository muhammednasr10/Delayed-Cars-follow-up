import { EMPTY_QUALITY_NOTE_8D, type QualityNote8D } from '../Types/qualityNote'
import { parseQualityNoteFishbone, qualityNoteFishboneHasCauses } from './qualityNoteFishbone'

const KEYS = Object.keys(EMPTY_QUALITY_NOTE_8D) as (keyof QualityNote8D)[]

export function parseQualityNote8D(raw: unknown): QualityNote8D {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const next = { ...EMPTY_QUALITY_NOTE_8D }
  for (const key of KEYS) {
    const value = src[key]
    next[key] = typeof value === 'string' ? value : ''
  }
  return next
}

export function trimQualityNote8D(value: QualityNote8D): QualityNote8D {
  const next = { ...EMPTY_QUALITY_NOTE_8D }
  for (const key of KEYS) next[key] = value[key].trim()
  return next
}

export function qualityNote8dFilledCount(value: QualityNote8D): number {
  return KEYS.filter(key => {
    if (key === 'd4RootCause') return qualityNoteFishboneHasCauses(parseQualityNoteFishbone(value[key]))
    return value[key].trim().length > 0
  }).length
}
