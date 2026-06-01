import { useState } from 'react'
import { PlusCircle } from 'lucide-react'
import { useDelayedCars } from '../Context/DelayedCarsContext'
import { carModels, engineers, stationNumbers } from '../Data/options'
import type { CriticalityLevel, DelayedCarInput } from '../Types/car'

const initialForm: DelayedCarInput = {
  chassisNumber: '',
  model: '',
  stationNumber: '',
  missingPart: '',
  criticality: 'medium',
  isDrItem: false,
  assignedEngineer: '',
  notes: ''
}

export function DelayedCarForm() {
  const { addCar } = useDelayedCars()
  const [form, setForm] = useState<DelayedCarInput>(initialForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function updateField<K extends keyof DelayedCarInput>(field: K, value: DelayedCarInput[K]) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
    setSuccess('')
  }

  function validate(): string | null {
    if (!form.chassisNumber.trim()) return 'برجاء إدخال رقم الشاسيه.'
    if (form.chassisNumber.trim().length < 6) return 'رقم الشاسيه يجب أن يكون 6 أحرف على الأقل.'
    if (!form.model) return 'برجاء اختيار الموديل.'
    if (!form.stationNumber) return 'برجاء اختيار رقم المحطة.'
    if (!form.missingPart.trim()) return 'برجاء إدخال القطعة الناقصة.'
    if (!form.assignedEngineer) return 'برجاء اختيار المهندس المسؤول.'
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
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-xl bg-cyan-500/15 p-3 text-cyan-300">
          <PlusCircle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-black text-white">تسجيل سيارة نواقص جديدة</h2>
          <p className="text-sm text-slate-400">كل البيانات حالياً محفوظة محلياً داخل React State / Context.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-300">رقم الشاسيه</span>
          <input
            className="input-dark"
            value={form.chassisNumber}
            onChange={event => updateField('chassisNumber', event.target.value)}
            placeholder="VIN / Chassis Number"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-300">الموديل / الطراز</span>
          <select className="input-dark" value={form.model} onChange={event => updateField('model', event.target.value)}>
            <option value="">اختر الموديل</option>
            {carModels.map(model => <option key={model} value={model}>{model}</option>)}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-300">رقم المحطة</span>
          <select className="input-dark" value={form.stationNumber} onChange={event => updateField('stationNumber', event.target.value)}>
            <option value="">اختر المحطة</option>
            {stationNumbers.map(station => <option key={station} value={station}>{station}</option>)}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-300">القطعة الناقصة / العجز</span>
          <input
            className="input-dark"
            value={form.missingPart}
            onChange={event => updateField('missingPart', event.target.value)}
            placeholder="Missing Part"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-300">درجة الأهمية</span>
          <select
            className="input-dark"
            value={form.criticality}
            onChange={event => updateField('criticality', event.target.value as CriticalityLevel)}
          >
            <option value="critical">حرج جداً - خط متوقف</option>
            <option value="medium">متوسط</option>
            <option value="low">منخفض</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-300">المهندس المسؤول</span>
          <select className="input-dark" value={form.assignedEngineer} onChange={event => updateField('assignedEngineer', event.target.value)}>
            <option value="">اختر المهندس</option>
            {engineers.map(engineer => <option key={engineer} value={engineer}>{engineer}</option>)}
          </select>
        </label>

        <div className="rounded-xl border border-slate-700 bg-slate-950/80 p-4 lg:col-span-2">
          <p className="mb-3 text-sm font-bold text-slate-300">هل القطعة DR Item؟</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => updateField('isDrItem', true)}
              className={`rounded-xl px-4 py-2 text-sm font-bold ${form.isDrItem ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-300'}`}
            >
              نعم
            </button>
            <button
              type="button"
              onClick={() => updateField('isDrItem', false)}
              className={`rounded-xl px-4 py-2 text-sm font-bold ${!form.isDrItem ? 'bg-slate-200 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
            >
              لا
            </button>
          </div>
        </div>

        <label className="space-y-2 lg:col-span-2">
          <span className="text-sm font-bold text-slate-300">ملاحظات</span>
          <textarea
            className="input-dark min-h-24"
            value={form.notes}
            onChange={event => updateField('notes', event.target.value)}
            placeholder="Containment action, supplier feedback, ETA..."
          />
        </label>

        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200 lg:col-span-2">{error}</div>}
        {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200 lg:col-span-2">{success}</div>}

        <div className="lg:col-span-2">
          <button className="w-full rounded-xl bg-cyan-500 px-5 py-3 font-black text-slate-950 transition hover:bg-cyan-400 sm:w-auto">
            حفظ السيارة المتأخرة
          </button>
        </div>
      </form>
    </section>
  )
}
