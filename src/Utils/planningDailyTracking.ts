import type { PlanDayType } from '../Types/productionPlanWorkDayDaily'

export type DailyTrackingSourceRow = {
  workDate: string
  dayType: PlanDayType
  plannedHours: number
}

export type DailyTrackingRow = {
  workDate: string
  dayType: PlanDayType
  isWorkingDay: boolean
  planned: number
  entry: number
  exit: number
  /** موجب = متأخر عن الخطة (حسب الخروج) */
  dayDeficit: number
  cumulativeDeficit: number
}

export function isPlanWorkingDay(dayType: PlanDayType): boolean {
  return dayType === 'work' || dayType === 'overtime'
}

/** توزيع خطة الشهر على أيام العمل حسب ساعات الخطة اليومية */
export function allocateDailyPlan(
  monthlyPlan: number,
  rows: DailyTrackingSourceRow[]
): Map<string, number> {
  const map = new Map<string, number>()
  const working = rows.filter(r => isPlanWorkingDay(r.dayType))
  for (const row of rows) map.set(row.workDate, 0)

  if (monthlyPlan <= 0 || working.length === 0) return map

  const totalHours = working.reduce((s, r) => s + Math.max(0, r.plannedHours), 0)
  let allocated = 0

  working.forEach((row, index) => {
    const isLast = index === working.length - 1
    let qty: number
    if (isLast) {
      qty = Math.max(0, monthlyPlan - allocated)
    } else if (totalHours > 0) {
      qty = Math.round((monthlyPlan * Math.max(0, row.plannedHours)) / totalHours)
    } else {
      qty = Math.round(monthlyPlan / working.length)
    }
    map.set(row.workDate, qty)
    allocated += qty
  })

  return map
}

export function buildDailyTrackingRows(
  rows: DailyTrackingSourceRow[],
  monthlyPlan: number,
  entryByDate: Map<string, number>,
  exitByDate: Map<string, number>,
  /** لا نحسب العجز المتراكم بعد هذا التاريخ (مثلاً اليوم) */
  throughDate?: string
): DailyTrackingRow[] {
  const dailyPlan = allocateDailyPlan(monthlyPlan, rows)
  let cumulative = 0
  const limit = throughDate ?? '9999-12-31'

  return rows.map(row => {
    const planned = dailyPlan.get(row.workDate) ?? 0
    const entry = entryByDate.get(row.workDate) ?? 0
    const exit = exitByDate.get(row.workDate) ?? 0
    const working = isPlanWorkingDay(row.dayType)
    const inRange = row.workDate <= limit
    const dayDeficit = working && inRange ? planned - exit : 0
    if (working && inRange) cumulative += dayDeficit
    return {
      workDate: row.workDate,
      dayType: row.dayType,
      isWorkingDay: working,
      planned,
      entry,
      exit,
      dayDeficit,
      cumulativeDeficit: cumulative
    }
  })
}

export function localTodayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** أيام الأسبوع الحالي (السبت → الجمعة) ضمن الشهر المعروض إن أمكن */
export function weekDatesContaining(isoDate: string): string[] {
  const d = new Date(isoDate + 'T12:00:00')
  const day = d.getDay() // 0=Sun … 6=Sat
  // الأسبوع يبدأ السبت
  const offsetFromSaturday = (day + 1) % 7
  const start = new Date(d)
  start.setDate(d.getDate() - offsetFromSaturday)
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const cur = new Date(start)
    cur.setDate(start.getDate() + i)
    const y = cur.getFullYear()
    const m = String(cur.getMonth() + 1).padStart(2, '0')
    const dayNum = String(cur.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${dayNum}`)
  }
  return dates
}

export function sumThrough(
  rows: DailyTrackingRow[],
  throughDate: string
): { planned: number; entry: number; exit: number; deficit: number } {
  let planned = 0
  let entry = 0
  let exit = 0
  for (const row of rows) {
    if (!row.isWorkingDay || row.workDate > throughDate) continue
    planned += row.planned
    entry += row.entry
    exit += row.exit
  }
  return { planned, entry, exit, deficit: planned - exit }
}
