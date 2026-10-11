import type { ProductivityDelayKind } from '../Types/productivityDelayReason'

export function delayReasonKey(workDate: string, kind: ProductivityDelayKind): string {
  return `${workDate}|${kind}`
}

export function formatDayLabel(workDate: string, lang: string): string {
  const date = new Date(`${workDate}T12:00:00`)
  const weekday = date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long' })
  return `${weekday} ${date.getDate()}`
}

export function formatEfficiency(value: number | null): string {
  return value == null ? '—' : `${value}%`
}
