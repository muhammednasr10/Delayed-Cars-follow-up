import { useEffect, useMemo, useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { useNavigation } from '../../Context/NavigationContext'
import { useLang } from '../../i18n/LanguageContext'
import { useAuth } from '../../Context/AuthContext'
import { usePermissions } from '../../Context/PermissionsContext'
import { useEmployees } from '../../hooks/useEmployees'
import { useEmployeeTrainingRecords, useStationRequiredSkills, useTrainingSkills } from '../../hooks/useTraining'
import { useEmployeeStationLevels } from '../../hooks/useEmployeeStationLevels'
import { getFactoryOrgUnits } from '../../services/factoryOrgService'
import { getStations, getVehicleModels } from '../../services/settingsService'
import { useAssemblyWorkforceScope } from '../../hooks/useAssemblyWorkforceScope'
import { filterAssemblyWorkforce, isAssemblyWorkforceFilterMissing } from '../../Utils/assemblyWorkforce'
import { OrgStructurePage } from '../shared/OrgStructurePage'
import { PageTabShell } from '../../Components/layout/PageTabShell'
import { WorkforceAttendanceSection } from '../../Components/WorkforceAttendanceSection'
import { WorkforceManpowerSection } from '../../Components/WorkforceManpowerSection'
import { StationTrainingMatrixTab } from '../../Components/training/StationTrainingMatrixTab'
import { EmployeeTrainingMatrixTab } from '../../Components/training/EmployeeTrainingMatrixTab'
import { StationQualificationTab } from '../../Components/training/StationQualificationTab'
import { TrainingExpiryDashboard } from '../../Components/training/TrainingExpiryDashboard'
import { OperationQualificationTab } from '../../Components/training/OperationQualificationTab'
import type { Station, VehicleModel } from '../../Types/settings'
import type { FactoryOrgUnit } from '../../Types/factoryOrg'

type Tab = 'org' | 'attendance' | 'manpower' | 'operations' | 'stationSkills' | 'matrix' | 'qualification' | 'expiry'
const TABS: Tab[] = ['org', 'attendance', 'manpower', 'operations', 'stationSkills', 'matrix', 'qualification', 'expiry']

export function TrainingMatrixPage() {
  const { t } = useLang()
  const { hasRole } = useAuth()
  const { hasPermission } = usePermissions()
  const canManage =
    hasPermission('training_matrix', 'manage') ||
    hasPermission('training_matrix', 'update') ||
    hasPermission('training_matrix', 'create')
  const canManageEmployees =
    hasRole('admin') ||
    hasPermission('employees', 'create') ||
    hasPermission('employees', 'update') ||
    hasPermission('employees', 'delete')

  const { employees: allEmployees } = useEmployees()
  const [orgUnits, setOrgUnits] = useState<FactoryOrgUnit[]>([])
  const assemblyEmployees = useMemo(() => filterAssemblyWorkforce(allEmployees, orgUnits), [allEmployees, orgUnits])
  const { scopedEmployees: employees, isScopedView, scopeLabel } = useAssemblyWorkforceScope(assemblyEmployees)
  const assemblyFilterMissing = useMemo(() => isAssemblyWorkforceFilterMissing(orgUnits), [orgUnits])
  const assemblyWorkforceEmpty = orgUnits.length > 0 && employees.length === 0 && allEmployees.some(e => e.isActive)
  const { skills } = useTrainingSkills()
  const { required } = useStationRequiredSkills()
  const { records, reload: reloadRecords } = useEmployeeTrainingRecords()
  const { levels: stationLevels, reload: reloadStationLevels } = useEmployeeStationLevels()
  const [stations, setStations] = useState<Station[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])
  const { trainingTab: tab, setTrainingTab: setTab } = useNavigation()
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getStations().then(setStations).catch(() => setStations([]))
    getVehicleModels().then(setModels).catch(() => setModels([]))
    getFactoryOrgUnits({ includeInactive: true }).then(setOrgUnits).catch(() => setOrgUnits([]))
  }, [])

  function notify(msg: string, isError = false) {
    if (isError) {
      setError(msg)
      setSuccess('')
    } else {
      setSuccess(msg)
      setError('')
      window.setTimeout(() => setSuccess(''), 2500)
    }
  }

  const feedback = (
    <>
      {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>}
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
    </>
  )

  return (
    <PageTabShell
      title={t('training.title')}
      subtitle={t('training.subtitle')}
      icon={<GraduationCap className="h-6 w-6" />}
      tabs={TABS.map(k => ({ key: k, label: t(`training.tabs.${k}`) }))}
      activeTab={tab}
      onTabChange={setTab}
      message={
        <>
          {!canManage && <p className="text-xs text-amber-300">{t('training.noPerm')}</p>}
          {feedback}
        </>
      }
    >
      {tab === 'org' && <OrgStructurePage embedded workforceScope="assembly" />}
      {isScopedView && tab !== 'org' && (
        <div className="mb-4 rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-3 text-sm text-cyan-100">
          {scopeLabel ? t('org.scopeBanner', { scope: scopeLabel }) : t('org.assemblySupervisorScopeHint')}
        </div>
      )}
      {tab === 'attendance' && (
        <>
          {assemblyFilterMissing && (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              {t('attendance.assemblyFilterMissing')}
            </div>
          )}
          {assemblyWorkforceEmpty && (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              {t('attendance.assemblyFilterEmpty')}
            </div>
          )}
          <WorkforceAttendanceSection employees={employees} canManage={canManageEmployees} />
        </>
      )}
      {tab === 'manpower' && (
        <WorkforceManpowerSection stations={stations} employees={employees} models={models} canManage={canManageEmployees} />
      )}
      {tab === 'operations' && <OperationQualificationTab stations={stations} />}
      {tab === 'stationSkills' && (
        <StationTrainingMatrixTab
          employees={employees}
          stations={stations}
          levels={stationLevels}
          canManage={canManage}
          onChanged={reloadStationLevels}
          notify={notify}
        />
      )}
      {tab === 'matrix' && (
        <EmployeeTrainingMatrixTab employees={employees} skills={skills} records={records} canManage={canManage} onChanged={reloadRecords} notify={notify} />
      )}
      {tab === 'qualification' && <StationQualificationTab employees={employees} required={required} records={records} stations={stations} />}
      {tab === 'expiry' && <TrainingExpiryDashboard employees={employees} records={records} />}
    </PageTabShell>
  )
}
