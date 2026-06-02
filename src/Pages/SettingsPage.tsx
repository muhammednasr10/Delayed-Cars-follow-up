import { useEffect, useState, type ReactNode } from 'react'
import { Boxes, Car, MapPin, Palette, Pencil, Plus, RefreshCcw, Settings, Trash2, Users } from 'lucide-react'
import {
  createAppUser,
  createStation,
  createVehicleColor,
  createVehicleModel,
  createWorkArea,
  deleteAppUser,
  deleteStation,
  deleteVehicleColor,
  deleteVehicleModel,
  deleteWorkArea,
  getAppUsers,
  getStations,
  getVehicleColors,
  getVehicleModels,
  getWorkAreas,
  updateAppUser,
  updateStation,
  updateVehicleColor,
  updateVehicleModel,
  updateWorkArea
} from '../services/settingsService'
import type { AppUser, Station, VehicleColor, VehicleModel, WorkArea } from '../Types/settings'
import { supabase } from '../lib/supabase'
import { Modal } from '../Components/Modal'
import { ConfirmDialog } from '../Components/ConfirmDialog'
import { useLang } from '../i18n/LanguageContext'

type TabKey = 'models' | 'areas' | 'stations' | 'colors' | 'users'
type Values = Record<string, string>

const tabConfig: { key: TabKey; icon: ReactNode }[] = [
  { key: 'models', icon: <Car className="h-4 w-4" /> },
  { key: 'areas', icon: <Boxes className="h-4 w-4" /> },
  { key: 'stations', icon: <MapPin className="h-4 w-4" /> },
  { key: 'colors', icon: <Palette className="h-4 w-4" /> },
  { key: 'users', icon: <Users className="h-4 w-4" /> }
]

