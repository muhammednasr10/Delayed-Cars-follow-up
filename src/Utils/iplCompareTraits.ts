export type IplCompareTrait = {
  id: string
  name: string
  values: Record<string, string>
}

export type IplTraitCompareStatus = 'empty' | 'same' | 'different'

export const IPL_COMPARE_TRAIT_PRESETS = ['size', 'shape', 'color'] as const
export type IplCompareTraitPreset = (typeof IPL_COMPARE_TRAIT_PRESETS)[number]

function newTraitId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `trait-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function parseCompareTraits(raw: unknown): IplCompareTrait[] {
  if (!Array.isArray(raw)) return []
  const traits: IplCompareTrait[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const name = String(row.name ?? '').trim()
    if (!name) continue
    const values: Record<string, string> = {}
    if (row.values && typeof row.values === 'object' && !Array.isArray(row.values)) {
      for (const [model, value] of Object.entries(row.values as Record<string, unknown>)) {
        const key = model.trim()
        if (!key) continue
        values[key] = String(value ?? '')
      }
    }
    traits.push({
      id: String(row.id ?? '').trim() || newTraitId(),
      name,
      values
    })
  }
  return traits
}

export function addCompareTrait(traits: IplCompareTrait[], name: string): IplCompareTrait[] {
  const trimmed = name.trim()
  if (!trimmed) return traits
  const key = trimmed.toLocaleLowerCase()
  if (traits.some(trait => trait.name.trim().toLocaleLowerCase() === key)) return traits
  return [...traits, { id: newTraitId(), name: trimmed, values: {} }]
}

export function removeCompareTrait(traits: IplCompareTrait[], id: string): IplCompareTrait[] {
  return traits.filter(trait => trait.id !== id)
}

export function renameCompareTrait(traits: IplCompareTrait[], id: string, name: string): IplCompareTrait[] {
  return traits.map(trait => (trait.id === id ? { ...trait, name } : trait))
}

export function setCompareTraitValue(
  traits: IplCompareTrait[],
  id: string,
  model: string,
  value: string
): IplCompareTrait[] {
  return traits.map(trait =>
    trait.id === id ? { ...trait, values: { ...trait.values, [model]: value } } : trait
  )
}

export function traitCompareStatus(trait: IplCompareTrait, models: string[]): IplTraitCompareStatus {
  const filled = models.map(model => (trait.values[model] ?? '').trim()).filter(Boolean)
  if (filled.length === 0) return 'empty'
  const unique = new Set(filled.map(value => value.toLocaleLowerCase()))
  const everyModelFilled = models.length > 0 && models.every(model => (trait.values[model] ?? '').trim())
  if (!everyModelFilled || unique.size > 1) return 'different'
  return 'same'
}

export function normalizeTraitsForSave(traits: IplCompareTrait[]): IplCompareTrait[] {
  const seen = new Set<string>()
  const out: IplCompareTrait[] = []
  for (const trait of traits) {
    const name = trait.name.trim()
    if (!name) continue
    const key = name.toLocaleLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const values: Record<string, string> = {}
    for (const [model, value] of Object.entries(trait.values)) {
      const modelName = model.trim()
      if (!modelName) continue
      values[modelName] = value.trim()
    }
    out.push({ id: trait.id, name, values })
  }
  return out
}
