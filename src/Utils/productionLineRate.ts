/** Line JPH = total planned hours ÷ total required plan (current month). */
export function computeLineJph(plannedHours: number, totalPlanQty: number): number | null {
  if (plannedHours <= 0 || totalPlanQty <= 0) return null
  return plannedHours / totalPlanQty
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