export function SettingsPage() {
  const { t } = useLang()
  const [activeTab, setActiveTab] = useState<TabKey>('models')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [models, setModels] = useState<VehicleModel[]>([])
  const [areas, setAreas] = useState<WorkArea[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [colors, setColors] = useState<VehicleColor[]>([])
  const [users, setUsers] = useState<AppUser[]>([])

  async function loadAll() {
    if (!supabase) {
      setError('Supabase .env')
      return
    }
    setLoading(true)
    setError('')
    try {
      const [modelsData, areasData, stationsData, colorsData, usersData] = await Promise.all([
        getVehicleModels(),
        getWorkAreas(),
        getStations(),
        getVehicleColors(),
        getAppUsers()
      ])
      setModels(modelsData)
      setAreas(areasData)
      setStations(stationsData)
      setColors(colorsData)
      setUsers(usersData)
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
          <button onClick={loadAll} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-100 hover:bg-slate-700">
            <RefreshCcw className="mr-1 inline h-4 w-4" /> {t('common.refresh')}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {tabConfig.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black ${activeTab === tab.key ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              {tab.icon} {t(`settings.tabs.${tab.key}`)}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>}

      {activeTab === 'models' && (
        <CrudSection
          title={t('settings.tabs.models')}
          icon={<Car className="h-5 w-5" />}
          items={models}
          busy={loading}
          getId={m => m.id}
          getLabel={m => m.name}
          fields={[{ key: 'name', label: t('settings.fields.modelName'), required: true }]}
          columns={[{ header: t('settings.cols.name'), render: m => m.name }]}
          toValues={m => ({ name: m.name })}
          onCreate={v => runAction(async () => { await createVehicleModel({ name: v.name }) }, t('settings.added'))}
          onUpdate={(id, v) => runAction(async () => { await updateVehicleModel(id, { name: v.name }) }, t('settings.updated'))}
          onDelete={id => runAction(() => deleteVehicleModel(id), t('settings.deleted'))}
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

      {activeTab === 'stations' && (
        <CrudSection
          title={t('settings.tabs.stations')}
          icon={<MapPin className="h-5 w-5" />}
          items={stations}
          busy={loading}
          getId={s => s.id}
          getLabel={s => `${s.station_number} - ${s.station_name}`}
          fields={[
            { key: 'station_number', label: t('settings.fields.stationNumber'), required: true, placeholder: 'ST-01' },
            { key: 'station_name', label: t('settings.fields.stationName'), required: true },
            { key: 'work_area_id', label: t('settings.fields.workArea'), type: 'select', options: areas.map(a => ({ value: a.id, label: a.name })) }
          ]}
          columns={[
            { header: t('settings.cols.number'), render: s => s.station_number },
            { header: t('settings.cols.name'), render: s => s.station_name },
            { header: t('settings.cols.workArea'), render: s => s.work_areas?.name || '-' }
          ]}
          toValues={s => ({ station_number: s.station_number, station_name: s.station_name, work_area_id: s.work_area_id || '' })}
          onCreate={v => runAction(async () => { await createStation({ station_number: v.station_number, station_name: v.station_name, work_area_id: v.work_area_id || null }) }, t('settings.added'))}
          onUpdate={(id, v) => runAction(async () => { await updateStation(id, { station_number: v.station_number, station_name: v.station_name, work_area_id: v.work_area_id || null }) }, t('settings.updated'))}
          onDelete={id => runAction(() => deleteStation(id), t('settings.deleted'))}
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
            { key: 'hex_code', label: t('settings.fields.color'), type: 'color', defaultValue: '#ffffff' }
          ]}
          columns={[
            { header: t('settings.cols.color'), render: c => <span className="inline-block h-5 w-5 rounded-full ring-1 ring-slate-500" style={{ backgroundColor: c.hex_code }} /> },
            { header: t('settings.cols.name'), render: c => c.name },
            { header: t('settings.cols.hex'), render: c => c.hex_code }
          ]}
          toValues={c => ({ name: c.name, hex_code: c.hex_code })}
          onCreate={v => runAction(async () => { await createVehicleColor({ name: v.name, hex_code: v.hex_code }) }, t('settings.added'))}
          onUpdate={(id, v) => runAction(async () => { await updateVehicleColor(id, { name: v.name, hex_code: v.hex_code }) }, t('settings.updated'))}
          onDelete={id => runAction(() => deleteVehicleColor(id), t('settings.deleted'))}
        />
      )}

      {activeTab === 'users' && (
        <CrudSection
          title={t('settings.tabs.users')}
          icon={<Users className="h-5 w-5" />}
          items={users}
          busy={loading}
          getId={u => u.id}
          getLabel={u => u.name}
          fields={[
            { key: 'name', label: t('settings.fields.name'), required: true },
            { key: 'email', label: t('settings.fields.email') },
            {
              key: 'role',
              label: t('settings.fields.role'),
              type: 'select',
              defaultValue: 'Engineer',
              options: [
                { value: 'Admin', label: 'Admin' },
                { value: 'Engineer', label: 'Engineer' },
                { value: 'Supervisor', label: 'Supervisor' },
                { value: 'Viewer', label: 'Viewer' }
              ]
            }
          ]}
          columns={[
            { header: t('settings.cols.name'), render: u => u.name },
            { header: t('settings.cols.email'), render: u => u.email || '-' },
            { header: t('settings.cols.role'), render: u => u.role }
          ]}
          toValues={u => ({ name: u.name, email: u.email || '', role: String(u.role) })}
          onCreate={v => runAction(async () => { await createAppUser({ name: v.name, email: v.email, role: v.role }) }, t('settings.added'))}
          onUpdate={(id, v) => runAction(async () => { await updateAppUser(id, { name: v.name, email: v.email, role: v.role }) }, t('settings.updated'))}
          onDelete={id => runAction(() => deleteAppUser(id), t('settings.deleted'))}
        />
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Reusable CRUD section: list + centered add/edit card modal + delete confirm.
// ---------------------------------------------------------------------------

type CrudField = {
  key: string
  label: string
  type?: 'text' | 'color' | 'select'
  options?: { value: string; label: string }[]
  required?: boolean
  placeholder?: string
  defaultValue?: string
}

type CrudColumn<T> = { header: string; render: (item: T) => ReactNode }

type CrudSectionProps<T> = {
  title: string
  icon: ReactNode
  items: T[]
  busy: boolean
  fields: CrudField[]
  columns: CrudColumn<T>[]
  getId: (item: T) => string
  getLabel: (item: T) => string
  toValues: (item: T) => Values
  onCreate: (values: Values) => Promise<boolean>
  onUpdate: (id: string, values: Values) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}

function emptyValues(fields: CrudField[]): Values {
  return fields.reduce<Values>((acc, field) => {
    acc[field.key] = field.defaultValue ?? ''
    return acc
  }, {})
}

function CrudSection<T>({
  title,
  icon,
  items,
  busy,
  fields,
  columns,
  getId,
  getLabel,
  toValues,
  onCreate,
  onUpdate,
  onDelete
}: CrudSectionProps<T>) {
  const { t } = useLang()
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [values, setValues] = useState<Values>(emptyValues(fields))
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null)

  function openAdd() {
    setEditingId(null)
    setValues(emptyValues(fields))
    setFormError('')
    setFormOpen(true)
  }

  function openEdit(item: T) {
    setEditingId(getId(item))
    setValues(toValues(item))
    setFormError('')
    setFormOpen(true)
  }

  async function submitForm() {
    const missing = fields.find(field => field.required && !values[field.key]?.trim())
    if (missing) {
      setFormError(`«${missing.label}» ${t('common.required')}`)
      return
    }
    const ok = editingId ? await onUpdate(editingId, values) : await onCreate(values)
    if (ok) setFormOpen(false)
    else setFormError(t('common.error'))
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const ok = await onDelete(getId(deleteTarget))
    if (ok) setDeleteTarget(null)
  }

  return (
    <div className="card-industrial overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-cyan-500/15 p-2.5 text-cyan-300">{icon}</div>
          <div>
            <h3 className="text-lg font-black text-white">{title}</h3>
            <p className="text-xs text-slate-400">{t('common.items', { n: items.length })}</p>
          </div>
        </div>
        <button onClick={openAdd} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400">
          <Plus className="mr-1 inline h-4 w-4" /> {t('common.add')}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-start">
          <thead className="bg-slate-950">
            <tr>
              {columns.map(col => (
                <th key={col.header} className="table-cell text-xs font-black uppercase text-slate-400">{col.header}</th>
              ))}
              <th className="table-cell text-xs font-black uppercase text-slate-400">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {items.length === 0 ? (
              <tr><td className="table-cell text-slate-400" colSpan={columns.length + 1}>{t('common.noData')}</td></tr>
            ) : (
              items.map(item => (
                <tr key={getId(item)} className="bg-slate-900/30 hover:bg-slate-800/40">
                  {columns.map(col => <td key={col.header} className="table-cell">{col.render(item)}</td>)}
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(item)} title={t('common.edit')} className="rounded-lg bg-orange-500/15 p-2 text-orange-200 hover:bg-orange-500/25">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(item)} title={t('common.delete')} className="rounded-lg bg-red-500/15 p-2 text-red-200 hover:bg-red-500/25">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={formOpen}
        title={editingId ? t('settings.editTitle', { title }) : t('settings.addTitle', { title })}
        icon={icon}
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <button onClick={() => setFormOpen(false)} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200 hover:bg-slate-700">{t('common.cancel')}</button>
            <button disabled={busy} onClick={submitForm} className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50">
              {editingId ? t('common.saveEdit') : t('common.add')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {fields.map(field => (
            <label key={field.key} className="block space-y-2">
              <span className="text-sm font-bold text-slate-300">{field.label}{field.required && <span className="text-red-400"> *</span>}</span>
              {field.type === 'select' ? (
                <select className="input-dark" value={values[field.key] ?? ''} onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}>
                  <option value="">—</option>
                  {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              ) : field.type === 'color' ? (
                <div className="flex items-center gap-3">
                  <input type="color" className="h-10 w-16 cursor-pointer rounded-lg border border-slate-700 bg-slate-950" value={values[field.key] || '#ffffff'} onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))} />
                  <span className="font-mono text-sm text-slate-300">{values[field.key]}</span>
                </div>
              ) : (
                <input className="input-dark" placeholder={field.placeholder} value={values[field.key] ?? ''} onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))} />
              )}
            </label>
          ))}
          {formError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{formError}</div>}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('settings.deleteTitle')}
        message={deleteTarget ? t('settings.deleteMsg', { name: getLabel(deleteTarget) }) : ''}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
