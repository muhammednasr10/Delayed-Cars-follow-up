import { useCallback, useEffect, useState } from 'react'
import { ProductionPlanOrdersTab } from '../../Components/production/ProductionPlanOrdersTab'
import { availableDaysFromRows, buildMonthWorkDayRows } from '../../Utils/productionPlanWorkDayDaily'
import { getProductionPlanWorkDaysMonth } from '../../services/productionPlanWorkDayDailyService'

function currentYm(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function ProductionOrdersPage() {
  const [availableDays, setAvailableDays] = useState(0)

  const loadAvailableDays = useCallback(async () => {
    const { year, month } = currentYm()
    try {
      const saved = await getProductionPlanWorkDaysMonth(year, month)
      const rows = buildMonthWorkDayRows(year, month, saved)
      setAvailableDays(availableDaysFromRows(rows))
    } catch {
      setAvailableDays(0)
    }
  }, [])

  useEffect(() => {
    void loadAvailableDays()
  }, [loadAvailableDays])

  return <ProductionPlanOrdersTab availableDays={availableDays} />
}
