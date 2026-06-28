import { useEffect, useRef, useState } from 'react'
import { RefreshCcw, Settings } from 'lucide-react'
import { useCanAccessSettings } from '../../hooks/useCanAccessSettings'
import { useNavigation } from '../../Context/NavigationContext'
import { getAllVehicleColors, getVehicleModels } from '../../services/settingsService'
import { getFactoryOrgUnits } from '../../services/factoryOrgService'
import type { FactoryOrgUnit } from '../../Types/factoryOrg'
import type { VehicleColor, VehicleModel } from '../../Types/settings'
import { SETTINGS_TAB_ORDER, type SettingsTab } from '../../Types/navigation'
import { UsersPermissionsPanel } from '../../Components/permissions/UsersPermissionsPanel'
import { supabase } from '../../lib/supabase'
import { ModelsHierarchySection } from '../../Components/ModelsHierarchySection'
import { FactoryOrgHierarchySection } from '../../Components/FactoryOrgHierarchySection'
import { StationsSection, type StationsSectionHandle } from '../../Components/StationsSection'
import { SettingsColorsTab } from '../../Components/settings/SettingsLookupTabs'
import { useLang } from '../../i18n/LanguageContext'

const crudTabs: SettingsTab[] = ['administrations', 'models', 'stations', 'colors']

export function SettingsPage() {
  const { t } = useLang()
  const { canAccess: canAccessSettings } = useCanAccessSettings()
  const stationsRef = useRef<StationsSectionHandle>(null)
  const { settingsTab: activeTab, setSettingsTab } = useNavigation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [models, setModels] = useState<VehicleModel[]>([])
  const [orgUnits, setOrgUnits] = useState<FactoryOrgUnit[]>([])
  const [colors, setColors] = useState<VehicleColor[]>([])

  useEffect(() => {
    if (!SETTINGS_TAB_ORDER.includes(activeTab)) {
      setSettingsTab('administrations')
    }
  }, [activeTab, setSettingsTab])

  async function loadAll() {
    if (!supabase) {
      setError('Supabase .env')
      return
    }
    setLoading(true)
    setError('')
    try {
      const [modelsData, orgUnitsData, colorsData] = await Promise.all([
        getVehicleModels(),
        getFactoryOrgUnits({ includeInactive: true }),
        getAllVehicleColors()
      ])
      setModels(modelsData)
      setOrgUnits(orgUnitsData)
      setColors(colorsData)
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
    <section className="space-y-4">
      <div className="card-industrial p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-500/15 p-3 text-cyan-300">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">{t('settings.title')}</h2>
              <p className="text-sm text-slate-400">
                {t(`settings.tabs.${activeTab}`)} — {t('settings.subtitle')}
              </p>
            </div>
          </div>
          {crudTabs.includes(activeTab) && (
            <button
              type="button"
              onClick={refreshActiveTab}
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-100 hover:bg-slate-700"
            >
              <RefreshCcw className="mr-1 inline h-4 w-4" /> {t('common.refresh')}
            </button>
          )}
        </div>
      </div>

      {feedback}
      {activeTab === 'administrations' && (
        <FactoryOrgHierarchySection
          units={orgUnits}
          busy={loading}
          onChanged={loadAll}
          onError={setError}
          onSuccess={showSuccess}
        />
      )}
      {activeTab === 'models' && (
        <ModelsHierarchySection models={models} busy={loading} onChanged={loadAll} onError={setError} onSuccess={showSuccess} />
      )}
      {activeTab === 'stations' && (
        <StationsSection ref={stationsRef} canManage sectionTitle={t('settings.tabs.stations')} onError={setError} onSuccess={showSuccess} />
      )}
      {activeTab === 'colors' && <SettingsColorsTab colors={colors} busy={loading} runAction={runAction} />}
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
    </section>
  )
}
