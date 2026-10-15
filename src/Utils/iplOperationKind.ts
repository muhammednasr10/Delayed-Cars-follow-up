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
