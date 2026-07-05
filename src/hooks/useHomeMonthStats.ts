import { useEffect, useState } from 'react'
import { getDamagedParts } from '../services/damagedPartsService'
import { getModelPlanTargets } from '../services/modelProductionPlanService'
import { getProductionOrders } from '../services/productionOrdersService'
import { getProductionPlanWorkDays } from '../services/productionPlanWorkDaysService'
import { getScratches } from '../services/scratchesService'
import { supabase } from '../lib/supabase'

function currentYm() {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function monthBounds(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const last = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { start, end }
}

function inMonth(iso: string | null | undefined, start: string, end: string): boolean {
  if (!iso) return false
  const day = iso.slice(0, 10)
  return day >= start && day <= end
}

function orderWorkedInMonth(
  order: {
    status: string
    plannedStart?: string | null
    plannedEnd?: string | null
    createdAt?: string
    updatedAt?: string
  },
  start: string,
  end: string
): boolean {
  if (order.status === 'cancelled' || order.status === 'planned') return false
  return (
    inMonth(order.plannedStart, start, end) ||
    inMonth(order.plannedEnd, start, end) ||
    inMonth(order.createdAt, start, end) ||
    inMonth(order.updatedAt, start, end)
  )
}

async function damagedCostByPartIds(partIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (!supabase || partIds.length === 0) return map
  const unique = [...new Set(partIds)]
  const { data, error } = await supabase.from('parts').select('id, unit_cost').in('id', unique)
  if (error) return map
  for (const row of data ?? []) {
    map.set(row.id as string, Number(row.unit_cost ?? 0))
  }
  return map
}

export function useHomeMonthStats(refreshKey = 0) {
  const [plannedVehicles, setPlannedVehicles] = useState(0)
  const [workHours, setWorkHours] = useState(0)
  const [ordersWorked, setOrdersWorked] = useState(0)
  const [damagedQuantity, setDamagedQuantity] = useState(0)
  const [damagedCost, setDamagedCost] = useState(0)
  const [scratchesCount, setScratchesCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const { year, month } = currentYm()
    const { start, end } = monthBounds(year, month)
    setLoading(true)

    void Promise.all([
      getModelPlanTargets(year, month).catch(() => []),
      getProductionPlanWorkDays(year, month).catch(() => null),
      getProductionOrders().catch(() => []),
      getDamagedParts().catch(() => []),
      getScratches().catch(() => [])
    ])
      .then(async ([modelTargets, workDays, orders, damaged, scratches]) => {
        if (cancelled) return

        setPlannedVehicles(modelTargets.reduce((s, r) => s + (r.targetQty || 0), 0))
        setWorkHours(workDays?.availableHours ?? 0)

        setOrdersWorked(orders.filter(o => orderWorkedInMonth(o, start, end)).length)

        const monthDamaged = damaged.filter(d => inMonth(d.reportedAt, start, end))
        const qty = monthDamaged.reduce((s, d) => s + (d.quantity || 0), 0)
        setDamagedQuantity(qty)

        const costMap = await damagedCostByPartIds(monthDamaged.map(d => d.partId))
        if (cancelled) return
        const cost = monthDamaged.reduce((s, d) => s + (d.quantity || 0) * (costMap.get(d.partId) ?? 0), 0)
        setDamagedCost(cost)

        setScratchesCount(scratches.filter(s => inMonth(s.recordedAt, start, end)).length)
      })
      .catch(() => {
        if (!cancelled) {
          setPlannedVehicles(0)
          setWorkHours(0)
          setOrdersWorked(0)
          setDamagedQuantity(0)
          setDamagedCost(0)
          setScratchesCount(0)
        }
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
    damagedQuantity,
    damagedCost,
    scratchesCount,
    loading
  }
}
