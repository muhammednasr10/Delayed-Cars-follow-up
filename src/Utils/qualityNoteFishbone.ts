export const FISHBONE_CATEGORIES = [
  'man',
  'machine',
  'method',
  'material',
  'measurement',
  'environment'
] as const

export type FishboneCategory = (typeof FISHBONE_CATEGORIES)[number]

export type QualityNoteFishbone = {
  v: 1
  causes: Record<FishboneCategory, string[]>
}

export function emptyQualityNoteFishbone(): QualityNoteFishbone {
  return {
    v: 1,
    causes: {
      man: [],
      machine: [],
      method: [],
      material: [],
      measurement: [],
      environment: []
    }
  }
}

function asCauseList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(item => String(item ?? '').trim()).filter(Boolean)
}

export function parseQualityNoteFishbone(raw: string): QualityNoteFishbone {
  const text = raw.trim()
  const empty = emptyQualityNoteFishbone()
  if (!text) return empty
  try {
    const parsed = JSON.parse(text) as { v?: unknown; causes?: Record<string, unknown> }
    if (parsed && parsed.v === 1 && parsed.causes && typeof parsed.causes === 'object') {
      for (const key of FISHBONE_CATEGORIES) {
        empty.causes[key] = asCauseList(parsed.causes[key])
      }
      return empty
    }
  } catch {
    /* legacy free text */
  }
  empty.causes.method = [text]
  return empty
}

export function serializeQualityNoteFishbone(diagram: QualityNoteFishbone): string {
  const causes = emptyQualityNoteFishbone().causes
  let filled = false
  for (const key of FISHBONE_CATEGORIES) {
    causes[key] = diagram.causes[key].map(item => item.trim()).filter(Boolean)
    if (causes[key].length > 0) filled = true
  }
  return filled ? JSON.stringify({ v: 1, causes }) : ''
}

export function qualityNoteFishboneHasCauses(diagram: QualityNoteFishbone): boolean {
  return FISHBONE_CATEGORIES.some(key => diagram.causes[key].some(item => item.trim()))
}
