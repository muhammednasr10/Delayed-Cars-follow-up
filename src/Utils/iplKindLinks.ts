import { formatPartKind } from './bomDisplayFormat'
import type { IplCompareRow } from './iplModelCompare'
import { compareRowPartNumberKeys } from './iplPartOperationsModel'

export type IplKindKey = 'part' | 'hardware' | 'plastics' | 'chemicals'

export type IplKindLinkRow = {
  kind: IplKindKey
  total: number
  linked: number
}

export const IPL_KIND_ORDER: IplKindKey[] = ['part', 'hardware', 'plastics', 'chemicals']

export const IPL_KIND_LABEL_KEY: Record<IplKindKey, string> = {
  part: 'bom.partKindPart',
  hardware: 'bom.partKindHardware',
  plastics: 'bom.partKindPlastics',
  chemicals: 'bom.partKindChemicals'
}

export function kindKeyOfCompareRow(row: IplCompareRow): IplKindKey {
  let found: IplKindKey = 'part'
  for (const item of row.byModel.values()) {
    const kind = formatPartKind(item.part_type)
    if (kind === 'hardware' || kind === 'plastics' || kind === 'chemicals') return kind
    if (kind === 'part') found = 'part'
  }
  return found
}

export function isCompareRowLinkedToLineBalancing(
  row: IplCompareRow,
  modelNames: string[],
  linkedPartIds: ReadonlySet<string> = new Set(),
  linkedHardwareKeys: ReadonlySet<string> = new Set()
): boolean {
  for (const item of row.byModel.values()) {
    const id = item.part_id?.trim()
    if (id && linkedPartIds.has(id)) return true
  }
  return compareRowPartNumberKeys(row, modelNames).some(key => linkedHardwareKeys.has(key))
}

export function countIplKindLinks(
  rows: IplCompareRow[],
  modelNames: string[],
  linkedPartIds: ReadonlySet<string> = new Set(),
  linkedHardwareKeys: ReadonlySet<string> = new Set()
): IplKindLinkRow[] {
  const byKind = new Map<IplKindKey, IplKindLinkRow>(
    IPL_KIND_ORDER.map(kind => [kind, { kind, total: 0, linked: 0 }])
  )
  for (const row of rows) {
    const entry = byKind.get(kindKeyOfCompareRow(row))
    if (!entry) continue
    entry.total += 1
    if (isCompareRowLinkedToLineBalancing(row, modelNames, linkedPartIds, linkedHardwareKeys)) {
      entry.linked += 1
    }
  }
  return IPL_KIND_ORDER.map(kind => byKind.get(kind) ?? { kind, total: 0, linked: 0 })
}

export function iplKindUnlinked(row: IplKindLinkRow): number {
  return Math.max(0, row.total - row.linked)
}

export function iplKindPct(row: IplKindLinkRow): string {
  if (row.total <= 0) return '—'
  return `${Math.round((row.linked / row.total) * 100)}%`
}

export function iplKindTotals(rows: IplKindLinkRow[]): { total: number; linked: number } {
  return rows.reduce(
    (acc, row) => ({ total: acc.total + row.total, linked: acc.linked + row.linked }),
    { total: 0, linked: 0 }
  )
}

export function iplKindTone(row: IplKindLinkRow): 'green' | 'orange' | 'cyan' {
  if (row.total > 0 && row.linked === row.total) return 'green'
  if (row.linked > 0) return 'orange'
  return 'cyan'
}
