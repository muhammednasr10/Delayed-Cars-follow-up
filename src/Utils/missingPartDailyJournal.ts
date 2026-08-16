import type { MissingPartDetail } from '../Types/missingPart'

export type ShortageVehicleSpan = {
  vehicleId: string
  firstCreatedMs: number
  resolvedMs: number | null
}

export type MissingPartDiaryDay = {
  dayKey: string
  year: number
  month: number
  day: number
  opening: number
  newVehicles: number
  finished: number
}

export function localMonthKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function parseMonthKey(monthKey: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (!year || month < 1 || month > 12) return null
  return { year, month }
}

export function startOfLocalDay(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getTime()
}

export function daysInLocalMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function vehicleShortageSpans(items: MissingPartDetail[]): ShortageVehicleSpan[] {
  const byVehicle = new Map<string, ShortageVehicleSpan>()
  for (const item of items) {
    const createdMs = new Date(item.createdAt).getTime()
    if (Number.isNaN(createdMs)) continue
    const existing = byVehicle.get(item.vehicleId)
    const resolvedMs = item.shortageResolvedAt ? new Date(item.shortageResolvedAt).getTime() : null
    const resolved = resolvedMs != null && !Number.isNaN(resolvedMs) ? resolvedMs : null
    if (!existing) {
      byVehicle.set(item.vehicleId, {
        vehicleId: item.vehicleId,
        firstCreatedMs: createdMs,
        resolvedMs: resolved
      })
      continue
    }
    if (createdMs < existing.firstCreatedMs) existing.firstCreatedMs = createdMs
    if (resolved != null) {
      existing.resolvedMs = existing.resolvedMs == null ? resolved : Math.max(existing.resolvedMs, resolved)
    }
  }
  return [...byVehicle.values()]
}

function isOpenAt(span: ShortageVehicleSpan, instantMs: number): boolean {
  return span.firstCreatedMs < instantMs && (span.resolvedMs == null || span.resolvedMs >= instantMs)
}

function occurredOnDay(ms: number | null, dayStart: number, nextDayStart: number): boolean {
  return ms != null && ms >= dayStart && ms < nextDayStart
}

export function listDiaryMonthOptions(items: MissingPartDetail[], now: Date = new Date()): string[] {
  const current = localMonthKey(now)
  const keys = new Set<string>([current])
  for (const item of items) {
    const created = new Date(item.createdAt)
    if (!Number.isNaN(created.getTime())) keys.add(localMonthKey(created))
    if (item.shortageResolvedAt) {
      const resolved = new Date(item.shortageResolvedAt)
      if (!Number.isNaN(resolved.getTime())) keys.add(localMonthKey(resolved))
    }
  }
  return [...keys].filter(key => key <= current).sort((a, b) => b.localeCompare(a))
}

export function buildMissingPartDiary(
  items: MissingPartDetail[],
  monthKey: string,
  now: Date = new Date()
): MissingPartDiaryDay[] {
  const parsed = parseMonthKey(monthKey)
  if (!parsed) return []

  const { year, month } = parsed
  const lastDay = daysInLocalMonth(year, month)
  const nowMonth = localMonthKey(now)
  const maxDay = monthKey > nowMonth ? 0 : monthKey === nowMonth ? now.getDate() : lastDay
  if (maxDay <= 0) return []

  const spans = vehicleShortageSpans(items)
  const rows: MissingPartDiaryDay[] = []

  for (let day = 1; day <= maxDay; day++) {
    const dayStart = startOfLocalDay(year, month, day)
    const nextDayStart = startOfLocalDay(year, month, day + 1)
    let opening = 0
    let newVehicles = 0
    let finished = 0
    for (const span of spans) {
      if (isOpenAt(span, dayStart)) opening += 1
      if (occurredOnDay(span.firstCreatedMs, dayStart, nextDayStart)) newVehicles += 1
      if (occurredOnDay(span.resolvedMs, dayStart, nextDayStart)) finished += 1
    }
    rows.push({
      dayKey: `${monthKey}-${String(day).padStart(2, '0')}`,
      year,
      month,
      day,
      opening,
      newVehicles,
      finished
    })
  }

  return rows
}

export function diaryDayTotals(rows: MissingPartDiaryDay[]): { newVehicles: number; finished: number } {
  return rows.reduce(
    (acc, row) => {
      acc.newVehicles += row.newVehicles
      acc.finished += row.finished
      return acc
    },
    { newVehicles: 0, finished: 0 }
  )
}
