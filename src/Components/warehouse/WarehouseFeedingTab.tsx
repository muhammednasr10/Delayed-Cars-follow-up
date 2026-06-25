import { useEffect } from 'react'
import { CalendarDays, Truck } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useNavigation } from '../../Context/NavigationContext'
import { WarehouseFeedingActualTab } from './WarehouseFeedingActualTab'
import { WarehouseFeedingPlanTab } from './WarehouseFeedingPlanTab'
import type { Warehouse } from '../../Types/warehouse'
import type { Station, VehicleModel } from '../../Types/settings'
import type { WarehousesFeedingSubTab } from '../../Types/navigation'

type Props = {
  warehouses: Warehouse[]
  models: VehicleModel[]
  stations: Station[]
  canManage: boolean
  notify: (msg: string, isError?: boolean) => void
  initialSubTab?: WarehousesFeedingSubTab
}

export function WarehouseFeedingTab({ warehouses, models, stations, canManage, notify, initialSubTab }: Props) {
  const { t } = useLang()
  const nav = useNavigation()
  const subTab = nav.warehousesFeedingSubTab

  useEffect(() => {
    if (initialSubTab) nav.setWarehousesFeedingSubTab(initialSubTab)
  }, [initialSubTab, nav])

  const subTabs: { key: WarehousesFeedingSubTab; label: string; icon: typeof CalendarDays }[] = [
    { key: 'plan', label: t('warehouses.feeding.subTabs.plan'), icon: CalendarDays },
    { key: 'actual', label: t('warehouses.feeding.subTabs.actual'), icon: Truck }
  ]

  return (
    <div className="space-y-4">
      <div className="card-industrial p-3">
        <nav className="flex flex-wrap gap-2">
          {subTabs.map(item => {
            const Icon = item.icon
            const active = subTab === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => nav.setWarehousesFeedingSubTab(item.key)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-black sm:px-4 ${
                  active ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>

      {subTab === 'plan' && (
        <WarehouseFeedingPlanTab
          warehouses={warehouses}
          models={models}
          stations={stations}
          canManage={canManage}
          notify={notify}
        />
      )}
      {subTab === 'actual' && (
        <WarehouseFeedingActualTab
          warehouses={warehouses}
          models={models}
          stations={stations}
          canManage={canManage}
          notify={notify}
        />
      )}
    </div>
  )
}
