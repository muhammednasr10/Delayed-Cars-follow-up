import type { DamagedPartRecord } from '../Types/damagedPart'

export type DamagedPartRankRow = {
  label: string
  code?: string
  records: number
  quantity: number
}

export type DamagedPartSummaryStats = {
  recordCount: number
  totalQuantity: number
  uniqueParts: number
  uniqueCausers: number
  byModel: DamagedPartRankRow[]
  byReason: DamagedPartRankRow[]
  byDecision: DamagedPartRankRow[]
  byCauser: DamagedPartRankRow[]
  byPart: DamagedPartRankRow[]
  byMonth: DamagedPartRankRow[]
}

function bump(
  map: Map<string, { label: string; code?: string; records: number; quantity: number }>,
  key: string,
  label: string,
  quantity: number,
  code?: string
) {
  const row = map.get(key) ?? { label, code, records: 0, quantity: 0 }
  row.records += 1
  row.quantity += quantity
  map.set(key, row)
}

function toRows(map: Map<string, { label: string; code?: string; records: number; quantity: number }>) {
  return [...map.values()].sort((a, b) => b.quantity - a.quantity || b.records - a.records || a.label.localeCompare(b.label, 'ar'))
}

export function buildDamagedPartSummary(items: DamagedPartRecord[]): DamagedPartSummaryStats {
  const byModel = new Map<string, { label: string; code?: string; records: number; quantity: number }>()
  const byReason = new Map<string, { label: string; code?: string; records: number; quantity: number }>()
  const byDecision = new Map<string, { label: string; code?: string; records: number; quantity: number }>()
  const byCauser = new Map<string, { label: string; code?: string; records: number; quantity: number }>()
  const byPart = new Map<string, { label: string; code?: string; records: number; quantity: number }>()
  const byMonth = new Map<string, { label: string; code?: string; records: number; quantity: number }>()

  const partIds = new Set<string>()
  const causerIds = new Set<string>()
  let totalQuantity = 0

  for (const row of items) {
    totalQuantity += row.quantity
    partIds.add(row.partId)
    if (row.causedByEmployeeId) causerIds.add(row.causedByEmployeeId)

    bump(byModel, row.modelName || '—', row.modelName || '—', row.quantity)
    bump(byReason, row.damageReason, row.damageReason, row.quantity, row.damageReason)
    bump(byDecision, row.finalDecision, row.finalDecision, row.quantity, row.finalDecision)

    const causerKey = row.causedByEmployeeId ?? '__none__'
    const causerLabel = row.causedByName ?? '—'
    bump(byCauser, causerKey, causerLabel, row.quantity)

    const partLabel = row.partName ? `${row.partNumber} · ${row.partName}` : row.partNumber
    bump(byPart, row.partId, partLabel, row.quantity)

    const monthKey = row.reportedAt.slice(0, 7)
    bump(byMonth, monthKey, monthKey, row.quantity)
  }

  return {
    recordCount: items.length,
    totalQuantity,
    uniqueParts: partIds.size,
    uniqueCausers: causerIds.size,
    byModel: toRows(byModel),
    byReason: toRows(byReason),
    byDecision: toRows(byDecision),
    byCauser: toRows(byCauser),
    byPart: toRows(byPart),
    byMonth: toRows(byMonth).sort((a, b) => b.label.localeCompare(a.label))
  }
}

export function sliceTopRows(rows: DamagedPartRankRow[], limit: number): DamagedPartRankRow[] {
  const n = Math.max(1, Math.min(100, Math.floor(limit) || 10))
  return rows.slice(0, n)
}
