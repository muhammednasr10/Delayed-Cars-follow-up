import { useEffect, useState } from 'react'
import { getDamagedParts } from '../services/damagedPartsService'
import { getModelPlanTargets } from '../services/modelProductionPlanService'
import { getProductionOrders } from '../services/productionOrdersService'
import { getProductionPlanWorkDays } from '../services/productionPlanWorkDaysService'
import { getScratches } from '../services/scratchesService'
import { orderBelongsToPlanMonth } from '../Utils/planOrdersCoverage'

function currentYm(): { year: number; month: number; start: string; end: string; prefix: string } {
  const d = new Date()
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  const last = new Date(year, month, 0).getDate()
  return {
    year,
    month,
    prefix,
    start: `${prefix}-01`,
    end: `${prefix}-${String(last).padStart(2, '0')}`
  }
}

function inMonth(iso: string | null | undefined, prefix: string): boolean {
  if (!iso) return false
  return iso.slice(0, 7) === prefix
}

export function useHomeCardMonthStats(refreshKey = 0) {
  const [plannedVehicles, setPlannedVehicles] = useState(0)
  const [workHours, setWorkHours] = useState(0)
  const [ordersWorked, setOrdersWorked] = useState(0)
  const [ordersCount, setOrdersCount] = useState(0)
  const [damagedQty, setDamagedQty] = useState(0)
  const [damagedCost, setDamagedCost] = useState<number | null>(null)
  const [scratchesCount, setScratchesCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const { year, month, prefix } = currentYm()
    setLoading(true)

    void Promise.all([
      getModelPlanTargets(year, month).catch(() => []),
      getProductionPlanWorkDays(year, month).catch(() => null),
      getProductionOrders().catch(() => []),
      getDamagedParts().catch(() => []),
      getScratches().catch(() => [])
    ])
      .then(([modelTargets, workDays, orders, damaged, scratches]) => {
        if (cancelled) return

        setPlannedVehicles(modelTargets.reduce((s, row) => s + (row.targetQty || 0), 0))
        setWorkHours(workDays?.availableHours ?? 0)

        const worked = orders.filter(order => {
          if (order.status === 'cancelled' || order.status === 'planned') return false
          if (order.status === 'in_progress' || order.status === 'on_hold') return true
          if (order.status === 'completed') {
            return (
              inMonth(order.updatedAt, prefix) ||
              inMonth(order.createdAt, prefix) ||
              inMonth(order.plannedEnd, prefix) ||
              inMonth(order.plannedStart, prefix)
            )
          }
          return false
        }).length
        setOrdersWorked(worked)
        setOrdersCount(orders.filter(order => orderBelongsToPlanMonth(order, year, month)).length)

        let qty = 0
        let cost = 0
        let hasCost = false
        for (const row of damaged) {
          if (!inMonth(row.reportedAt, prefix) && !inMonth(row.createdAt, prefix)) continue
          qty += row.quantity || 0
          if (row.unitCost != null && Number.isFinite(row.unitCost)) {
            hasCost = true
            cost += (row.quantity || 0) * row.unitCost
          }
        }
        setDamagedQty(qty)
        setDamagedCost(hasCost ? cost : null)

        setScratchesCount(scratches.filter(row => inMonth(row.recordedAt, prefix)).length)
      })
      .catch(() => {
        if (cancelled) return
        setPlannedVehicles(0)
        setWorkHours(0)
        setOrdersWorked(0)
        setOrdersCount(0)
        setDamagedQty(0)
        setDamagedCost(null)
        setScratchesCount(0)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return {
    plannedVehicles,
    workHours,
    ordersWorked,
    ordersCount,
    damagedQty,
    damagedCost,
    scratchesCount,
    loading,
    monthStart: currentYm().start,
    monthEnd: currentYm().end
  }
}
