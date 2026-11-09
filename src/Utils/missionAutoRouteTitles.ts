import type { MissionAutoRouteEvent } from '../Types/missionAutoRoute'

export function missionAutoRouteEventLabelKey(event: MissionAutoRouteEvent): string {
  return `missions.fixedRoutes.events.${event}`
}

export function missingPartVehicleMissionTitle(vin: string, modelName?: string | null): string {
  const bits = [vin.trim(), modelName?.trim()].filter(Boolean)
  return bits.length ? `نواقص — ${bits.join(' · ')}` : 'نواقص — عربية جديدة'
}

export function scratchMissionTitle(vin: string, modelName?: string | null): string {
  const bits = [vin.trim(), modelName?.trim()].filter(Boolean)
  return bits.length ? `خدش — ${bits.join(' · ')}` : 'خدش جديد'
}

export function damagedPartMissionTitle(partNumber: string, modelName?: string | null): string {
  const bits = [partNumber.trim(), modelName?.trim()].filter(Boolean)
  return bits.length ? `جزء تالف — ${bits.join(' · ')}` : 'جزء تالف جديد'
}

export function internalQualityMissionTitle(problem: string): string {
  const short = problem.trim()
  const clipped = short.length > 80 ? `${short.slice(0, 77)}…` : short
  return clipped ? `جودة داخلية — ${clipped}` : 'جودة داخلية — مشكلة جديدة'
}

export function externalQualityMissionTitle(description: string): string {
  const short = description.trim()
  const clipped = short.length > 80 ? `${short.slice(0, 77)}…` : short
  return clipped ? `جودة خارجية — ${clipped}` : 'جودة خارجية — ملاحظة جديدة'
}
