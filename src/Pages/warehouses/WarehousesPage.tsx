import { useEffect, useState } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { useAuth } from '../../Context/AuthContext'
import { usePermissions } from '../../Context/PermissionsContext'
import { useNavigation } from '../../Context/NavigationContext'
import { WarehouseCurrentStockTab } from '../../Components/warehouse/WarehouseCurrentStockTab'
import { WarehouseFeedingTab } from '../../Components/warehouse/WarehouseFeedingTab'
import { WarehouseEquipmentTab } from '../../Components/warehouse/equipment/WarehouseEquipmentTab'
import { isWarehouseSchemaMissing, WarehouseDbSetupBanner } from '../../Components/warehouse/WarehouseDbSetupBanner'
import { WarehousesHomePage } from './WarehousesHomePage'
import { getWarehouses, getWarehouseFeedingPlans } from '../../services/warehouseService'
import { getStations, getVehicleModels } from '../../services/settingsService'
import type { Warehouse as WarehouseType } from '../../Types/warehouse'
import type { Station, VehicleModel } from '../../Types/settings'

export function WarehousesPage() {
  const { t } = useLang()
  const { hasRole } = useAuth()
  const { hasPermission } = usePermissions()
  const { warehousesTab: tab } = useNavigation()

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

  return (
    <section className="space-y-4">
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
      {!setupRequired && tab === 'equipment' && (
        <WarehouseEquipmentTab warehouses={warehouses} stations={stations} canManage={canManage} notify={notify} />
      )}
    </section>
  )
}
