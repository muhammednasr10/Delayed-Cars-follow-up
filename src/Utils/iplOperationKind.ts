export const IPL_OPERATION_KINDS = ['تركيب', 'فرد', 'تعزيم', 'فك', 'شد', 'ربط', 'لصق', 'ضبط', 'فحص'] as const

export type IplOperationKind = (typeof IPL_OPERATION_KINDS)[number]

export function iplOperationName(kind: string, partName: string): string {
  const name = partName.trim()
  const verb = kind.trim()
  if (!verb) return name || '—'
  if (!name || name === '—') return verb
  return `${verb} ${name}`
}

export function iplOperationKindFromName(operationName: string): string {
  const name = operationName.trim()
  const match = IPL_OPERATION_KINDS.find(kind => name === kind || name.startsWith(`${kind} `))
  return match ?? ''
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
