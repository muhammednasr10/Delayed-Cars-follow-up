import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Boxes, Car, ListChecks, MapPin, Palette, RefreshCcw, Settings, Users, Building2 } from 'lucide-react'
import { useCanAccessSettings } from '../hooks/useCanAccessSettings'
import {
  createVehicleColor,
  createWorkArea,
  deleteVehicleColor,
  deleteWorkArea,
  getAllVehicleColors,
  getVehicleModels,
  getWorkAreas,
  updateVehicleColor,
  updateWorkArea
} from '../services/settingsService'
import type { VehicleColor, VehicleModel, WorkArea } from '../Types/settings'
import { UsersPermissionsPanel } from '../Components/permissions/UsersPermissionsPanel'
import {
  createMpDepartmentOption,
  createMpReasonOption,
  deleteMpDepartmentOption,
  deleteMpReasonOption,
  getMpDepartmentOptions,
  getMpReasonOptions,
  updateMpDepartmentOption,
  updateMpReasonOption
} from '../services/mpLookupService'
import type { MpLookupOption } from '../Types/mpLookup'
import { supabase } from '../lib/supabase'
import { CrudSection, type CrudValues } from '../Components/CrudSection'
import { ModelsHierarchySection } from '../Components/ModelsHierarchySection'
import { StationsSection, type StationsSectionHandle } from '../Components/StationsSection'
import { useLang } from '../i18n/LanguageContext'

type TabKey = 'models' | 'stations' | 'colors' | 'areas' | 'reasons' | 'departments' | 'users'
type Values = CrudValues

const tabConfig: { key: TabKey; icon: ReactNode }[] = [
  { key: 'models', icon: <Car className="h-4 w-4" /> },
  { key: 'stations', icon: <MapPin className="h-4 w-4" /> },
  { key: 'colors', icon: <Palette className="h-4 w-4" /> },
  { key: 'areas', icon: <Boxes className="h-4 w-4" /> },
  { key: 'reasons', icon: <ListChecks className="h-4 w-4" /> },
  { key: 'departments', icon: <Building2 className="h-4 w-4" /> },
  { key: 'users', icon: <Users className="h-4 w-4" /> }
]

