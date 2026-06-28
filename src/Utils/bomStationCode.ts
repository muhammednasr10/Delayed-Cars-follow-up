import { formatStationReferenceCode, normalizeStationReferenceCode } from './stationHierarchy'
import { dedupeMasterStationsForDisplay, masterStationCode } from './stationMaster'
import type { Station } from '../Types/settings'
import type { BomDisplayGroup } from './bomRowGroups'
import type { BomItemDetail } from '../Types/bom'

const NO_STATION_RANK = 999_999

/** تنسيق كود المحطة في BOM — 1 → ST-01، ST1 → ST-01 */
export function normalizeBomStationCodeText(code: string): string {
  const raw = code.trim()
  if (!raw) return ''
  if (/^\d+$/.test(raw)) {
    return formatStationReferenceCode(`ST${raw}`)
  }
  return formatStationReferenceCode(raw)
}

export function masterStationsForBom(stations: Station[]): Station[] {
  return dedupeMasterStationsForDisplay(stations.filter(s => s.is_active))
}

export function findMasterStationByCode(stations: Station[], code: string): Station | undefined {
  const target = normalizeStationReferenceCode(normalizeBomStationCodeText(code))
  if (!target) return undefined
  return masterStationsForBom(stations).find(s => masterStationCode(s).toUpperCase() === target.toUpperCase())
}

export function displayBomStationCode(code: string | null | undefined): string {
  if (!code?.trim()) return ''
  return normalizeBomStationCodeText(code)
}

/** كل الصيغ المحتملة المخزّنة في DB لنفس كود المحطة — للفلترة بعد التنسيق. */
export function bomStationCodeRawVariants(code: string): string[] {
  const display = displayBomStationCode(code)
  if (!display) return []

  const out = new Set<string>()
  const add = (s: string) => {
    const t = s.trim()
    if (t) out.add(t)
  }

  add(code)
  add(display)
  add(normalizeStationReferenceCode(display))
  add(normalizeStationReferenceCode(code))

  const st = display.match(/^ST-(\d+)$/i)
  if (st) {
    const num = parseInt(st[1], 10)
    add(String(num))
    add(String(num).padStart(2, '0'))
    add(`ST${num}`)
    add(`ST-${st[1]}`)
    add(`ST-${String(num).padStart(2, '0')}`)
    add(`st${num}`)
    add(`st-${st[1]}`)
  }

  const pbs = display.match(/^PBS-(\d+)$/i)
  if (pbs) {
    const num = parseInt(pbs[1], 10)
    add(String(num))
    add(`PBS${num}`)
    add(`PBS-${pbs[1]}`)
    add(`PBS-${String(num).padStart(2, '0')}`)
  }

  return [...out]
}

/** خريطة ترتيب المحطات الرئيسية من الإعدادات (sort_order). */
export function buildStationOrderMap(stations: Station[]): Map<string, number> {
  const map = new Map<string, number>()
  const masters = [...masterStationsForBom(stations)].sort((a, b) => {
    const sortDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0)
    if (sortDiff !== 0) return sortDiff
    return a.station_number.localeCompare(b.station_number, undefined, { numeric: true, sensitivity: 'base' })
  })

  masters.forEach((s, index) => {
    const rank = s.sort_order ?? index * 10
    const keys = [
      masterStationCode(s),
      normalizeStationReferenceCode(s.station_number),
      normalizeBomStationCodeText(s.station_number),
      formatStationReferenceCode(s.station_number),
      s.station_number.trim()
    ]
    for (const key of keys) {
      if (key) map.set(key.toUpperCase(), rank)
    }
  })

  return map
}

function stationCodeKeys(code: string): string[] {
  const display = displayBomStationCode(code)
  if (!display) return []
  return [
    normalizeStationReferenceCode(display).toUpperCase(),
    display.toUpperCase(),
    normalizeStationReferenceCode(code).toUpperCase(),
    code.trim().toUpperCase()
  ]
}

export function resolveBomStationSortRank(
  row: Pick<BomItemDetail, 'station_sort_order' | 'station_code_text' | 'station_number'>,
  orderMap: Map<string, number>
): number {
  const code = row.station_code_text || row.station_number || ''
  for (const key of stationCodeKeys(code)) {
    const hit = orderMap.get(key)
    if (hit != null) return hit
  }

  if (row.station_sort_order != null && row.station_sort_order > 0) return row.station_sort_order

  const numeric = stationCodeNumericRank(code)
  if (numeric != null) return numeric * 10

  return code.trim() ? NO_STATION_RANK - 1 : NO_STATION_RANK
}

function stationCodeNumericRank(code: string): number | null {
  const display = displayBomStationCode(code)
  const st = display.match(/^ST-(\d+)$/i)
  if (st) return parseInt(st[1], 10)
  const pbs = display.match(/^PBS-(\d+)$/i)
  if (pbs) return parseInt(pbs[1], 10)
  return null
}

export function compareBomGroupsByStation(
  a: BomDisplayGroup,
  b: BomDisplayGroup,
  orderMap: Map<string, number>
): number {
  const rankA = Math.min(
    resolveBomStationSortRank(a.primary, orderMap),
    resolveBomStationSortRank(a.summary, orderMap),
    ...a.variants.map(v =>
      resolveBomStationSortRank(
        { station_sort_order: null, station_code_text: v.station_code, station_number: null },
        orderMap
      )
    )
  )
  const rankB = Math.min(
    resolveBomStationSortRank(b.primary, orderMap),
    resolveBomStationSortRank(b.summary, orderMap),
    ...b.variants.map(v =>
      resolveBomStationSortRank(
        { station_sort_order: null, station_code_text: v.station_code, station_number: null },
        orderMap
      )
    )
  )

  if (rankA !== rankB) return rankA - rankB

  const codeA = displayBomStationCode(a.summary.station_code_text || a.primary.station_code_text || '')
  const codeB = displayBomStationCode(b.summary.station_code_text || b.primary.station_code_text || '')
  if (codeA !== codeB) return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' })

  return (a.summary.part_number || '').localeCompare(b.summary.part_number || '', undefined, {
    numeric: true,
    sensitivity: 'base'
  })
}

export function sortBomDisplayGroups(groups: BomDisplayGroup[], stations: Station[]): BomDisplayGroup[] {
  const orderMap = buildStationOrderMap(stations)
  return [...groups].sort((a, b) => compareBomGroupsByStation(a, b, orderMap))
}
