import type { BomItemDetail } from '../Types/bom'
import { displayBomStationCode } from './bomStationCode'
import { iplFitStatusForModel } from './iplFitStatus'
import { normalizeStationReferenceCode } from './stationHierarchy'

export type IplStationPart = {
  bomItemId: string
  partId: string
  partNumber: string
  partName: string
  quantity: number
}

const IPL_PART_NOTE_PREFIX = 'ipl-part:'

export function iplPartNote(partId: string): string {
  return `${IPL_PART_NOTE_PREFIX}${partId}`
}

export function iplPartIdFromNotes(notes: string | null | undefined): string | null {
  const text = notes?.trim() ?? ''
  if (!text.startsWith(IPL_PART_NOTE_PREFIX)) return null
  const id = text.slice(IPL_PART_NOTE_PREFIX.length).trim()
  return id || null
}

/** Same station key for IPL codes (PBS-01) and worker lines (PBS01-L1). */
export function iplStationKey(code: string | null | undefined): string {
  const display = displayBomStationCode(code ?? '')
  if (!display) return ''
  return normalizeStationReferenceCode(display).toUpperCase()
}

/** Fitted IPL parts for one model, grouped by master station. */
export function groupIplFittedPartsByStation(
  rows: BomItemDetail[],
  modelName: string
): Map<string, IplStationPart[]> {
  const model = modelName.trim()
  const grouped = new Map<string, Map<string, IplStationPart>>()
  if (!model) return new Map()

  for (const row of rows) {
    if (!row.part_id) continue
    if (iplFitStatusForModel(row, model) !== 'fitted') continue
    const station = iplStationKey(row.station_code_text)
    if (!station) continue
    const qty = Number(row.quantity)
    const part: IplStationPart = {
      bomItemId: row.id,
      partId: row.part_id,
      partNumber: row.part_number?.trim() || '—',
      partName: row.part_name_ar?.trim() || row.part_number?.trim() || '—',
      quantity: Number.isFinite(qty) && qty > 0 ? qty : 1
    }
    let byPart = grouped.get(station)
    if (!byPart) {
      byPart = new Map()
      grouped.set(station, byPart)
    }
    const prev = byPart.get(part.partId)
    if (!prev || part.quantity > prev.quantity) byPart.set(part.partId, part)
  }

  const out = new Map<string, IplStationPart[]>()
  for (const [station, byPart] of grouped) {
    out.set(
      station,
      [...byPart.values()].sort((a, b) => a.partNumber.localeCompare(b.partNumber, 'en'))
    )
  }
  return out
}
