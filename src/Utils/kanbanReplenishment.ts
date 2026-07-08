import type { KanbanPartInput, KanbanPartResult, KanbanCalculationBasis, KanbanTripGroup } from '../Types/kanbanFeeding'
import { computeTaktMinutes } from './productionLineRate'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function ceilDiv(a: number, b: number): number {
  if (b <= 0) return 0
  return Math.ceil(a / b)
}

/** حساب Kanban لجزء واحد على JPH واحد */
export function computeKanbanPart(part: KanbanPartInput, basis: KanbanCalculationBasis): KanbanPartResult {
  const jph = basis.jph
  const consumptionPerHour = jph * part.qtyPerVehicle
  const consumptionPerMinute = consumptionPerHour / 60
  const taktMinutes = computeTaktMinutes(jph) ?? 0

  const rackCoverageMinutes =
    part.rackQty > 0 && consumptionPerMinute > 0 ? part.rackQty / consumptionPerMinute : 0

  const replenishmentFreqMinutes = rackCoverageMinutes

  const leadDemand = consumptionPerMinute * basis.warehouseLeadTimeMin
  const reorderPointQty = Math.ceil(basis.safetyFactor * leadDemand)
  const safetyStockQty = Math.ceil(basis.safetyFactor * leadDemand * 0.5)

  const unitsPerTrip = part.cartonQty > 0 ? part.cartonQty : part.rackQty
  const tripsPerRackRefill = unitsPerTrip > 0 ? ceilDiv(part.rackQty, unitsPerTrip) : 1

  const replenishmentsPerShift =
    replenishmentFreqMinutes > 0 ? Math.floor((basis.shiftHours * 60) / replenishmentFreqMinutes) : 0

  const lotProductionHours = jph > 0 ? basis.lotSize / jph : 0

  const partsPerLot = part.qtyPerVehicle * basis.lotSize
  const tripsForLot = unitsPerTrip > 0 ? ceilDiv(partsPerLot, unitsPerTrip) : 1

  const replenishmentsPerLot =
    replenishmentFreqMinutes > 0 ? ceilDiv(lotProductionHours * 60, replenishmentFreqMinutes) : 0

  return {
    ...part,
    consumptionPerHour: round2(consumptionPerHour),
    consumptionPerMinute: round2(consumptionPerMinute),
    taktMinutes: round2(taktMinutes),
    rackCoverageMinutes: round2(rackCoverageMinutes),
    replenishmentFreqMinutes: round2(replenishmentFreqMinutes),
    reorderPointQty,
    safetyStockQty,
    tripsPerRackRefill,
    partsPerLot,
    tripsForLot,
    replenishmentsPerShift,
    replenishmentsPerLot,
    lotProductionHours: round2(lotProductionHours)
  }
}

export function computeKanbanBoard(parts: KanbanPartInput[], basis: KanbanCalculationBasis): KanbanPartResult[] {
  return parts.map(p => computeKanbanPart(p, basis))
}

/**
 * تجميع الأجزاء في رحلات تغذية حسب سعة الكرتونة/الراك.
 * كل رحلة = مجموعة أجزاء يُعاد ترتيبها بأقصى حمولة لكل جزء = cartonQty.
 */
export function splitIntoFeedingTrips(
  parts: KanbanPartInput[],
  maxPartsPerTrip = 12
): KanbanTripGroup[] {
  const trips: KanbanTripGroup[] = []
  let tripIndex = 1
  let current: KanbanTripGroup = { tripIndex, parts: [], totalUnits: 0 }

  for (const p of parts) {
    const unitsPerTrip = p.cartonQty > 0 ? p.cartonQty : p.rackQty || 1
    const qty = p.rackQty > 0 ? p.rackQty : unitsPerTrip

    if (current.parts.length >= maxPartsPerTrip) {
      trips.push(current)
      tripIndex += 1
      current = { tripIndex, parts: [], totalUnits: 0 }
    }

    current.parts.push({
      partNumber: p.partNumber,
      partName: p.partName,
      qty,
      cartonQty: unitsPerTrip
    })
    current.totalUnits += qty
  }

  if (current.parts.length > 0) trips.push(current)
  return trips
}

/** تقدير إجمالي رحلات التغذية لشفت كامل */
export function totalTripsPerShift(results: KanbanPartResult[]): number {
  return results.reduce((sum, r) => sum + r.tripsPerRackRefill * r.replenishmentsPerShift, 0)
}
