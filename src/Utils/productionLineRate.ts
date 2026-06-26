/** Line JPH = total required plan ÷ available working hours. */
export function computeLineJph(availableHours: number, totalPlanQty: number): number | null {
  if (availableHours <= 0 || totalPlanQty <= 0) return null
  return totalPlanQty / availableHours
}

/** Takt time in minutes = 60 ÷ JPH */
export function computeTaktMinutes(jph: number | null): number | null {
  if (jph == null || jph <= 0) return null
  return 60 / jph
}

export function formatLineRate(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

export function formatTaktMinutes(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

/** Lost vehicles during a stop = ceil(stop minutes ÷ takt minutes). */
export function lostVehiclesFromStopMinutes(stopMinutes: number, taktMinutes: number | null): number {
  if (stopMinutes <= 0 || taktMinutes == null || taktMinutes <= 0) return 0
  return Math.ceil(stopMinutes / taktMinutes)
}
