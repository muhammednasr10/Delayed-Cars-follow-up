import { useState } from 'react'
import { Settings2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useNavigation } from '../../Context/NavigationContext'
import { WarehouseFeedingActualTab } from './WarehouseFeedingActualTab'
import { WarehouseFeedingPlanTab } from './WarehouseFeedingPlanTab'
import { WarehouseKanbanTab } from './WarehouseKanbanTab'
import { FeedingSettingsModal } from './FeedingSettingsModal'
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

export function WarehouseFeedingTab({ warehouses, models, stations, canManage, notify }: Props) {
  const { t } = useLang()
  const nav = useNavigation()
  const subTab = nav.warehousesFeedingSubTab
  const [settingsOpen, setSettingsOpen] = useState(false)

  if (!canManage && subTab === 'kanban') {
    return (
      <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
        {t('warehouses.readOnly')}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-200 hover:bg-cyan-500/20"
          >
            <Settings2 className="h-4 w-4" />
            {t('warehouses.feeding.subTabs.settings')}
          </button>
        </div>
      )}

      <FeedingSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} notify={notify} />

      {subTab === 'plan' && (
        <WarehouseFeedingPlanTab
          warehouses={warehouses}
          models={models}
          stations={stations}
          canManage={canManage}
          notify={notify}
        />
      )}
      {subTab === 'kanban' && <WarehouseKanbanTab notify={notify} />}
      {subTab === 'actual' && (
        <WarehouseFeedingActualTab
          warehouses={warehouses}
          stations={stations}
          canManage={canManage}
          notify={notify}
        />
      )}
    </div>
  )
}
