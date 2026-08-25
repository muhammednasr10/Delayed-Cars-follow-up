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
  | {
      kind: 'group-branch'
      parentKey: string
      vehicleId: string
      parts: MissingPartDetail[]
    }
  | { kind: 'vehicle'; vehicleId: string; parts: MissingPartDetail[] }
  | { kind: 'single'; item: MissingPartDetail }

export type MissingPartTableSort = 'created-asc' | 'resolved-desc'

function sortVehicleParts(parts: MissingPartDetail[], sort: MissingPartTableSort): MissingPartDetail[] {
  return [...parts].sort((a, b) =>
    sort === 'resolved-desc'
      ? (b.shortageResolvedAt ?? '').localeCompare(a.shortageResolvedAt ?? '') || b.createdAt.localeCompare(a.createdAt)
      : a.createdAt.localeCompare(b.createdAt)
  )
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

/** One row per vehicle (multi-reason) or per VIN report-group; extras on a grouped VIN nest under it. */
export function buildMissingPartTableRows(
  filtered: MissingPartDetail[],
  sort: MissingPartTableSort = 'created-asc'
): MissingPartTableRow[] {
  const displayRows = toDisplayRows(filtered)
  const groups = displayRows.filter(
    (dr): dr is Extract<MissingPartDisplayRow, { kind: 'group' }> => dr.kind === 'group'
  )
  const groupedPartIds = multiReportGroupPartIds(filtered)
  const branchedVehicleIds = new Set<string>()
  const blocks: { sortParts: MissingPartDetail[]; rows: MissingPartTableRow[] }[] = []

  for (const displayRow of groups) {
    const blockRows: MissingPartTableRow[] = [{ kind: 'report-group', displayRow }]
    const vehicleIds = [...new Set(displayRow.items.map(i => i.vehicleId))]
    for (const vehicleId of vehicleIds) {
      const extras = sortVehicleParts(
        filtered.filter(p => p.vehicleId === vehicleId && !groupedPartIds.has(p.id)),
        sort
      )
      if (extras.length === 0) continue
      branchedVehicleIds.add(vehicleId)
      blockRows.push({
        kind: 'group-branch',
        parentKey: displayRow.key,
        vehicleId,
        parts: extras
      })
    }
    blocks.push({ sortParts: displayRow.items, rows: blockRows })
  }

  const seenVehicles = new Set(branchedVehicleIds)
  for (const item of filtered) {
    if (groupedPartIds.has(item.id) || seenVehicles.has(item.vehicleId)) continue
    seenVehicles.add(item.vehicleId)
    const parts = sortVehicleParts(
      filtered.filter(p => p.vehicleId === item.vehicleId && !groupedPartIds.has(p.id)),
      sort
    )
    if (parts.length === 0) continue
    if (parts.length > 1) {
      blocks.push({
        sortParts: parts,
        rows: [{ kind: 'vehicle', vehicleId: item.vehicleId, parts }]
      })
    } else {
      blocks.push({
        sortParts: parts,
        rows: [{ kind: 'single', item: parts[0]! }]
      })
    }
  }

  return sortMissingPartTableBlocks(blocks, sort).flatMap(b => b.rows)
}

export function partsFromTableRow(row: MissingPartTableRow): MissingPartDetail[] {
  if (row.kind === 'report-group') return row.displayRow.items
  if (row.kind === 'group-branch' || row.kind === 'vehicle') return row.parts
  return [row.item]
}

export function vehicleIdsFromTableRow(row: MissingPartTableRow): string[] {
  return [...new Set(partsFromTableRow(row).map(p => p.vehicleId))]
}

/** When opening edit/update from a group-branch row, keep only the extra (non-group) lines. */
export function partsForVehicleAction(
  row: MissingPartDetail,
  vehicleParts: MissingPartDetail[],
  pool: MissingPartDetail[]
): MissingPartDetail[] {
  const groupedIds = multiReportGroupPartIds(pool)
  const vehicleHasGrouped = vehicleParts.some(p => groupedIds.has(p.id))
  if (!vehicleHasGrouped || groupedIds.has(row.id)) return vehicleParts
  const extras = vehicleParts.filter(p => !groupedIds.has(p.id))
  return extras.length > 0 ? extras : vehicleParts
}

function primaryVinForTableRow(row: MissingPartTableRow): string {
  if (row.kind === 'report-group') {
    const vins = [...new Set(row.displayRow.items.map(i => i.vin))].sort((a, b) => a.localeCompare(b))
    return vins[0] ?? ''
  }
  if (row.kind === 'group-branch' || row.kind === 'vehicle') return row.parts[0]?.vin ?? ''
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

function sortMissingPartTableBlocks(
  blocks: { sortParts: MissingPartDetail[]; rows: MissingPartTableRow[] }[],
  sort: MissingPartTableSort
): { sortParts: MissingPartDetail[]; rows: MissingPartTableRow[] }[] {
  return [...blocks].sort((a, b) => {
    if (sort === 'resolved-desc') {
      const resolvedCmp = latestResolvedAt(b.sortParts).localeCompare(latestResolvedAt(a.sortParts))
      if (resolvedCmp !== 0) return resolvedCmp
      return earliestCreatedAt(b.sortParts).localeCompare(earliestCreatedAt(a.sortParts))
    }
    const modelCmp = primaryModelName(a.sortParts).localeCompare(primaryModelName(b.sortParts), undefined, {
      numeric: true,
      sensitivity: 'base'
    })
    if (modelCmp !== 0) return modelCmp
    const createdCmp = earliestCreatedAt(a.sortParts).localeCompare(earliestCreatedAt(b.sortParts))
    if (createdCmp !== 0) return createdCmp
    const aVin = primaryVinForTableRow(a.rows[0]!)
    const bVin = primaryVinForTableRow(b.rows[0]!)
    return aVin.localeCompare(bVin, undefined, { numeric: true })
  })
}
