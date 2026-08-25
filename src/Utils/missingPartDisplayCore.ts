import type { MissingPartDetail } from '../Types/missingPart'

export type MissingPartDisplayRow =
  | { kind: 'single'; item: MissingPartDetail; key: string }
  | { kind: 'group'; items: MissingPartDetail[]; key: string }

export function reportGroupMembers(item: MissingPartDetail, pool: MissingPartDetail[]): MissingPartDetail[] {
  if (!item.reportGroupId) return [item]
  const members = pool.filter(p => p.reportGroupId === item.reportGroupId)
  return members.length > 0 ? members : [item]
}

export function isReportGroup(row: MissingPartDetail, pool: MissingPartDetail[]): boolean {
  return reportGroupMembers(row, pool).length > 1
}

function earliestCreatedAt(parts: MissingPartDetail[]): string {
  return parts.reduce((min, p) => (p.createdAt < min ? p.createdAt : min), parts[0]?.createdAt ?? '')
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

/** Part IDs already shown inside a multi-VIN report group. */
export function multiReportGroupPartIds(items: MissingPartDetail[]): Set<string> {
  const ids = new Set<string>()
  const seen = new Set<string>()
  for (const item of items) {
    if (!item.reportGroupId || seen.has(item.reportGroupId)) continue
    seen.add(item.reportGroupId)
    const members = items.filter(p => p.reportGroupId === item.reportGroupId)
    if (members.length <= 1) continue
    for (const m of members) ids.add(m.id)
  }
  return ids
}
