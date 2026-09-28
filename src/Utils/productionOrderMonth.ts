import type { ProductionOrder } from '../Types/production'

function monthPrefix(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function orderOpenedMonth(order: ProductionOrder): string | null {
  const raw = order.openedAt ?? order.createdAt ?? order.plannedStart ?? null
  if (!raw) return null
  return raw.slice(0, 7)
}

/** Order finished for carry-over purposes (completed status or full assembly entry). */
export function isProductionOrderFinished(order: ProductionOrder, assemblyEntry = 0): boolean {
  if (order.status === 'completed' || order.status === 'cancelled') return true
  if (order.plannedQty > 0 && assemblyEntry >= order.plannedQty) return true
  return false
}

/**
 * Month list visibility:
 * - opened in the selected month, or
 * - unfinished and opened in an earlier month (carry into the new month).
 */
export function orderVisibleInPlanMonth(
  order: ProductionOrder,
  year: number,
  month: number,
  assemblyEntry = 0
): boolean {
  if (order.status === 'cancelled') return false
  const prefix = monthPrefix(year, month)
  const opened = orderOpenedMonth(order)

  if (opened === prefix) return true

  if (!isProductionOrderFinished(order, assemblyEntry) && opened && opened < prefix) {
    return true
  }

  // Legacy rows with no dates: only show in the current calendar month
  if (!opened) {
    const now = new Date()
    return now.getFullYear() === year && now.getMonth() + 1 === month
  }

  return false
}

/** @deprecated use orderVisibleInPlanMonth — kept for coverage/plan helpers */
export function orderBelongsToPlanMonth(order: ProductionOrder, year: number, month: number): boolean {
  return orderVisibleInPlanMonth(order, year, month, 0)
}
