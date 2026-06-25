import { useEffect, useState } from 'react'
import { Scale } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { usePermissions } from '../Context/PermissionsContext'
import { useStationOperations } from '../hooks/useStationOperations'
import { getVehicleModels } from '../services/settingsService'
import { StationOperationsTab } from '../Components/training/StationOperationsTab'
import { ImportTimeStudyTab } from '../Components/training/ImportTimeStudyTab'
import { OperationPartsTab } from '../Components/lineBalancing/OperationPartsTab'
import { TimeStudyTab } from '../Components/lineBalancing/TimeStudyTab'
import { ModelRoutingTab } from '../Components/lineBalancing/ModelRoutingTab'
import { ManpowerAllocationTab } from '../Components/lineBalancing/ManpowerAllocationTab'
import type { VehicleModel } from '../Types/settings'

type Tab = 'operations' | 'opParts' | 'timeStudy' | 'routing' | 'manpower' | 'import'

const TABS: Tab[] = ['operations', 'opParts', 'timeStudy', 'routing', 'manpower', 'import']

export function LineBalancingPage() {
  const { t } = useLang()
  const { hasPermission } = usePermissions()
  const canManage =
    hasPermission('station_operations', 'manage') ||
    hasPermission('station_operations', 'update') ||
    hasPermission('station_operations', 'create')
  const canImport = canManage || hasPermission('station_operations', 'import')

  const [tab, setTab] = useState<Tab>('operations')
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
    <section className="space-y-5">
      <div className="card-industrial p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">{t('lineBalancing.title')}</h2>
            <p className="text-sm text-slate-400">{t('lineBalancing.subtitle')}</p>
          </div>
        </div>
        {!canManage && tab === 'operations' && (
          <p className="mt-3 text-xs text-amber-300">{t('training.noPerm')}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {TABS.map(k => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`rounded-xl px-4 py-2 text-sm font-black ${
                tab === k ? 'bg-violet-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {t(`lineBalancing.tabs.${k}`)}
            </button>
          ))}
        </div>
      </div>

      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>
      )}
      {errorMsg && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{errorMsg}</div>
      )}

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
      {tab === 'import' && (
        <ImportTimeStudyTab canManage={canImport} onImported={() => void reload()} notify={notify} />
      )}
    </section>
  )
}