export function SettingsPage() {
  const { t } = useLang()
  const { canAccess: canAccessSettings } = useCanAccessSettings()
  const stationsRef = useRef<StationsSectionHandle>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('models')
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
    loadAll()
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

  if (!canAccessSettings) {
    return (
      <section className="card-industrial p-8 text-center">
        <p className="text-lg font-black text-white">{t('settings.adminOnlyTitle')}</p>
        <p className="mt-2 text-sm text-slate-400">{t('settings.adminOnly')}</p>
      </section>
    )
  }

  const crudTabs: TabKey[] = ['models', 'stations', 'areas', 'colors', 'reasons', 'departments']

  function refreshActiveTab() {
    if (activeTab === 'stations') void stationsRef.current?.reload()
    else void loadAll()
  }

  return (
    <section className="space-y-5">
      <div className="card-industrial p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-500/15 p-3 text-cyan-300"><Settings className="h-6 w-6" /></div>
            <div>
              <h2 className="text-xl font-black text-white">{t('settings.title')}</h2>
              <p className="text-sm text-slate-400">{t('settings.subtitle')}</p>
            </div>
          </div>
          {crudTabs.includes(activeTab) && (
            <button onClick={refreshActiveTab} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-100 hover:bg-slate-700">
              <RefreshCcw className="mr-1 inline h-4 w-4" /> {t('common.refresh')}
            </button>
          )}
        </div>

        <div className="-mx-1 mt-5 overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2 px-1">
            {tabConfig.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-black ${
                  activeTab === tab.key ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {tab.icon} {t(`settings.tabs.${tab.key}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && crudTabs.includes(activeTab) && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
      )}
      {success && crudTabs.includes(activeTab) && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>
      )}

      {activeTab === 'models' && (
        <ModelsHierarchySection
          models={models}
          busy={loading}
          onChanged={loadAll}
          onError={setError}
          onSuccess={showSuccess}
        />
      )}

      {activeTab === 'stations' && (
        <StationsSection
          ref={stationsRef}
          canManage
          sectionTitle={t('settings.tabs.stations')}
          onError={setError}
          onSuccess={showSuccess}
        />
      )}

      {activeTab === 'areas' && (
        <CrudSection
          title={t('settings.tabs.areas')}
          icon={<Boxes className="h-5 w-5" />}
          items={areas}
          busy={loading}
          getId={a => a.id}
          getLabel={a => a.name}
          fields={[
            { key: 'name', label: t('settings.fields.areaName'), required: true },
            { key: 'description', label: t('settings.fields.description') }
          ]}
          columns={[
            { header: t('settings.cols.name'), render: a => a.name },
            { header: t('settings.cols.description'), render: a => a.description || '-' }
          ]}
          toValues={a => ({ name: a.name, description: a.description || '' })}
          onCreate={v => runAction(async () => { await createWorkArea({ name: v.name, description: v.description }) }, t('settings.added'))}
          onUpdate={(id, v) => runAction(async () => { await updateWorkArea(id, { name: v.name, description: v.description }) }, t('settings.updated'))}
          onDelete={id => runAction(() => deleteWorkArea(id), t('settings.deleted'))}
        />
      )}

      {activeTab === 'colors' && (
        <CrudSection
          title={t('settings.tabs.colors')}
          icon={<Palette className="h-5 w-5" />}
          items={colors}
          busy={loading}
          getId={c => c.id}
          getLabel={c => c.name}
          fields={[
            { key: 'name', label: t('settings.fields.colorName'), required: true },
            { key: 'code', label: t('settings.fields.code'), placeholder: 'blue' },
            { key: 'hex_code', label: t('settings.fields.color'), type: 'color', defaultValue: '#ffffff' }
          ]}
          columns={[
            { header: t('settings.cols.color'), render: c => <span className="inline-block h-5 w-5 rounded-full ring-1 ring-slate-500" style={{ backgroundColor: c.hex_code }} /> },
            { header: t('settings.cols.name'), render: c => c.name },
            { header: t('settings.fields.code'), render: c => <span className="font-mono text-xs text-slate-300">{c.code ?? '—'}</span> },
            { header: t('settings.cols.hex'), render: c => c.hex_code },
            { header: t('settings.cols.active'), render: c => (c.is_active ? t('common.yes') : t('common.no')) }
          ]}
          toValues={c => ({ name: c.name, code: c.code ?? '', hex_code: c.hex_code })}
          onCreate={v =>
            runAction(async () => {
              await createVehicleColor({ name: v.name, code: v.code, hex_code: v.hex_code })
            }, t('settings.added'))
          }
          onUpdate={(id, v) =>
            runAction(async () => {
              await updateVehicleColor(id, { name: v.name, code: v.code, hex_code: v.hex_code })
            }, t('settings.updated'))
          }
          onDelete={id => runAction(() => deleteVehicleColor(id), t('settings.deleted'))}
        />
      )}

      {activeTab === 'reasons' && (
        <CrudSection
          title={t('settings.tabs.reasons')}
          icon={<ListChecks className="h-5 w-5" />}
          items={reasonOptions}
          busy={loading}
          getId={r => r.id}
          getLabel={r => r.labelAr}
          fields={[
            { key: 'code', label: t('settings.fields.code'), required: true, placeholder: 'stock_shortage' },
            { key: 'label_ar', label: t('settings.fields.labelAr'), required: true },
            { key: 'label_en', label: t('settings.fields.labelEn'), required: true },
            { key: 'sort_order', label: t('settings.fields.sortOrder'), defaultValue: '0' },
            {
              key: 'is_active',
              label: t('settings.cols.active'),
              type: 'select',
              options: [
                { value: 'true', label: t('common.yes') },
                { value: 'false', label: t('common.no') }
              ],
              defaultValue: 'true'
            }
          ]}
          columns={[
            { header: t('settings.fields.code'), render: r => <span className="font-mono text-xs">{r.code}</span> },
            { header: t('settings.fields.labelAr'), render: r => r.labelAr },
            { header: t('settings.fields.labelEn'), render: r => r.labelEn },
            { header: t('settings.cols.active'), render: r => (r.isActive ? t('common.yes') : t('common.no')) }
          ]}
          toValues={r => ({
            code: r.code,
            label_ar: r.labelAr,
            label_en: r.labelEn,
            sort_order: String(r.sortOrder),
            is_active: r.isActive ? 'true' : 'false'
          })}
          onCreate={v =>
            runAction(async () => {
              await createMpReasonOption({
                code: v.code,
                label_ar: v.label_ar,
                label_en: v.label_en,
                sort_order: Number(v.sort_order) || 0
              })
            }, t('settings.added'))
          }
          onUpdate={(id, v) =>
            runAction(async () => {
              await updateMpReasonOption(id, {
                label_ar: v.label_ar,
                label_en: v.label_en,
                sort_order: Number(v.sort_order) || 0,
                is_active: v.is_active === 'true'
              })
            }, t('settings.updated'))
          }
          onDelete={id => runAction(() => deleteMpReasonOption(id), t('settings.deleted'))}
        />
      )}

      {activeTab === 'departments' && (
        <CrudSection
          title={t('settings.tabs.departments')}
          icon={<Building2 className="h-5 w-5" />}
          items={departmentOptions}
          busy={loading}
          getId={d => d.id}
          getLabel={d => d.labelAr}
          fields={[
            { key: 'code', label: t('settings.fields.code'), required: true, placeholder: 'warehouse' },
            { key: 'label_ar', label: t('settings.fields.labelAr'), required: true },
            { key: 'label_en', label: t('settings.fields.labelEn'), required: true },
            { key: 'sort_order', label: t('settings.fields.sortOrder'), defaultValue: '0' },
            {
              key: 'is_active',
              label: t('settings.cols.active'),
              type: 'select',
              options: [
                { value: 'true', label: t('common.yes') },
                { value: 'false', label: t('common.no') }
              ],
              defaultValue: 'true'
            }
          ]}
          columns={[
            { header: t('settings.fields.code'), render: d => <span className="font-mono text-xs">{d.code}</span> },
            { header: t('settings.fields.labelAr'), render: d => d.labelAr },
            { header: t('settings.fields.labelEn'), render: d => d.labelEn },
            { header: t('settings.cols.active'), render: d => (d.isActive ? t('common.yes') : t('common.no')) }
          ]}
          toValues={d => ({
            code: d.code,
            label_ar: d.labelAr,
            label_en: d.labelEn,
            sort_order: String(d.sortOrder),
            is_active: d.isActive ? 'true' : 'false'
          })}
          onCreate={v =>
            runAction(async () => {
              await createMpDepartmentOption({
                code: v.code,
                label_ar: v.label_ar,
                label_en: v.label_en,
                sort_order: Number(v.sort_order) || 0
              })
            }, t('settings.added'))
          }
          onUpdate={(id, v) =>
            runAction(async () => {
              await updateMpDepartmentOption(id, {
                label_ar: v.label_ar,
                label_en: v.label_en,
                sort_order: Number(v.sort_order) || 0,
                is_active: v.is_active === 'true'
              })
            }, t('settings.updated'))
          }
          onDelete={id => runAction(() => deleteMpDepartmentOption(id), t('settings.deleted'))}
        />
      )}

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
