import { fetchIplBomAndMasters } from './bomIplService'
import { groupIplFittedPartsByStation, type IplStationPart } from '../Utils/iplStationParts'

export async function fetchIplFittedPartsByStation(modelName: string): Promise<Map<string, IplStationPart[]>> {
  const name = modelName.trim()
  if (!name) return new Map()
  const { allBom } = await fetchIplBomAndMasters()
  return groupIplFittedPartsByStation(allBom, name)
}

/** Fitted IPL parts for every selected model, merged by station and part. */
export async function fetchIplFittedPartsForModels(modelNames: string[]): Promise<Map<string, IplStationPart[]>> {
  const names = [...new Set(modelNames.map(name => name.trim()).filter(Boolean))]
  if (names.length === 0) return new Map()
  const { allBom } = await fetchIplBomAndMasters()
  const merged = new Map<string, Map<string, IplStationPart>>()
  for (const name of names) {
    for (const [station, parts] of groupIplFittedPartsByStation(allBom, name)) {
      let byPart = merged.get(station)
      if (!byPart) {
        byPart = new Map()
        merged.set(station, byPart)
      }
      for (const part of parts) {
        const prev = byPart.get(part.partId)
        if (!prev || part.quantity > prev.quantity) byPart.set(part.partId, part)
      }
    }
  }
  const out = new Map<string, IplStationPart[]>()
  for (const [station, byPart] of merged) {
    out.set(
      station,
      [...byPart.values()].sort((a, b) => a.partNumber.localeCompare(b.partNumber, 'en'))
    )
  }
  return out
}
