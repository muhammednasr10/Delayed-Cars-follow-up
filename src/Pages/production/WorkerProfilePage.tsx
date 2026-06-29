import { UserCircle } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useNavigation } from '../../Context/NavigationContext'
import { PageTabShell } from '../../Components/layout/PageTabShell'
import { WorkerProfileDataTab } from '../../Components/workerProfile/WorkerProfileDataTab'
import { WorkerProfileStationTab } from '../../Components/workerProfile/WorkerProfileStationTab'
import { WorkerProfileEquipmentTab } from '../../Components/workerProfile/WorkerProfileEquipmentTab'
import { WorkerProfileAttendanceTab } from '../../Components/workerProfile/WorkerProfileAttendanceTab'
import { WorkerProfileErrorsTab } from '../../Components/workerProfile/WorkerProfileErrorsTab'
import { WORKER_PROFILE_TAB_ORDER, type WorkerProfileTab } from '../../Types/navigation'

export function WorkerProfilePage() {
  const { t } = useLang()
  const { workerProfileTab: tab, setWorkerProfileTab: setTab } = useNavigation()

  const tabs = WORKER_PROFILE_TAB_ORDER.map(key => ({
    key,
    label: t(`workerProfile.tabs.${key}`)
  }))

  return (
    <PageTabShell
      title={t('workerProfile.title')}
      subtitle={t('workerProfile.subtitle')}
      icon={<UserCircle className="h-6 w-6" />}
      tabs={tabs}
      activeTab={tab}
      onTabChange={(k: WorkerProfileTab) => setTab(k)}
      activeClassName="bg-fuchsia-500 text-slate-950"
    >
      {tab === 'data' && <WorkerProfileDataTab />}
      {tab === 'station' && <WorkerProfileStationTab />}
      {tab === 'equipment' && <WorkerProfileEquipmentTab />}
      {tab === 'attendance' && <WorkerProfileAttendanceTab />}
      {tab === 'errors' && <WorkerProfileErrorsTab />}
    </PageTabShell>
  )
}
