/** Format a numeric range for display, e.g. 20–50 */
export function formatRangeBounds(min: number | null | undefined, max: number | null | undefined): string {
  const hasMin = min != null && Number.isFinite(min)
  const hasMax = max != null && Number.isFinite(max)
  if (!hasMin && !hasMax) return ''
  if (hasMin && hasMax) return `${formatRangeNumber(min!)}–${formatRangeNumber(max!)}`
  if (hasMin) return `≥${formatRangeNumber(min!)}`
  return `≤${formatRangeNumber(max!)}`
}

export function formatRangeNumber(n: number): string {
  const rounded = Math.round(n * 1000) / 1000
  return String(rounded)
}

/** Parse free-text like "20–50", "20-50", "20 to 50" into min/max. */
export function parseRangeBoundsText(raw: string | null | undefined): {
  min: number | null
  max: number | null
} {
  const text = (raw || '').trim()
  if (!text) return { min: null, max: null }
  const match = text.match(/(-?\d+(?:[.,]\d+)?)\s*(?:–|-|to|إلى|الى)\s*(-?\d+(?:[.,]\d+)?)/i)
  if (!match) return { min: null, max: null }
  const min = Number(match[1].replace(',', '.'))
  const max = Number(match[2].replace(',', '.'))
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: null, max: null }
  return { min, max }
}

/**
 * Actual range = theoretical × (efficiency% / 100).
 * Example: 20–50 at 90% → 18–45
 */
export function computeActualOperatingRange(
  rangeMin: number | null | undefined,
  rangeMax: number | null | undefined,
  efficiencyPercent: number | null | undefined
): string {
  if (rangeMin == null || rangeMax == null || efficiencyPercent == null) return ''
  if (!Number.isFinite(rangeMin) || !Number.isFinite(rangeMax) || !Number.isFinite(efficiencyPercent)) {
    return ''
  }
  const factor = efficiencyPercent / 100
  return formatRangeBounds(rangeMin * factor, rangeMax * factor)
}

export function parseOptionalNumber(raw: string | null | undefined): number | null {
  const trimmed = (raw || '').trim()
  if (!trimmed) return null
  const n = Number(trimmed.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
