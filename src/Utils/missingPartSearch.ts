import type { MissingPartDetail } from '../Types/missingPart'

export type MissingPartSearchSuggestion = {
  id: string
  label: string
  sublabel?: string
  value: string
  kind: 'vin' | 'part' | 'model'
}

function norm(s: string) {
  return s.trim().toLowerCase()
}

export function buildMissingPartSearchSuggestions(items: MissingPartDetail[]): MissingPartSearchSuggestion[] {
  const seen = new Set<string>()
  const out: MissingPartSearchSuggestion[] = []

  function push(kind: MissingPartSearchSuggestion['kind'], label: string, value: string, sublabel?: string) {
    const key = `${kind}:${norm(value)}`
    if (!value.trim() || seen.has(key)) return
    seen.add(key)
    out.push({ id: key, kind, label, value, sublabel })
  }

  for (const row of items) {
    push('vin', row.vin, row.vin, row.modelName)
    push('part', row.partDescription, row.partDescription, row.vin)
    if (row.modelName) push('model', row.modelName, row.modelName)
  }

  return out.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
}

export function findMissingPartSearchSuggestions(
  pool: MissingPartSearchSuggestion[],
  query: string,
  limit = 12
): MissingPartSearchSuggestion[] {
  const q = norm(query)
  if (!q) return []

  const scored = pool
    .map(s => {
      const label = norm(s.label)
      const value = norm(s.value)
      let score = 0
      if (label === q || value === q) score = 100
      else if (label.startsWith(q) || value.startsWith(q)) score = 80
      else if (label.includes(q) || value.includes(q)) score = 50
      else return null
      return { s, score }
    })
    .filter((x): x is { s: MissingPartSearchSuggestion; score: number } => x !== null)

  scored.sort((a, b) => b.score - a.score || a.s.label.localeCompare(b.s.label))
  return scored.slice(0, limit).map(x => x.s)
}
