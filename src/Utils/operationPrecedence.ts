const PREC_PREFIX = 'prec:'

export type PredecessorCandidate = {
  id: string
  label: string
  subtitle?: string | null
  timeSeconds: number | null
  timeMinutes: number | null
}

export function operationTimeMinutes(op: Pick<PredecessorCandidate, 'timeSeconds' | 'timeMinutes'>): number {
  if (op.timeSeconds != null && Number.isFinite(op.timeSeconds)) return op.timeSeconds / 60
  if (op.timeMinutes != null && Number.isFinite(op.timeMinutes)) return op.timeMinutes
  return 0
}

export function parsePredecessorIds(raw: string | null | undefined): string[] {
  const s = (raw ?? '').trim()
  if (!s) return []
  if (s.startsWith(PREC_PREFIX)) {
    return s
      .slice(PREC_PREFIX.length)
      .split(',')
      .map(x => x.trim())
      .filter(Boolean)
  }
  const uuidLike = /^[0-9a-f-]{36}$/i
  if (s.includes(',') && s.split(',').every(p => uuidLike.test(p.trim()))) {
    return s.split(',').map(x => x.trim())
  }
  return []
}

export function encodePredecessorIds(ids: string[]): string | null {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return null
  return `${PREC_PREFIX}${unique.join(',')}`
}

export function computeRankedPositionalWeightMinutes(
  predecessorIds: string[],
  candidates: PredecessorCandidate[]
): number | null {
  if (predecessorIds.length === 0) return null
  const byId = new Map(candidates.map(c => [c.id, c]))
  let total = 0
  let any = false
  for (const id of predecessorIds) {
    const op = byId.get(id)
    if (!op) continue
    const min = operationTimeMinutes(op)
    if (min > 0) any = true
    total += min
  }
  if (!any) return 0
  return Math.round(total * 10000) / 10000
}
