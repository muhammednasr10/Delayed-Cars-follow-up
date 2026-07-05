import type { ProductionOrder } from '../Types/production'
import type { ProductionPlanWorkDayEdit } from '../Types/productionPlanWorkDayDaily'
import type { DailyTrackingRow } from './planningDailyTracking'
import type { PlanOrdersCoverageRow } from './planOrdersCoverage'
import { planProgressPercent, type PlanFamilySection } from './productionPlanSummary'

export function formatExportGap(gap: number): string {
  if (gap === 0) return '0'
  return gap > 0 ? `+${gap}` : String(gap)
}

export function formatExportSigned(n: number): string {
  if (n === 0) return '0'
  return n > 0 ? `+${n}` : String(n)
}

export type PlanSummaryExportRow = {
  model: string
  planned: string
  ordersQty: string
  gap: string
  achieved: string
  progress: string
}

export function buildPlanSummaryExportRows(
  sections: PlanFamilySection[],
  coverageMap: Map<string, PlanOrdersCoverageRow>
): PlanSummaryExportRow[] {
  const rows: PlanSummaryExportRow[] = []

  for (const section of sections) {
    const group = section.group
    const coverage = coverageMap.get(group.key)
    const ordersQty = coverage?.ordersQty ?? 0
    const gap = coverage?.gap ?? group.planned

    rows.push({
      model: group.label,
      planned: group.planned ? String(group.planned) : '',
      ordersQty: ordersQty ? String(ordersQty) : '',
      gap: formatExportGap(gap),
      achieved: group.achieved ? String(group.achieved) : '',
      progress: `${planProgressPercent(group.planned, group.achieved)}%`
    })

    const familyIsLeaf = group.variants.length === 1 && group.variants[0].modelId === group.familyId
    if (familyIsLeaf) continue

    for (const variant of group.variants) {
      const showVariant = group.entryMode !== 'family_aggregate'
      rows.push({
        model: `— ${variant.label}`,
        planned: showVariant && variant.planned ? String(variant.planned) : '',
        ordersQty: '',
        gap: '',
        achieved: variant.achieved ? String(variant.achieved) : '',
        progress: showVariant ? `${planProgressPercent(variant.planned, variant.achieved)}%` : ''
      })
    }
  }

  return rows
}

export type OrderExportRow = {
  orderNumber: string
  model: string
  chassisStart: string
  chassisEnd: string
  carCount: string
  assemblyEntry: string
}

export function buildOrdersExportRows(
  orders: ProductionOrder[],
  assemblyEntryByOrderId: Map<string, number>,
  modelLabel: (row: ProductionOrder) => string
): OrderExportRow[] {
  return orders.map(row => ({
    orderNumber: row.orderNumber,
    model: modelLabel(row),
    chassisStart: row.chassisStart ?? '',
    chassisEnd: row.chassisEnd ?? '',
    carCount: String(row.plannedQty ?? ''),
    assemblyEntry: String(assemblyEntryByOrderId.get(row.id) ?? 0)
  }))
}

export type DailyTrackingExportRow = {
  date: string
  dayType: string
  plan: string
  entry: string
  exit: string
  dayDeficit: string
  cumulative: string
}

export function buildDailyTrackingExportRows(
  rows: DailyTrackingRow[],
  today: string,
  formatDate: (workDate: string) => string,
  dayTypeLabel: (dayType: DailyTrackingRow['dayType']) => string
): DailyTrackingExportRow[] {
  return rows.map(row => {
    const isFuture = row.workDate > today
    return {
      date: formatDate(row.workDate),
      dayType: dayTypeLabel(row.dayType),
      plan: row.isWorkingDay ? (row.planned ? String(row.planned) : '') : '',
      entry: row.entry ? String(row.entry) : '',
      exit: row.exit ? String(row.exit) : '',
      dayDeficit: row.isWorkingDay && !isFuture ? formatExportSigned(row.dayDeficit) : '',
      cumulative: !isFuture && row.workDate <= today ? formatExportSigned(row.cumulativeDeficit) : ''
    }
  })
}

export type WorkDayExportRow = {
  date: string
  dayType: string
  laborAttendance: string
  plannedHours: string
  actualHours: string
}

export function buildWorkDaysExportRows(
  rows: ProductionPlanWorkDayEdit[],
  formatDate: (workDate: string) => string,
  dayTypeLabel: (dayType: ProductionPlanWorkDayEdit['dayType']) => string,
  formatEfficiency: (value: number | null) => string
): WorkDayExportRow[] {
  return rows.map(row => ({
    date: formatDate(row.workDate),
    dayType: dayTypeLabel(row.dayType),
    laborAttendance: formatEfficiency(row.laborAttendanceEfficiency),
    plannedHours: row.plannedHours ? String(row.plannedHours) : '',
    actualHours: row.actualHours ? String(row.actualHours) : ''
  }))
}