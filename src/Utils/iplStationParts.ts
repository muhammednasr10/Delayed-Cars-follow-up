import type { BomItemDetail } from '../Types/bom'
import { displayBomStationCode } from './bomStationCode'
import { iplFitStatusForModel } from './iplFitStatus'
import { iplModelNamesMatch } from './iplModelAliases'
import { iplDisplayPartNumber } from './iplModelParts'
import { normalizeStationReferenceCode } from './stationHierarchy'

export type IplPartOnModel = {
  modelName: string
  partNumber: string
  quantity: number
}

export type IplStationPart = {
  bomItemId: string
  partId: string
  partNumber: string
  partName: string
  quantity: number
  /** Fitted models for this part. One entry per selected model. */
  models: IplPartOnModel[]
}

const IPL_PART_NOTE_PREFIX = 'ipl-part:'

export function iplPartNote(partId: string, copyIndex = 0, partNumber?: string): string {
  const id = partId.trim()
  const base = !copyIndex ? `${IPL_PART_NOTE_PREFIX}${id}` : `${IPL_PART_NOTE_PREFIX}${id}#${copyIndex}`
  const number = partNumber?.trim()
  if (!number) return base
  return `${base}@${number}`
}

function iplPartNoteBody(notes: string): string | null {
  const text = notes.trim()
  if (!text.startsWith(IPL_PART_NOTE_PREFIX)) return null
  const rest = text.slice(IPL_PART_NOTE_PREFIX.length).trim()
  const at = rest.indexOf('@')
  return (at >= 0 ? rest.slice(0, at) : rest).trim()
}

export function iplPartIdFromNotes(notes: string | null | undefined): string | null {
  const body = iplPartNoteBody(notes?.trim() ?? '')
  if (!body) return null
  const hash = body.lastIndexOf('#')
  const id = (hash > 0 ? body.slice(0, hash) : body).trim()
  return id || null
}

export function iplPartCopyFromNotes(notes: string | null | undefined): number {
  const body = iplPartNoteBody(notes?.trim() ?? '')
  if (!body) return 0
  const hash = body.lastIndexOf('#')
  if (hash < 0) return 0
  const copy = Number(body.slice(hash + 1))
  return Number.isInteger(copy) && copy > 0 ? copy : 0
}

export function iplPartNumberFromNotes(notes: string | null | undefined): string {
  const text = notes?.trim() ?? ''
  if (!text.startsWith(IPL_PART_NOTE_PREFIX)) return ''
  const rest = text.slice(IPL_PART_NOTE_PREFIX.length)
  const at = rest.indexOf('@')
  if (at < 0) return ''
  return rest.slice(at + 1).trim()
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
    const quantity = Number.isFinite(qty) && qty > 0 ? qty : 1
    const partNumber = iplDisplayPartNumber(row.part_number) || row.part_number?.trim() || '—'
    const part: IplStationPart = {
      bomItemId: row.id,
      partId: row.part_id,
      partNumber,
      partName: row.part_name_ar?.trim() || row.part_number?.trim() || '—',
      quantity,
      models: [{ modelName: model, partNumber, quantity }]
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

function preferModelFit(current: IplPartOnModel, next: IplPartOnModel): IplPartOnModel {
  if (next.quantity > current.quantity) return next
  if (!iplDisplayPartNumber(current.partNumber) && iplDisplayPartNumber(next.partNumber)) return next
  return current
}

/** Fitted parts for the selected models, one row per part, with each model's number and quantity. */
export function mergeFittedPartsAcrossModels(
  rows: BomItemDetail[],
  modelNames: string[]
): Map<string, IplStationPart[]> {
  const names = [...new Set(modelNames.map(name => name.trim()).filter(Boolean))]
  const merged = new Map<string, Map<string, IplStationPart>>()
  for (const name of names) {
    for (const [station, parts] of groupIplFittedPartsByStation(rows, name)) {
      let byPart = merged.get(station)
      if (!byPart) {
        byPart = new Map()
        merged.set(station, byPart)
      }
      for (const part of parts) {
        const prev = byPart.get(part.partId)
        if (!prev) {
          byPart.set(part.partId, { ...part, models: [...part.models] })
          continue
        }
        for (const fit of part.models) {
          const index = prev.models.findIndex(item => iplModelNamesMatch(item.modelName, fit.modelName))
          if (index < 0) prev.models.push(fit)
          else prev.models[index] = preferModelFit(prev.models[index], fit)
        }
      }
    }
  }

  const out = new Map<string, IplStationPart[]>()
  for (const [station, byPart] of merged) {
    const parts = [...byPart.values()].map(part => {
      const models = names
        .map(name => part.models.find(item => iplModelNamesMatch(item.modelName, name)))
        .filter((item): item is IplPartOnModel => Boolean(item))
      const numbers = [...new Set(models.map(item => item.partNumber))]
      const quantities = [...new Set(models.map(item => item.quantity))]
      return {
        ...part,
        models,
        partNumber: numbers.length === 1 ? numbers[0] : part.partNumber,
        quantity: quantities.length === 1 ? quantities[0] : part.quantity
      }
    })
    out.set(
      station,
      parts.sort((a, b) => a.partNumber.localeCompare(b.partNumber, 'en'))
    )
  }
  return out
}
