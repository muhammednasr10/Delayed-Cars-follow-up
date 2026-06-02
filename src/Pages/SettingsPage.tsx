import { useEffect, useState } from 'react'
import { RefreshCcw, Settings } from 'lucide-react'
import {
  createAppUser,
  createStation,
  createVehicleColor,
  createVehicleModel,
  createWorkArea,
  deactivateAppUser,
  deactivateStation,
  deactivateVehicleColor,
  deactivateVehicleModel,
  deactivateWorkArea,
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

type TabKey = 'models' | 'areas' | 'stations' | 'colors' | 'users'

const tabs: { key: TabKey; label: string }[] = [
  { key: 'models', label: 'الموديلات' },
  { key: 'areas', label: 'أماكن العمل' },
  { key: 'stations', label: 'المحطات' },
  { key: 'colors', label: 'ألوان السيارات' },
  { key: 'users', label: 'المستخدمين' }
]

export function SettingsPage() {
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
      setError('Supabase غير متضبط. تأكد من ملف .env')
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
      const message = err instanceof Error ? err.message : 'فشل تحميل الإعدادات.'
      setError(message)
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

  async function runAction(action: () => Promise<void>, successMessage: string) {
    setLoading(true)
    setError('')
    try {
      await action()
      await loadAll()
      showSuccess(successMessage)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ أثناء تنفيذ العملية.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="space-y-5">
      <div className="card-industrial p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-500/15 p-3 text-cyan-300"><Settings className="h-6 w-6" /></div>
            <div>
              <h2 className="text-xl font-black text-white">الإعدادات</h2>
              <p className="text-sm text-slate-400">إدارة الموديلات، المستخدمين، الألوان، أماكن العمل والمحطات من Supabase.</p>
            </div>
          </div>
          <button onClick={loadAll} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-100 hover:bg-slate-700">
            <RefreshCcw className="mr-1 inline h-4 w-4" /> تحديث
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`rounded-xl px-4 py-2 text-sm font-black ${activeTab === tab.key ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-200">جاري تنفيذ العملية...</div>}
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>}

      {activeTab === 'models' && <ModelsSection items={models} runAction={runAction} />}
      {activeTab === 'areas' && <AreasSection items={areas} runAction={runAction} />}
      {activeTab === 'stations' && <StationsSection items={stations} areas={areas} runAction={runAction} />}
      {activeTab === 'colors' && <ColorsSection items={colors} runAction={runAction} />}
      {activeTab === 'users' && <UsersSection items={users} runAction={runAction} />}
    </section>
  )
}

function ModelsSection({ items, runAction }: { items: VehicleModel[]; runAction: (action: () => Promise<void>, msg: string) => Promise<void> }) {
  const [name, setName] = useState('')
  return <SettingsCard title="الموديلات">
    <InlineForm onSubmit={() => runAction(async () => { await createVehicleModel({ name }); setName('') }, 'تم إضافة الموديل.')} disabled={!name.trim()}>
      <input className="input-dark" placeholder="Model name" value={name} onChange={e => setName(e.target.value)} />
    </InlineForm>
    <SimpleTable headers={['Name', 'Actions']} rows={items.map(item => [item.name, <RowActions onEdit={() => {
      const value = prompt('Edit model name', item.name)
      if (value) runAction(() => updateVehicleModel(item.id, { name: value }).then(() => undefined), 'تم تعديل الموديل.')
    }} onDelete={() => confirm('تعطيل هذا الموديل؟') && runAction(() => deactivateVehicleModel(item.id), 'تم تعطيل الموديل.')} />])} />
  </SettingsCard>
}

function AreasSection({ items, runAction }: { items: WorkArea[]; runAction: (action: () => Promise<void>, msg: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  return <SettingsCard title="أماكن العمل">
    <InlineForm onSubmit={() => runAction(async () => { await createWorkArea({ name, description }); setName(''); setDescription('') }, 'تم إضافة مكان العمل.')} disabled={!name.trim()}>
      <input className="input-dark" placeholder="Work area name" value={name} onChange={e => setName(e.target.value)} />
      <input className="input-dark" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
    </InlineForm>
    <SimpleTable headers={['Name', 'Description', 'Actions']} rows={items.map(item => [item.name, item.description || '-', <RowActions onEdit={() => {
      const value = prompt('Edit work area name', item.name)
      if (value) runAction(() => updateWorkArea(item.id, { name: value }).then(() => undefined), 'تم تعديل مكان العمل.')
    }} onDelete={() => confirm('تعطيل مكان العمل؟') && runAction(() => deactivateWorkArea(item.id), 'تم تعطيل مكان العمل.')} />])} />
  </SettingsCard>
}

function StationsSection({ items, areas, runAction }: { items: Station[]; areas: WorkArea[]; runAction: (action: () => Promise<void>, msg: string) => Promise<void> }) {
  const [stationNumber, setStationNumber] = useState('')
  const [stationName, setStationName] = useState('')
  const [workAreaId, setWorkAreaId] = useState('')
  return <SettingsCard title="المحطات">
    <InlineForm onSubmit={() => runAction(async () => { await createStation({ station_number: stationNumber, station_name: stationName, work_area_id: workAreaId || null }); setStationNumber(''); setStationName(''); setWorkAreaId('') }, 'تم إضافة المحطة.')} disabled={!stationNumber.trim() || !stationName.trim()}>
      <input className="input-dark" placeholder="ST-01" value={stationNumber} onChange={e => setStationNumber(e.target.value)} />
      <input className="input-dark" placeholder="Station name" value={stationName} onChange={e => setStationName(e.target.value)} />
      <select className="input-dark" value={workAreaId} onChange={e => setWorkAreaId(e.target.value)}>
        <option value="">Work Area</option>
        {areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
      </select>
    </InlineForm>
    <SimpleTable headers={['Number', 'Name', 'Work Area', 'Actions']} rows={items.map(item => [item.station_number, item.station_name, item.work_areas?.name || '-', <RowActions onEdit={() => {
      const value = prompt('Edit station name', item.station_name)
      if (value) runAction(() => updateStation(item.id, { station_name: value }).then(() => undefined), 'تم تعديل المحطة.')
    }} onDelete={() => confirm('تعطيل المحطة؟') && runAction(() => deactivateStation(item.id), 'تم تعطيل المحطة.')} />])} />
  </SettingsCard>
}

function ColorsSection({ items, runAction }: { items: VehicleColor[]; runAction: (action: () => Promise<void>, msg: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [hex, setHex] = useState('#ffffff')
  return <SettingsCard title="ألوان السيارات">
    <InlineForm onSubmit={() => runAction(async () => { await createVehicleColor({ name, hex_code: hex }); setName(''); setHex('#ffffff') }, 'تم إضافة اللون.')} disabled={!name.trim()}>
      <input className="input-dark" placeholder="Color name" value={name} onChange={e => setName(e.target.value)} />
      <input className="input-dark" type="color" value={hex} onChange={e => setHex(e.target.value)} />
    </InlineForm>
    <SimpleTable headers={['Preview', 'Name', 'Hex', 'Actions']} rows={items.map(item => [<span className="inline-block h-5 w-5 rounded-full ring-1 ring-slate-500" style={{ backgroundColor: item.hex_code }} />, item.name, item.hex_code, <RowActions onEdit={() => {
      const value = prompt('Edit color name', item.name)
      if (value) runAction(() => updateVehicleColor(item.id, { name: value }).then(() => undefined), 'تم تعديل اللون.')
    }} onDelete={() => confirm('تعطيل اللون؟') && runAction(() => deactivateVehicleColor(item.id), 'تم تعطيل اللون.')} />])} />
  </SettingsCard>
}

function UsersSection({ items, runAction }: { items: AppUser[]; runAction: (action: () => Promise<void>, msg: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('Engineer')
  return <SettingsCard title="المستخدمين / المهندسين">
    <InlineForm onSubmit={() => runAction(async () => { await createAppUser({ name, email, role }); setName(''); setEmail(''); setRole('Engineer') }, 'تم إضافة المستخدم.')} disabled={!name.trim()}>
      <input className="input-dark" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
      <input className="input-dark" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <select className="input-dark" value={role} onChange={e => setRole(e.target.value)}>
        <option>Admin</option><option>Engineer</option><option>Supervisor</option><option>Viewer</option>
      </select>
    </InlineForm>
    <SimpleTable headers={['Name', 'Email', 'Role', 'Actions']} rows={items.map(item => [item.name, item.email || '-', item.role, <RowActions onEdit={() => {
      const value = prompt('Edit user name', item.name)
      if (value) runAction(() => updateAppUser(item.id, { name: value }).then(() => undefined), 'تم تعديل المستخدم.')
    }} onDelete={() => confirm('تعطيل المستخدم؟') && runAction(() => deactivateAppUser(item.id), 'تم تعطيل المستخدم.')} />])} />
  </SettingsCard>
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="card-industrial overflow-hidden">
    <div className="border-b border-slate-800 p-5"><h3 className="text-lg font-black text-white">{title}</h3></div>
    <div className="space-y-4 p-5">{children}</div>
  </div>
}

function InlineForm({ children, disabled, onSubmit }: { children: React.ReactNode; disabled?: boolean; onSubmit: () => void }) {
  return <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
    {children}
    <button disabled={disabled} onClick={onSubmit} className="rounded-xl bg-cyan-500 px-4 py-2 font-black text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">Add</button>
  </div>
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return <div className="flex gap-2">
    <button onClick={onEdit} className="rounded-lg bg-orange-500/15 px-3 py-1 text-xs font-bold text-orange-200">Edit</button>
    <button onClick={onDelete} className="rounded-lg bg-red-500/15 px-3 py-1 text-xs font-bold text-red-200">Disable</button>
  </div>
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return <div className="overflow-x-auto rounded-xl border border-slate-800">
    <table className="w-full min-w-[700px] text-left">
      <thead className="bg-slate-950"><tr>{headers.map(h => <th key={h} className="table-cell text-xs font-black uppercase text-slate-400">{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-800">
        {rows.length === 0 ? <tr><td className="table-cell text-slate-400" colSpan={headers.length}>لا توجد بيانات.</td></tr> : rows.map((row, index) => <tr key={index} className="bg-slate-900/30">{row.map((cell, cellIndex) => <td key={cellIndex} className="table-cell">{cell}</td>)}</tr>)}
      </tbody>
    </table>
  </div>
}
