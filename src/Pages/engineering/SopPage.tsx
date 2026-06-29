import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { usePermissions } from '../../Context/PermissionsContext'
import { useStationOperations } from '../../hooks/useStationOperations'
import { getVehicleModels } from '../../services/settingsService'
import { PageTabShell } from '../../Components/layout/PageTabShell'
import { SopHierarchyTab } from '../../Components/engineering/SopHierarchyTab'
import type { VehicleModel } from '../../Types/settings'

const TAB = 'instructions' as const

export function SopPage() {
  const { t } = useLang()
  const { hasPermission } = usePermissions()
  const canManage =
    hasPermission('station_operations', 'manage') ||
    hasPermission('station_operations', 'update') ||
    hasPermission('station_operations', 'create')

  const [models, setModels] = useState<VehicleModel[]>([])
  const { parentGroups, loading, error } = useStationOperations()
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
    <PageTabShell
      title={t('sop.title')}
      subtitle={t('sop.subtitle')}
      icon={<BookOpen className="h-6 w-6" />}
      tabs={[{ key: TAB, label: t('sop.title') }]}
      activeTab={TAB}
      onTabChange={() => {}}
      activeClassName="bg-fuchsia-500 text-slate-950"
      message={
        <>
          {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>}
          {errorMsg && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{errorMsg}</div>}
        </>
      }
    >
      <SopHierarchyTab
        parentGroups={parentGroups}
        models={models}
        loading={loading}
        loadError={error}
        canManage={canManage}
        notify={notify}
      />
    </PageTabShell>
  )
}
