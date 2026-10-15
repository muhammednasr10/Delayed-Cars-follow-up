import { fetchIplBomAndMasters } from './bomIplService'
import { groupIplFittedPartsByStation, mergeFittedPartsAcrossModels, type IplStationPart } from '../Utils/iplStationParts'

export async function fetchIplFittedPartsByStation(modelName: string): Promise<Map<string, IplStationPart[]>> {
  const name = modelName.trim()
  if (!name) return new Map()
  const { allBom } = await fetchIplBomAndMasters()
  return groupIplFittedPartsByStation(allBom, name)
}

/** Fitted IPL parts for every selected model, with each model's part number and quantity. */
export async function fetchIplFittedPartsForModels(modelNames: string[]): Promise<Map<string, IplStationPart[]>> {
  const names = [...new Set(modelNames.map(name => name.trim()).filter(Boolean))]
  if (names.length === 0) return new Map()
  const { allBom } = await fetchIplBomAndMasters()
  return mergeFittedPartsAcrossModels(allBom, names)
}
