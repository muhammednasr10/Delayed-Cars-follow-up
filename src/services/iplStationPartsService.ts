import { fetchIplBomAndMasters } from './bomIplService'
import { groupIplFittedPartsByStation, type IplStationPart } from '../Utils/iplStationParts'

export async function fetchIplFittedPartsByStation(modelName: string): Promise<Map<string, IplStationPart[]>> {
  const name = modelName.trim()
  if (!name) return new Map()
  const { allBom } = await fetchIplBomAndMasters()
  return groupIplFittedPartsByStation(allBom, name)
}
