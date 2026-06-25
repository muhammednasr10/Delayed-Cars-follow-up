import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Boxes, Car, ListChecks, MapPin, Palette, RefreshCcw, Settings, Users, Building2 } from 'lucide-react'
import { useCanAccessSettings } from '../../hooks/useCanAccessSettings'
import { useNavigation } from '../../Context/NavigationContext'
import { getAllVehicleColors, getVehicleModels, getWorkAreas } from '../../services/settingsService'
import type { VehicleColor, VehicleModel, WorkArea } from '../../Types/settings'
import { UsersPermissionsPanel } from '../../Components/permissions/UsersPermissionsPanel'
import { getMpDepartmentOptions, getMpReasonOptions } from '../../services/mpLookupService'
import type { MpLookupOption } from '../../Types/mpLookup'
import { supabase } from '../../lib/supabase'
import { ModelsHierarchySection } from '../../Components/ModelsHierarchySection'
import { StationsSection, type StationsSectionHandle } from '../../Components/StationsSection'
import {
  SettingsAreasTab,
  SettingsColorsTab,
  SettingsDepartmentsTab,
  SettingsReasonsTab
} from '../../Components/settings/SettingsLookupTabs'
import { PageTabShell } from '../../Components/layout/PageTabShell'
import { useLang } from '../../i18n/LanguageContext'

type TabKey = 'models' | 'stations' | 'colors' | 'areas' | 'reasons' | 'departments' | 'users'

const tabConfig: { key: TabKey; icon: ReactNode }[] = [
  { key: 'models', icon: <Car className="h-4 w-4" /> },
  { key: 'stations', icon: <MapPin className="h-4 w-4" /> },
  { key: 'colors', icon: <Palette className="h-4 w-4" /> },
  { key: 'areas', icon: <Boxes className="h-4 w-4" /> },
  { key: 'reasons', icon: <ListChecks className="h-4 w-4" /> },
  { key: 'departments', icon: <Building2 className="h-4 w-4" /> },
  { key: 'users', icon: <Users className="h-4 w-4" /> }
]

const crudTabs: TabKey[] = ['models', 'stations', 'areas', 'colors', 'reasons', 'departments']

export function SettingsPage() {
  const { t } = useLang()
  const { canAccess: canAccessSettings } = useCanAccessSettings()
  const stationsRef = useRef<StationsSectionHandle>(null)
  const { settingsTab: activeTab, setSettingsTab: setActiveTab } = useNavigation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [models, setModels] = useState<VehicleModel[]>([])
  const [areas, setAreas] = useState<WorkArea[]>([])
  const [colors, setColors] = useState<VehicleColor[]>([])
  const [reasonOptions, setReasonOptions] = useState<MpLookupOption[]>([])
  const [departmentOptions, setDepartmentOptions] = useState<MpLookupOption[]>([])

  async function loadAll() {
    if (!supabase) {
      setError('Supabase .env')
      return
    }
    setLoading(true)
    setError('')
    try {
      const [modelsData, areasData, colorsData, reasonsData, departmentsData] = await Promise.all([
        getVehicleModels(),
        getWorkAreas(),
        getAllVehicleColors(),
        getMpReasonOptions(false),
        getMpDepartmentOptions(false)
      ])
      setModels(modelsData)
      setAreas(areasData)
      setColors(colorsData)
      setReasonOptions(reasonsData)
      setDepartmentOptions(departmentsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  function showSuccess(message: string) {
    setSuccess(message)
    setError('')
    window.setTimeout(() => setSuccess(''), 2500)
  }

  async function runAction(action: () => Promise<void>, successMessage: string): Promise<boolean> {
    setLoading(true)
    setError('')
    try {
      await action()
      await loadAll()
      showSuccess(successMessage)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
      return false
    } finally {
      setLoading(false)
    }
  }

  function refreshActiveTab() {
    if (activeTab === 'stations') void stationsRef.current?.reload()
    else void loadAll()
  }

  if (!canAccessSettings) {
    return (
      <section className="card-industrial p-8 text-center">
        <p className="text-lg font-black text-white">{t('settings.adminOnlyTitle')}</p>
        <p className="mt-2 text-sm text-slate-400">{t('settings.adminOnly')}</p>
      </section>
    )
  }

  const feedback =
    crudTabs.includes(activeTab) && (error || success) ? (
      <>
        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
        {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>}
      </>
    ) : null

  return (
    <PageTabShell
      title={t('settings.title')}
      subtitle={t('settings.subtitle')}
      icon={<Settings className="h-6 w-6" />}
      tabs={tabConfig.map(tab => ({ key: tab.key, label: t(`settings.tabs.${tab.key}`), icon: tab.icon }))}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerExtra={
        crudTabs.includes(activeTab) ? (
          <button type="button" onClick={refreshActiveTab} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-100 hover:bg-slate-700">
            <RefreshCcw className="mr-1 inline h-4 w-4" /> {t('common.refresh')}
          </button>
        ) : undefined
      }
      message={feedback}
    >
      {activeTab === 'models' && (
        <ModelsHierarchySection models={models} busy={loading} onChanged={loadAll} onError={setError} onSuccess={showSuccess} />
      )}
      {activeTab === 'stations' && (
        <StationsSection ref={stationsRef} canManage sectionTitle={t('settings.tabs.stations')} onError={setError} onSuccess={showSuccess} />
      )}
      {activeTab === 'areas' && <SettingsAreasTab areas={areas} busy={loading} runAction={runAction} />}
      {activeTab === 'colors' && <SettingsColorsTab colors={colors} busy={loading} runAction={runAction} />}
      {activeTab === 'reasons' && <SettingsReasonsTab reasonOptions={reasonOptions} busy={loading} runAction={runAction} />}
      {activeTab === 'departments' && <SettingsDepartmentsTab departmentOptions={departmentOptions} busy={loading} runAction={runAction} />}
      {activeTab === 'users' && (
        <UsersPermissionsPanel
          notify={(m, err) => {
            if (err) {
              setError(m)
              return
            }
            showSuccess(m)
          }}
        />
      )}
    </PageTabShell>
  )
}
