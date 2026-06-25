import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, ClipboardList } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { ProductionPlanOrdersTab } from './ProductionPlanOrdersTab'
import { ProductionPlanWorkDaysTab } from '../Components/ProductionPlanWorkDaysTab'
import { availableDaysFromRows, buildMonthWorkDayRows } from '../Utils/productionPlanWorkDayDaily'
import { getProductionPlanWorkDaysMonth } from '../services/productionPlanWorkDayDailyService'

type PlanTab = 'planOrders' | 'workDays'

function currentYm(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function ProductionOrdersPage() {
  const { t } = useLang()
  const [tab, setTab] = useState<PlanTab>('planOrders')
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

  const tabs: { key: PlanTab; label: string; icon: typeof ClipboardList }[] = [
    { key: 'planOrders', label: t('productionOrders.tabs.planOrders'), icon: ClipboardList },
    { key: 'workDays', label: t('productionOrders.tabs.workDays'), icon: CalendarDays }
  ]

  return (
    <section className="space-y-4">
      <div className="card-industrial p-3 sm:p-4">
        <nav className="flex flex-wrap gap-2">
          {tabs.map(item => {
            const Icon = item.icon
            const active = tab === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-black sm:px-4 ${
                  active ? 'bg-violet-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>

      {tab === 'planOrders' && <ProductionPlanOrdersTab availableDays={availableDays} />}
      {tab === 'workDays' && (
        <ProductionPlanWorkDaysTab
          onAvailableDaysChange={count => {
            setAvailableDays(count)
          }}
        />
      )}
    </section>
  )
}
