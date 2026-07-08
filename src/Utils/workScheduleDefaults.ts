/** Factory default shift: 7:00 AM – 5:30 PM (same as planning work-days tab) */
export const DEFAULT_WORK_SHIFT_START = '07:00'
export const DEFAULT_WORK_SHIFT_END = '17:30'

/** Default planned working hours per work/overtime day */
export const DEFAULT_PLANNED_WORK_HOURS = 10

/** Parse "HH:MM" to minutes since midnight */
function timeToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** Shift length in hours from start/end times (e.g. 07:00–17:30 → 10.5) */
export function computeShiftHoursBetween(start: string, end: string): number {
  const diff = timeToMinutes(end) - timeToMinutes(start)
  return diff > 0 ? Math.round((diff / 60) * 100) / 100 : 0
}

export const DEFAULT_SHIFT_HOURS = computeShiftHoursBetween(DEFAULT_WORK_SHIFT_START, DEFAULT_WORK_SHIFT_END)

export function formatShiftRange(start: string, end: string): string {
  return `${start} – ${end}`
}
