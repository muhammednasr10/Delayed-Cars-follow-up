import { useEffect, useState } from 'react'
import { Home, Package, Truck, Warehouse } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useAuth } from '../../Context/AuthContext'
import { usePermissions } from '../../Context/PermissionsContext'
import { useNavigation } from '../../Context/NavigationContext'
import { WarehouseCurrentStockTab } from '../../Components/warehouse/WarehouseCurrentStockTab'
import { WarehouseFeedingTab } from '../../Components/warehouse/WarehouseFeedingTab'
import { isWarehouseSchemaMissing, WarehouseDbSetupBanner } from '../../Components/warehouse/WarehouseDbSetupBanner'
import { WarehousesHomePage } from './WarehousesHomePage'
import { getWarehouses, getWarehouseFeedingPlans } from '../../services/warehouseService'
import { getStations, getVehicleModels } from '../../services/settingsService'
import type { Warehouse as WarehouseType } from '../../Types/warehouse'
import type { Station, VehicleModel } from '../../Types/settings'
import type { WarehousesTab } from '../../Types/navigation'

export function WarehousesPage() {
  const { t } = useLang()
  const { hasRole } = useAuth()
  const { hasPermission } = usePermissions()
  const { warehousesTab: tab, setWarehousesTab: setTab } = useNavigation()

  const canManage =
    hasRole('admin', 'warehouse') ||
    hasPermission('inventory', 'manage') ||
    hasPermission('inventory', 'update') ||
    hasPermission('inventory', 'create')

  const [warehouses, setWarehouses] = useState<WarehouseType[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [setupRequired, setSetupRequired] = useState(false)

  useEffect(() => {
    getWarehouses().then(setWarehouses).catch(() => setWarehouses([]))
    getVehicleModels().then(setModels).catch(() => setModels([]))
    getStations().then(setStations).catch(() => setStations([]))
    getWarehouseFeedingPlans(1)
      .then(() => setSetupRequired(false))
      .catch(e => {
        const msg = e instanceof Error ? e.message : ''
        if (isWarehouseSchemaMissing(msg)) {
          setSetupRequired(true)
          setError(msg)
        }
      })
  }, [])

  function notify(msg: string, isError = false) {
    if (isError) {
      setError(msg)
      setSuccess('')
      if (isWarehouseSchemaMissing(msg)) setSetupRequired(true)
    } else {
      setSuccess(msg)
      setError('')
      window.setTimeout(() => setSuccess(''), 2500)
    }
  }

  const tabs: { key: WarehousesTab; label: string; icon: typeof Home }[] = [
    { key: 'home', label: t('nav.home'), icon: Home },
    { key: 'currentStock', label: t('warehouses.tabs.currentStock'), icon: Package },
    { key: 'feeding', label: t('warehouses.tabs.feeding'), icon: Truck }
  ]

  return (
    <section className="space-y-4">
      {tab !== 'home' && (
        <div className="card-industrial p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/15 p-3 text-amber-300">
              <Warehouse className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">{t('warehouses.title')}</h2>
              <p className="text-sm text-slate-400">{t('warehouses.subtitle')}</p>
            </div>
          </div>
          {!canManage && <p className="mt-3 text-xs text-amber-300">{t('warehouses.readOnly')}</p>}
          <nav className="mt-4 flex flex-wrap gap-2">
            {tabs.map(item => {
              const Icon = item.icon
              const active = tab === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-black ${
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
      )}

      {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>}
      {setupRequired ? (
        <WarehouseDbSetupBanner detail={error} />
      ) : (
        error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
      )}

      {!setupRequired && tab === 'home' && <WarehousesHomePage />}
      {!setupRequired && tab === 'currentStock' && <WarehouseCurrentStockTab warehouses={warehouses} models={models} />}
      {!setupRequired && tab === 'feeding' && (
        <WarehouseFeedingTab warehouses={warehouses} models={models} stations={stations} canManage={canManage} notify={notify} />
      )}
    </section>
  )
}
