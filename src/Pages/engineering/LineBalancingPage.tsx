import { useEffect, useState } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { useNavigation } from '../../Context/NavigationContext'
import { usePermissions } from '../../Context/PermissionsContext'
import { useStationOperations } from '../../hooks/useStationOperations'
import { getVehicleModels } from '../../services/settingsService'
import { StationOperationsTab } from '../../Components/training/StationOperationsTab'
import { ImportTimeStudyTab } from '../../Components/training/ImportTimeStudyTab'
import { OperationPartsTab } from '../../Components/lineBalancing/OperationPartsTab'
import { TimeStudyTab } from '../../Components/lineBalancing/TimeStudyTab'
import { ModelRoutingTab } from '../../Components/lineBalancing/ModelRoutingTab'
import { ManpowerAllocationTab } from '../../Components/lineBalancing/ManpowerAllocationTab'
import type { VehicleModel } from '../../Types/settings'

export function LineBalancingPage() {
  const { t } = useLang()
  const { hasPermission } = usePermissions()
  const canManage =
    hasPermission('station_operations', 'manage') ||
    hasPermission('station_operations', 'update') ||
    hasPermission('station_operations', 'create')
  const canImport = canManage || hasPermission('station_operations', 'import')
  const { lineBalancingTab: tab } = useNavigation()

  const [models, setModels] = useState<VehicleModel[]>([])
  const { parentGroups, loading, error, reload } = useStationOperations()
  const [success, setSuccess] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    getVehicleModels().then(setModels).catch(() => setModels([]))
  }, [])

  function notify(msg: string, isError = false) {
    if (isError) {
      setErrorMsg(msg)
      setSuccess('')
    } else {
      setSuccess(msg)
      setErrorMsg('')
      window.setTimeout(() => setSuccess(''), 2500)
    }
  }

  return (
    <section className="space-y-4">
      {!canManage && tab === 'operations' && <p className="text-xs text-amber-300">{t('training.noPerm')}</p>}
      {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>}
      {errorMsg && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{errorMsg}</div>}

      {tab === 'operations' && (
        <StationOperationsTab
          parentGroups={parentGroups}
          models={models}
          loading={loading}
          loadError={error}
          canManage={canManage}
          onReload={reload}
          notify={notify}
        />
      )}
      {tab === 'opParts' && <OperationPartsTab canManage={canManage} notify={notify} />}
      {tab === 'timeStudy' && <TimeStudyTab models={models} canManage={canManage} notify={notify} />}
      {tab === 'routing' && <ModelRoutingTab models={models} canManage={canManage} notify={notify} />}
      {tab === 'manpower' && <ManpowerAllocationTab models={models} canManage={canManage} notify={notify} />}
      {tab === 'import' && <ImportTimeStudyTab canManage={canImport} onImported={() => void reload()} notify={notify} />}
    </section>
  )
}
