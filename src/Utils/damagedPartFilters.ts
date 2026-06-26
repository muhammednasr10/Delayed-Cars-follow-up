import type { DamagedPartFilters, DamagedPartRecord } from '../Types/damagedPart'

function inDateRange(iso: string, from: string, to: string): boolean {
  const day = iso.slice(0, 10)
  if (from && day < from) return false
  if (to && day > to) return false
  return true
}

export function applyDamagedPartFilters(items: DamagedPartRecord[], filters: DamagedPartFilters): DamagedPartRecord[] {
  const q = filters.search.trim().toLowerCase()
  return items.filter(row => {
    if (filters.modelName && row.modelName !== filters.modelName) return false
    if (filters.damageReason && row.damageReason !== filters.damageReason) return false
    if (filters.finalDecision && row.finalDecision !== filters.finalDecision) return false
    if (filters.causedByEmployeeId && row.causedByEmployeeId !== filters.causedByEmployeeId) return false
    if (!inDateRange(row.reportedAt, filters.dateFrom, filters.dateTo)) return false
    if (!q) return true
    const hay = [row.partNumber, row.partName, row.causedByName, row.modelName, row.notes]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
}

export function hasActiveDamagedPartFilters(filters: DamagedPartFilters): boolean {
  return Boolean(
    filters.search.trim() ||
      filters.modelName ||
      filters.damageReason ||
      filters.finalDecision ||
      filters.causedByEmployeeId ||
      filters.dateFrom ||
      filters.dateTo
  )
}
