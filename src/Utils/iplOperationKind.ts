export const DEFAULT_IPL_OPERATION_KIND = 'تركيب'

export const IPL_OPERATION_KINDS = [
  DEFAULT_IPL_OPERATION_KIND,
  'فرد',
  'تعزيم',
  'فك',
  'شد',
  'ربط',
  'لصق',
  'ضبط',
  'فحص'
] as const

export type IplOperationKind = (typeof IPL_OPERATION_KINDS)[number]

const CUSTOM_KINDS_KEY = 'afa.iplCustomOperationKinds'

function readStorage(): string[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(CUSTOM_KINDS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map(item => String(item ?? '').trim()).filter(Boolean)
  } catch {
    return []
  }
}

function writeStorage(kinds: string[]) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(CUSTOM_KINDS_KEY, JSON.stringify(kinds))
}

export function loadCustomIplOperationKinds(): string[] {
  return readStorage()
}

export function saveCustomIplOperationKind(kind: string): string {
  const next = kind.trim()
  if (!next) return ''
  const builtIn = new Set<string>(IPL_OPERATION_KINDS)
  if (builtIn.has(next)) return next
  const current = readStorage()
  if (!current.some(item => item === next)) writeStorage([...current, next])
  return next
}

export function listedIplOperationKinds(extra: string[] = []): string[] {
  const seen = new Set<string>()
  const list: string[] = []
  for (const kind of [...IPL_OPERATION_KINDS, ...loadCustomIplOperationKinds(), ...extra]) {
    const next = kind.trim()
    if (!next || seen.has(next)) continue
    seen.add(next)
    list.push(next)
  }
  return list
}

export function iplOperationName(kind: string, partName: string): string {
  const name = partName.trim()
  const verb = kind.trim()
  if (!verb) return name || '—'
  if (!name || name === '—') return verb
  return `${verb} ${name}`
}

export function iplOperationKindFromName(operationName: string, extraKinds: string[] = []): string {
  const name = operationName.trim()
  const kinds = listedIplOperationKinds(extraKinds).sort((a, b) => b.length - a.length)
  return kinds.find(kind => name === kind || name.startsWith(`${kind} `)) ?? ''
}

/** Part name stored as "تركيب خرطوم" or "تركيب خرطوم · 60-T8". */
export function iplPartNameFromOperation(operationName: string): string {
  const name = operationName.trim()
  const kind = iplOperationKindFromName(name)
  let rest = kind ? name.slice(kind.length).trim() : name
  const split = rest.indexOf(' · ')
  if (split >= 0) rest = rest.slice(0, split).trim()
  return rest || name || '—'
}

export function iplPartNumberFromOperation(operationName: string): string {
  const name = operationName.trim()
  const split = name.lastIndexOf(' · ')
  if (split < 0) return ''
  return name.slice(split + 3).trim()
}
