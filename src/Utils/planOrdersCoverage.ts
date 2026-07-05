import type { ProductionOrder } from '../Types/production'
import type { VehicleModel } from '../Types/settings'
import type { PlanFamilyGroup, PlanSection } from './productionPlanSummary'

export type PlanOrdersCoverageStatus = 'ok' | 'over' | 'short' | 'no_plan' | 'no_orders'

export type PlanOrdersCoverageRow = {
  key: string
  label: string
  planQty: number
  ordersQty: number
  /** موجب = أوامر أقل من الخطة، سالب = أوامر أكثر من الخطة */
  gap: number
  status: PlanOrdersCoverageStatus
  orderCount: number
}

function monthPrefix(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

/** هل الأمر يخص شهر الخطة؟ */
export function orderBelongsToPlanMonth(
  order: ProductionOrder,
  year: number,
  month: number
): boolean {
  if (order.status === 'cancelled') return false
  const prefix = monthPrefix(year, month)
  const candidates = [order.plannedStart, order.plannedEnd, order.createdAt?.slice(0, 10)].filter(
    (d): d is string => Boolean(d)
  )
  if (candidates.length === 0) {
    const now = new Date()
    return now.getFullYear() === year && now.getMonth() + 1 === month
  }
  return candidates.some(d => d.slice(0, 7) === prefix)
}

export function sumOrdersQtyByModelId(
  orders: ProductionOrder[],
  year: number,
  month: number
): Map<string, { qty: number; count: number }> {
  const map = new Map<string, { qty: number; count: number }>()
  for (const order of orders) {
    if (!order.modelId || !orderBelongsToPlanMonth(order, year, month)) continue
    const cur = map.get(order.modelId) ?? { qty: 0, count: 0 }
    cur.qty += order.plannedQty || 0
    cur.count += 1
    map.set(order.modelId, cur)
  }
  return map
}

function modelToFamilyId(models: VehicleModel[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const m of models) {
    if (m.model_kind === 'family') {
      map.set(m.id, m.id)
    } else if (m.parent_model_id) {
      map.set(m.id, m.parent_model_id)
    } else {
      map.set(m.id, m.id)
    }
  }
  return map
}

function coverageStatus(planQty: number, ordersQty: number): PlanOrdersCoverageStatus {
  if (planQty <= 0 && ordersQty <= 0) return 'ok'
  if (planQty <= 0 && ordersQty > 0) return 'no_plan'
  if (planQty > 0 && ordersQty <= 0) return 'no_orders'
  if (ordersQty > planQty) return 'over'
  if (ordersQty < planQty) return 'short'
  return 'ok'
}

/** تغطية الأوامر مقابل خطة كل عائلة/خط */
export function buildPlanOrdersCoverage(
  sections: PlanSection[],
  orders: ProductionOrder[],
  models: VehicleModel[],
  year: number,
  month: number
): PlanOrdersCoverageRow[] {
  const byModel = sumOrdersQtyByModelId(orders, year, month)
  const familyOf = modelToFamilyId(models)

  return sections.map(section => {
    const group = section.group
    const memberIds = new Set<string>([group.familyId, ...group.variants.map(v => v.modelId)])

    let ordersQty = 0
    let orderCount = 0
    for (const [modelId, stats] of byModel) {
      const familyId = familyOf.get(modelId) ?? modelId
      if (memberIds.has(modelId) || memberIds.has(familyId)) {
        ordersQty += stats.qty
        orderCount += stats.count
      }
    }

    const planQty = group.planned
    const gap = planQty - ordersQty
    return {
      key: group.key,
      label: group.label,
      planQty,
      ordersQty,
      gap,
      status: coverageStatus(planQty, ordersQty),
      orderCount
    }
  })
}

export function summarizePlanOrdersCoverage(rows: PlanOrdersCoverageRow[]): {
  planTotal: number
  ordersTotal: number
  gap: number
  overCount: number
  shortCount: number
  noOrdersCount: number
  noPlanCount: number
  alerts: PlanOrdersCoverageRow[]
} {
  const alerts = rows.filter(r => r.status !== 'ok')
  return {
    planTotal: rows.reduce((s, r) => s + r.planQty, 0),
    ordersTotal: rows.reduce((s, r) => s + r.ordersQty, 0),
    gap: rows.reduce((s, r) => s + r.gap, 0),
    overCount: rows.filter(r => r.status === 'over' || r.status === 'no_plan').length,
    shortCount: rows.filter(r => r.status === 'short').length,
    noOrdersCount: rows.filter(r => r.status === 'no_orders').length,
    noPlanCount: rows.filter(r => r.status === 'no_plan').length,
    alerts
  }
}

export function coverageByKey(rows: PlanOrdersCoverageRow[]): Map<string, PlanOrdersCoverageRow> {
  return new Map(rows.map(r => [r.key, r]))
}

/** للاستخدام في صف عائلة الخطة */
export function coverageForGroup(
  group: PlanFamilyGroup,
  coverageMap: Map<string, PlanOrdersCoverageRow>
): PlanOrdersCoverageRow | undefined {
  return coverageMap.get(group.key)
}
