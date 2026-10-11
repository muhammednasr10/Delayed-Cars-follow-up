import type { ScratchRecord, ScratchSeverity } from '../Types/scratch'

export type ScratchWillStopFilter = 'all' | 'yes' | 'no'

export type ScratchListFilter = {
  search: string
  parent: string
  variant: string
  severity: 'all' | ScratchSeverity
  willStop: ScratchWillStopFilter
}

export const EMPTY_SCRATCH_FILTER: ScratchListFilter = {
  search: '',
  parent: '',
  variant: '',
  severity: 'all',
  willStop: 'all'
}

export type ScratchSearchSuggestion = {
  id: string
  label: string
  secondary?: string
  query: string
}

/** آخر قسم فرعي في المسار المحفوظ، مثل «الفانيلات» من «الإنتاج / التجميع / الفانيلات». */
export function scratchAreaLeaf(bodyArea: string): string {
  const parts = bodyArea.split('/').map(part => part.trim()).filter(Boolean)
  return parts[parts.length - 1] ?? ''
}

const DEFECT_SEP = '\u001f'
const COMPOUND_DEFECTS = ['كسيل دهان', 'اختلاف لون', 'سقوط دهان']
const LOCATION_FILLERS = new Set(['في', 'فى', 'على'])

function stripLocationFiller(location: string): string {
  const parts = location.split(' ').filter(Boolean)
  while (parts.length > 0 && LOCATION_FILLERS.has(parts[0]!)) parts.shift()
  return parts.join(' ')
}

export function joinScratchDefect(defect: string, location: string, action = ''): string | undefined {
  const nextDefect = defect.trim()
  const nextLocation = location.trim()
  const nextAction = action.trim()
  if (!nextDefect && !nextLocation && !nextAction) return undefined
  if (!nextAction) {
    if (!nextLocation) return nextDefect || undefined
    if (!nextDefect) return nextLocation
    return `${nextDefect}${DEFECT_SEP}${nextLocation}`
  }
  return `${nextDefect}${DEFECT_SEP}${nextLocation}${DEFECT_SEP}${nextAction}`
}

/** العيب أول عبارة، ومكان العيب الباقي، والإجراء جزء ثالث لو اتسجل. */
export function splitScratchDefect(notes: string | null | undefined): { defect: string; location: string; action: string } {
  const text = (notes ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return { defect: '', location: '', action: '' }
  if (text.includes(DEFECT_SEP)) {
    const [defect = '', location = '', action = ''] = text.split(DEFECT_SEP)
    return { defect: defect.trim(), location: location.trim(), action: action.trim() }
  }
  const compound = COMPOUND_DEFECTS.find(phrase => text === phrase || text.startsWith(`${phrase} `))
  if (compound) {
    return { defect: compound, location: stripLocationFiller(text.slice(compound.length).trim()), action: '' }
  }
  const [defect, ...rest] = text.split(' ')
  return { defect: defect ?? '', location: stripLocationFiller(rest.join(' ')), action: '' }
}

export function scratchDefectLabel(notes: string | null | undefined): string {
  const { defect, location } = splitScratchDefect(notes)
  return [defect, location].filter(Boolean).join(' · ')
}

function fold(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function scratchMatchesFilter(
  row: ScratchRecord,
  filter: ScratchListFilter,
  labels: { severity: string; willStop: string }
): boolean {
  if (filter.parent && (row.parentModelName ?? '') !== filter.parent) return false
  if (filter.variant && (row.modelName ?? '') !== filter.variant) return false
  if (filter.severity !== 'all' && row.severity !== filter.severity) return false
  if (filter.willStop === 'yes' && !row.willStop) return false
  if (filter.willStop === 'no' && row.willStop) return false

  const tokens = fold(filter.search).split(' ').filter(Boolean)
  if (tokens.length === 0) return true

  const hay = fold(
    [row.vin, row.parentModelName, row.modelName, row.notes, row.actionTaken, row.bodyArea, labels.severity, labels.willStop]
      .filter(Boolean)
      .join(' ')
  )
  return tokens.every(token => hay.includes(token))
}

export function hasActiveScratchFilters(filter: ScratchListFilter): boolean {
  return (
    fold(filter.search).length > 0 ||
    Boolean(filter.parent) ||
    Boolean(filter.variant) ||
    filter.severity !== 'all' ||
    filter.willStop !== 'all'
  )
}

export function buildScratchSearchSuggestions(
  rows: ScratchRecord[],
  search: string
): ScratchSearchSuggestion[] {
  const words = fold(search).split(' ').filter(Boolean)
  const last = words[words.length - 1] ?? ''
  if (!last) return []

  const out: ScratchSearchSuggestion[] = []
  const seen = new Set<string>()

  function add(id: string, label: string, query: string, secondary?: string) {
    const key = fold(query)
    if (!key.includes(last) && !fold(label).includes(last)) return
    if (seen.has(key)) return
    seen.add(key)
    out.push({ id, label, query, secondary })
  }

  for (const row of rows) {
    add(`vin-${row.vin}`, row.vin, row.vin, [row.parentModelName, row.modelName].filter(Boolean).join(' · '))
    if (row.parentModelName) add(`parent-${row.parentModelName}`, row.parentModelName, row.parentModelName)
    if (row.modelName) add(`variant-${row.modelName}`, row.modelName, row.modelName, row.parentModelName)
    if (row.bodyArea) add(`area-${row.bodyArea}`, row.bodyArea, row.bodyArea)
    if (row.notes?.trim()) {
      const label = scratchDefectLabel(row.notes)
      add(`note-${row.id}`, label, label, row.vin)
    }
    if (out.length >= 8) break
  }

  return out.slice(0, 8)
}
