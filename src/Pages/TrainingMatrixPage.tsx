import { useEffect, useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../Context/AuthContext'
import { useEmployees } from '../hooks/useEmployees'
import { useEmployeeTrainingRecords, useStationRequiredSkills, useTrainingSkills } from '../hooks/useTraining'
import { useStationOperations } from '../hooks/useStationOperations'
import { getStations, getVehicleModels, getWorkAreas } from '../services/settingsService'
import { StationOperationsTab } from '../Components/training/StationOperationsTab'
import { StationRequiredSkillsTab } from '../Components/training/StationRequiredSkillsTab'
import { EmployeeTrainingMatrixTab } from '../Components/training/EmployeeTrainingMatrixTab'
import { StationQualificationTab } from '../Components/training/StationQualificationTab'
import { TrainingExpiryDashboard } from '../Components/training/TrainingExpiryDashboard'
import { ImportTimeStudyTab } from '../Components/training/ImportTimeStudyTab'
import type { Station, VehicleModel, WorkArea } from '../Types/settings'

type Tab = 'operations' | 'stationSkills' | 'matrix' | 'qualification' | 'expiry' | 'import'
const TABS: Tab[] = ['operations', 'stationSkills', 'matrix', 'qualification', 'expiry', 'import']

export function TrainingMatrixPage() {
  const { t } = useLang()
  const { hasRole } = useAuth()
  const canManage = hasRole('admin')

  const { employees } = useEmployees()
  const { skills, reload: reloadSkills } = useTrainingSkills()
  const { required, reload: reloadRequired } = useStationRequiredSkills()
  const { records, reload: reloadRecords } = useEmployeeTrainingRecords()
  const [stations, setStations] = useState<Station[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])
  const [workAreas, setWorkAreas] = useState<WorkArea[]>([])
  const { parentGroups: operationParents, loading: opsLoading, error: opsError, reload: reloadOperations } = useStationOperations()

  const [tab, setTab] = useState<Tab>('operations')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getStations().then(setStations).catch(() => setStations([]))
    getVehicleModels().then(setModels).catch(() => setModels([]))
    getWorkAreas().then(setWorkAreas).catch(() => setWorkAreas([]))
  }, [])

  function notify(msg: string, isError = false) {
    if (isError) { setError(msg); setSuccess('') }
    else { setSuccess(msg); setError(''); window.setTimeout(() => setSuccess(''), 2500) }
  }

  return (
    <section className="space-y-5">
      <div className="card-industrial p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-cyan-500/15 p-3 text-cyan-300"><GraduationCap className="h-6 w-6" /></div>
          <div>
            <h2 className="text-xl font-black text-white">{t('training.title')}</h2>
            <p className="text-sm text-slate-400">{t('training.subtitle')}</p>
          </div>
        </div>
        {!canManage && <p className="mt-3 text-xs text-amber-300">{t('training.noPerm')}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {TABS.map(k => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-xl px-4 py-2 text-sm font-black ${tab === k ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
              {t(`training.tabs.${k}`)}
            </button>
          ))}
        </div>
      </div>

      {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>}
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      {tab === 'operations' && (
        <StationOperationsTab
          parentGroups={operationParents}
          models={models}
          workAreas={workAreas}
          loading={opsLoading}
          loadError={opsError}
          canManage={canManage}
          onReload={reloadOperations}
          notify={notify}
        />
      )}
      {tab === 'stationSkills' && <StationRequiredSkillsTab required={required} stations={stations} skills={skills} canManage={canManage} onChanged={reloadRequired} notify={notify} />}
      {tab === 'matrix' && <EmployeeTrainingMatrixTab employees={employees} skills={skills} records={records} canManage={canManage} onChanged={reloadRecords} notify={notify} />}
      {tab === 'qualification' && <StationQualificationTab employees={employees} required={required} records={records} stations={stations} />}
      {tab === 'expiry' && <TrainingExpiryDashboard employees={employees} records={records} />}
      {tab === 'import' && <ImportTimeStudyTab notify={notify} />}
    </section>
  )
}
