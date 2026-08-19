import type { ShortageMissionLink } from '../Types/mission'

export type ShortagePartRef = {
  id: string
  vehicleId: string
  vin: string
}

export function shortageMissionsForParts(
  parts: ShortagePartRef[],
  links: ShortageMissionLink[]
): ShortageMissionLink[] {
  if (!parts.length || !links.length) return []
  const vehicleIds = new Set(parts.map(p => p.vehicleId))
  const partIds = new Set(parts.map(p => p.id))
  const vins = new Set(parts.map(p => p.vin.trim()).filter(Boolean))
  return links.filter(link => {
    if (link.sourceVehicleId && vehicleIds.has(link.sourceVehicleId)) return true
    if (link.sourceMissingPartId && partIds.has(link.sourceMissingPartId)) return true
    if (link.sourceScratchId && partIds.has(link.sourceScratchId)) return true
    const vin = link.sourceVin?.trim()
    return Boolean(vin && vins.has(vin))
  })
}
