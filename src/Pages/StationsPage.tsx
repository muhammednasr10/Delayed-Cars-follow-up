import { useRef } from 'react'
import { MapPin, RefreshCcw } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { usePermissions } from '../Context/PermissionsContext'
import { useCanAccessSettings } from '../hooks/useCanAccessSettings'
import { StationsSection, type StationsSectionHandle } from '../Components/StationsSection'

export function StationsPage() {
  const { t } = useLang()
  const stationsRef = useRef<StationsSectionHandle>(null)
  const { canAccess: canAccessSettings } = useCanAccessSettings()
  const { hasPermission } = usePermissions()
  const canManage =
    canAccessSettings ||
    hasPermission('station_operations', 'manage') ||
    hasPermission('station_operations', 'update') ||
    hasPermission('station_operations', 'create')

  return (
    <section className="space-y-5">
      <div className="card-industrial p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-500/15 p-3 text-orange-300">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">{t('engineering.stations.title')}</h2>
              <p className="text-sm text-slate-400">{t('engineering.stations.subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void stationsRef.current?.reload()}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-100 hover:bg-slate-700"
          >
            <RefreshCcw className="mr-1 inline h-4 w-4" /> {t('common.refresh')}
          </button>
        </div>
        {!canManage && <p className="mt-3 text-xs text-amber-300">{t('training.noPerm')}</p>}
      </div>

      <StationsSection ref={stationsRef} canManage={canManage} readOnly />
    </section>
  )
}
