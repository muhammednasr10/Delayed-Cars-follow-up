import type { MissingPartDetail } from '../Types/missingPart'
import { branchPartsForGroupVehicle } from './shortageGroupDisplay'
import {
  multiReportGroupPartIds,
  toDisplayRows,
  type MissingPartDisplayRow
} from './missingPartDisplayCore'

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

function earliestCreatedAt(parts: MissingPartDetail[]): string {
  return parts.reduce((min, p) => (p.createdAt < min ? p.createdAt : min), parts[0]?.createdAt ?? '')
}

function latestResolvedAt(parts: MissingPartDetail[]): string {
  return parts.reduce((max, p) => {
    const t = p.shortageResolvedAt ?? ''
    return t > max ? t : max
  }, '')
}

function primaryModelName(parts: MissingPartDetail[]): string {
  const names = [...new Set(parts.map(p => p.modelName?.trim()).filter(Boolean))]
  names.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
  return names[0] ?? ''
}

export function partsFromTableRow(row: MissingPartTableRow): MissingPartDetail[] {
  if (row.kind === 'report-group') return row.displayRow.items
  if (row.kind === 'group-branch' || row.kind === 'vehicle') return row.parts
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
  if (row.kind === 'group-branch' || row.kind === 'vehicle') return row.parts[0]?.vin ?? ''
  return row.item.vin
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

/** One row per report-group (shared issues) with nested branches for extras; else one row per vehicle. */
export function buildMissingPartTableRows(
  filtered: MissingPartDetail[],
  sort: MissingPartTableSort = 'created-asc'
): MissingPartTableRow[] {
  const displayRows = toDisplayRows(filtered)
  const groups = displayRows.filter(
    (dr): dr is Extract<MissingPartDisplayRow, { kind: 'group' }> => dr.kind === 'group'
  )
  const groupedPartIds = multiReportGroupPartIds(filtered)
  const seenVehicles = new Set<string>()
  const blocks: { sortParts: MissingPartDetail[]; rows: MissingPartTableRow[] }[] = []

  for (const displayRow of groups) {
    const vehicleIds = [...new Set(displayRow.items.map(i => i.vehicleId))]
    const scopeParts = filtered.filter(p => vehicleIds.includes(p.vehicleId))
    const blockRows: MissingPartTableRow[] = [{ kind: 'report-group', displayRow }]

    for (const vehicleId of vehicleIds) {
      seenVehicles.add(vehicleId)
      const branchParts = branchPartsForGroupVehicle(vehicleId, scopeParts)
      if (branchParts.length === 0) continue
      blockRows.push({
        kind: 'group-branch',
        parentKey: displayRow.key,
        vehicleId,
        parts: sortVehicleParts(branchParts, sort)
      })
    }

    blocks.push({ sortParts: displayRow.items, rows: blockRows })
  }

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

/** When opening edit/update from a group-branch row, keep only the extra lines. */
export function partsForVehicleAction(
  row: MissingPartDetail,
  vehicleParts: MissingPartDetail[],
  pool: MissingPartDetail[]
): MissingPartDetail[] {
  const groupedIds = multiReportGroupPartIds(pool)
  const groupMembers = vehicleParts.filter(p => groupedIds.has(p.id))
  if (groupMembers.length === 0) return vehicleParts

  const vehicleIds = [...new Set(groupMembers.map(p => p.vehicleId))]
  const scopeParts = pool.filter(p => vehicleIds.includes(p.vehicleId))
  const branchParts = branchPartsForGroupVehicle(row.vehicleId, scopeParts)
  if (!branchParts.some(p => p.id === row.id)) return vehicleParts
  return branchParts.length > 0 ? branchParts : vehicleParts
}
