import { useEffect, useState } from 'react'
import { PlusCircle, RefreshCcw } from 'lucide-react'
import { useDelayedCars } from '../Context/DelayedCarsContext'
import type { CriticalityLevel, DelayedCarInput } from '../Types/car'
import type { AppUser, Station, VehicleColor, VehicleModel } from '../Types/settings'
import { getAppUsers, getStations, getVehicleColors, getVehicleModels } from '../services/settingsService'
import { supabase } from '../lib/supabase'

const initialForm: DelayedCarInput = {
  chassisNumber: '',
  model: '',
  modelId: null,
  stationNumber: '',
  stationId: null,
  vehicleColorId: null,
  missingPart: '',
  criticality: 'medium',
  isDrItem: false,
  assignedEngineer: '',
  assignedUserId: null,
  notes: ''
}

type Lists = {
  models: VehicleModel[]
  stations: Station[]
  users: AppUser[]
  colors: VehicleColor[]
}

export function DelayedCarForm() {
  const { addCar } = useDelayedCars()
  const [form, setForm] = useState<DelayedCarInput>(initialForm)
  const [lists, setLists] = useState<Lists>({ models: [], stations: [], users: [], colors: [] })
  const [listsLoading, setListsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadLists() {
    if (!supabase) return
    setListsLoading(true)
    setError('')
    try {
      const [models, stations, users, colors] = await Promise.all([
        getVehicleModels(),
        getStations(),
        getAppUsers(),
        getVehicleColors()
      ])
      setLists({
        models,
        stations,
        users: users.filter(user => ['Admin', 'Engineer', 'Supervisor'].includes(user.role)),
        colors
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل تحميل قوائم الإعدادات من Supabase.'
      console.error('Failed to load delayed car form settings:', err)
      setError(message)
    } finally {
      setListsLoading(false)
    }
  }

  useEffect(() => {
    loadLists()
  }, [])

  function updateField<K extends keyof DelayedCarInput>(field: K, value: DelayedCarInput[K]) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
    setSuccess('')
  }

  function handleModelChange(modelId: string) {
    const model = lists.models.find(item => item.id === modelId)
    setForm(prev => ({ ...prev, modelId: model?.id ?? null, model: model?.name ?? '' }))
  }

  function handleStationChange(stationId: string) {
    const station = lists.stations.find(item => item.id === stationId)
    setForm(prev => ({ ...prev, stationId: station?.id ?? null, stationNumber: station?.station_number ?? '' }))
  }

  function handleUserChange(userId: string) {
    const user = lists.users.find(item => item.id === userId)
    setForm(prev => ({ ...prev, assignedUserId: user?.id ?? null, assignedEngineer: user?.name ?? '' }))
  }

  function validate(): string | null {
    if (!form.chassisNumber.trim()) return 'برجاء إدخال رقم الشاسيه.'
    if (form.chassisNumber.trim().length < 6) return 'رقم الشاسيه يجب أن يكون 6 أحرف على الأقل.'
    if (!form.modelId && supabase) return 'برجاء اختيار الموديل من قائمة الإعدادات.'
    if (!form.stationId && supabase) return 'برجاء اختيار المحطة من قائمة الإعدادات.'
    if (!form.missingPart.trim()) return 'برجاء إدخال القطعة الناقصة.'
    if (!form.assignedUserId && supabase) return 'برجاء اختيار المهندس المسؤول من قائمة المستخدمين.'
    if (supabase && (lists.models.length === 0 || lists.stations.length === 0 || lists.users.length === 0)) {
      return 'القوائم الأساسية فارغة. أضف موديلات ومحطات ومستخدمين من صفحة الإعدادات أولاً.'
    }
    return null
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    const result = await addCar({
      ...form,
      chassisNumber: form.chassisNumber.trim().toUpperCase(),
      missingPart: form.missingPart.trim(),
      notes: form.notes.trim()
    })

    if (!result.ok) {
      setError(result.message || 'حدث خطأ أثناء الحفظ.')
      return
    }

    setSuccess('تم تسجيل السيارة المتأخرة بنجاح.')
    setForm(initialForm)
  }

  return (
    <section className="card-industrial p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-cyan-500/15 p-3 text-cyan-300">
            <PlusCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">تسجيل سيارة نواقص جديدة</h2>
            <p className="text-sm text-slate-400">القوائم تأتي من Supabase Settings عند ضبط .env.</p>
          </div>
        </div>
        {supabase && (
          <button type="button" onClick={loadLists} className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700">
            <RefreshCcw className="mr-1 inline h-4 w-4" /> تحديث القوائم
          </button>
        )}
      </div>

      {listsLoading && <div className="mb-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-200">جاري تحميل قوائم الإعدادات...</div>}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-300">رقم الشاسيه</span>
          <input className="input-dark" value={form.chassisNumber} onChange={event => updateField('chassisNumber', event.target.value)} placeholder="VIN / Chassis Number" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-300">الموديل / الطراز</span>
          <select className="input-dark" value={form.modelId ?? ''} onChange={event => handleModelChange(event.target.value)}>
            <option value="">اختر الموديل</option>
            {lists.models.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-300">المحطة</span>
          <select className="input-dark" value={form.stationId ?? ''} onChange={event => handleStationChange(event.target.value)}>
            <option value="">اختر المحطة</option>
            {lists.stations.map(station => (
              <option key={station.id} value={station.id}>{station.station_number} - {station.station_name}</option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-300">لون السيارة</span>
          <select className="input-dark" value={form.vehicleColorId ?? ''} onChange={event => updateField('vehicleColorId', event.target.value || null)}>
            <option value="">اختر اللون</option>
            {lists.colors.map(color => <option key={color.id} value={color.id}>{color.name} - {color.hex_code}</option>)}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-300">القطعة الناقصة / العجز</span>
          <input className="input-dark" value={form.missingPart} onChange={event => updateField('missingPart', event.target.value)} placeholder="Missing Part" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-300">درجة الأهمية</span>
          <select className="input-dark" value={form.criticality} onChange={event => updateField('criticality', event.target.value as CriticalityLevel)}>
            <option value="critical">حرج جداً - خط متوقف</option>
            <option value="medium">متوسط</option>
            <option value="low">منخفض</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-300">المهندس المسؤول</span>
          <select className="input-dark" value={form.assignedUserId ?? ''} onChange={event => handleUserChange(event.target.value)}>
            <option value="">اختر المهندس</option>
            {lists.users.map(user => <option key={user.id} value={user.id}>{user.name} - {user.role}</option>)}
          </select>
        </label>

        <div className="rounded-xl border border-slate-700 bg-slate-950/80 p-4 lg:col-span-2">
          <p className="mb-3 text-sm font-bold text-slate-300">هل القطعة DR Item؟</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => updateField('isDrItem', true)} className={`rounded-xl px-4 py-2 text-sm font-bold ${form.isDrItem ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-300'}`}>نعم</button>
            <button type="button" onClick={() => updateField('isDrItem', false)} className={`rounded-xl px-4 py-2 text-sm font-bold ${!form.isDrItem ? 'bg-slate-200 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>لا</button>
          </div>
        </div>

        <label className="space-y-2 lg:col-span-2">
          <span className="text-sm font-bold text-slate-300">ملاحظات</span>
          <textarea className="input-dark min-h-24" value={form.notes} onChange={event => updateField('notes', event.target.value)} placeholder="Containment action, supplier feedback, ETA..." />
        </label>

        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200 lg:col-span-2">{error}</div>}
        {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200 lg:col-span-2">{success}</div>}

        <div className="lg:col-span-2">
          <button disabled={listsLoading} className="w-full rounded-xl bg-cyan-500 px-5 py-3 font-black text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
            حفظ السيارة المتأخرة
          </button>
        </div>
      </form>
    </section>
  )
}
