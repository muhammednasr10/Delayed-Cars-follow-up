import type { MissingPartDetail } from '../Types/missingPart'

export type MissingPartDisplayRow =
  { kind: 'single'; item: MissingPartDetail; key: string } | { kind: 'group'; items: MissingPartDetail[]; key: string }

export function reportGroupMembers(item: MissingPartDetail, pool: MissingPartDetail[]): MissingPartDetail[] {
  if (!item.reportGroupId) return [item]
  const members = pool.filter(p => p.reportGroupId === item.reportGroupId)
  return members.length > 0 ? members : [item]
}

export function isReportGroup(row: MissingPartDetail, pool: MissingPartDetail[]): boolean {
  return reportGroupMembers(row, pool).length > 1
}

export function toDisplayRows(items: MissingPartDetail[]): MissingPartDisplayRow[] {
  const seenGroup = new Set<string>()
  const singles: MissingPartDetail[] = []
  const groups: MissingPartDisplayRow[] = []

  for (const item of items) {
    if (item.reportGroupId) {
      if (seenGroup.has(item.reportGroupId)) continue
      const members = items.filter(p => p.reportGroupId === item.reportGroupId)
      seenGroup.add(item.reportGroupId)
      if (members.length > 1) {
        groups.push({
          kind: 'group',
          items: members.sort((a, b) => a.vin.localeCompare(b.vin)),
          key: `g-${item.reportGroupId}`
        })
      } else {
        singles.push(members[0] ?? item)
      }
    } else {
      singles.push(item)
    }
  }

  const rows: MissingPartDisplayRow[] = [
    ...groups,
    ...singles.map(item => ({ kind: 'single' as const, item, key: item.id }))
  ]

  rows.sort((a, b) => {
    const ta = a.kind === 'group' ? earliestCreatedAt(a.items) : a.item.createdAt
    const tb = b.kind === 'group' ? earliestCreatedAt(b.items) : b.item.createdAt
    return ta.localeCompare(tb)
  })

  return rows
}

export function primaryItem(row: MissingPartDisplayRow): MissingPartDetail {
  return row.kind === 'group' ? row.items[0] : row.item
}

export function vehicleIdsFromDisplayRow(row: MissingPartDisplayRow): string[] {
  if (row.kind === 'group') {
    return [...new Set(row.items.map(i => i.vehicleId))]
  }
  return [row.item.vehicleId]
}

export function openPartsForDisplayRow(row: MissingPartDisplayRow, pool: MissingPartDetail[]): MissingPartDetail[] {
  const vehicleIds = new Set(vehicleIdsFromDisplayRow(row))
  return pool.filter(p => vehicleIds.has(p.vehicleId) && p.status !== 'closed' && p.status !== 'cancelled')
}

export function hasPendingInstall(parts: MissingPartDetail[]): boolean {
  return parts.some(p => p.installedQty < p.requiredQty)
}

export function aggregateQty(items: MissingPartDetail[]) {
  const installed = items.reduce((s, p) => s + p.installedQty, 0)
  const required = items.reduce((s, p) => s + p.requiredQty, 0)
  return { installed, required }
}

export type MissingPartTableRow =
  | { kind: 'report-group'; displayRow: Extract<MissingPartDisplayRow, { kind: 'group' }> }
  | { kind: 'vehicle'; vehicleId: string; parts: MissingPartDetail[] }
  | { kind: 'single'; item: MissingPartDetail }

export type MissingPartTableSort = 'created-asc' | 'resolved-desc'

/** One row per vehicle (multi-reason collapsible) or per VIN report-group. */
export function buildMissingPartTableRows(
  filtered: MissingPartDetail[],
  sort: MissingPartTableSort = 'created-asc'
): MissingPartTableRow[] {
  const displayRows = toDisplayRows(filtered)
  const seenVehicles = new Set<string>()
  const rows: MissingPartTableRow[] = []

  for (const dr of displayRows) {
    if (dr.kind === 'group') {
      rows.push({ kind: 'report-group', displayRow: dr })
      continue
    }

    const vehicleId = dr.item.vehicleId
    if (seenVehicles.has(vehicleId)) continue
    seenVehicles.add(vehicleId)

    const parts = filtered
      .filter(p => p.vehicleId === vehicleId)
      .sort((a, b) =>
        sort === 'resolved-desc'
          ? (b.shortageResolvedAt ?? '').localeCompare(a.shortageResolvedAt ?? '') || b.createdAt.localeCompare(a.createdAt)
          : a.createdAt.localeCompare(b.createdAt)
      )

    if (parts.length > 1) {
      rows.push({ kind: 'vehicle', vehicleId, parts })
    } else {
      rows.push({ kind: 'single', item: parts[0] ?? dr.item })
    }
  }

  return sortMissingPartTableRows(rows, sort)
}

export function partsFromTableRow(row: MissingPartTableRow): MissingPartDetail[] {
  if (row.kind === 'report-group') return row.displayRow.items
  if (row.kind === 'vehicle') return row.parts
  return [row.item]
}

export function vehicleIdsFromTableRow(row: MissingPartTableRow): string[] {
  return [...new Set(partsFromTableRow(row).map(p => p.vehicleId))]
}

function primaryVinForTableRow(row: MissingPartTableRow): string {
  if (row.kind === 'report-group') {
    const vins = [...new Set(row.displayRow.items.map(i => i.vin))].sort((a, b) => a.localeCompare(b))
    return vins[0] ?? ''
  }
  if (row.kind === 'vehicle') return row.parts[0]?.vin ?? ''
  return row.item.vin
}

function primaryModelName(parts: MissingPartDetail[]): string {
  const names = [...new Set(parts.map(p => p.modelName?.trim()).filter(Boolean))]
  names.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
  return names[0] ?? ''
}

function earliestCreatedAt(parts: MissingPartDetail[]): string {
  return parts.reduce((min, p) => (p.createdAt < min ? p.createdAt : min), parts[0]?.createdAt ?? '')
}

function latestResolvedAt(parts: MissingPartDetail[]): string {
  return parts.reduce((max, p) => {
    const t = p.shortageResolvedAt ?? ''
    return t > max ? t : max
  }, '')
}

function sortMissingPartTableRows(rows: MissingPartTableRow[], sort: MissingPartTableSort): MissingPartTableRow[] {
  return [...rows].sort((a, b) => {
    const aParts = partsFromTableRow(a)
    const bParts = partsFromTableRow(b)
    if (sort === 'resolved-desc') {
      const resolvedCmp = latestResolvedAt(bParts).localeCompare(latestResolvedAt(aParts))
      if (resolvedCmp !== 0) return resolvedCmp
      return earliestCreatedAt(bParts).localeCompare(earliestCreatedAt(aParts))
    }
    const modelCmp = primaryModelName(aParts).localeCompare(primaryModelName(bParts), undefined, {
      numeric: true,
      sensitivity: 'base'
    })
    if (modelCmp !== 0) return modelCmp
    const createdCmp = earliestCreatedAt(aParts).localeCompare(earliestCreatedAt(bParts))
    if (createdCmp !== 0) return createdCmp
    return primaryVinForTableRow(a).localeCompare(primaryVinForTableRow(b), undefined, { numeric: true })
  })
}
