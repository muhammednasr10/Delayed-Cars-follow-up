import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useVehicles } from '../Context/VehiclesContext'
import type { VehicleModel, VehicleColor, Station } from '../Types/settings'
import type { ProductionOrder } from '../Types/production'
import { getStations, getVehicleColors, getVehicleModels } from '../services/settingsService'
import { createProductionOrder, getProductionOrders } from '../services/productionOrdersService'

type Lists = {
  models: VehicleModel[]
  orders: ProductionOrder[]
  colors: VehicleColor[]
  stations: Station[]
}

export function NewVehicleModal({ onClose }: { onClose: () => void }) {
  const { addVehicle } = useVehicles()
  const [lists, setLists] = useState<Lists>({ models: [], orders: [], colors: [], stations: [] })
  const [vin, setVin] = useState('')
  const [modelId, setModelId] = useState('')
  const [productionOrderId, setProductionOrderId] = useState('')
  const [vehicleColorId, setVehicleColorId] = useState('')
  const [currentStationId, setCurrentStationId] = useState('')
  const [notes, setNotes] = useState('')
  const [newOrderNumber, setNewOrderNumber] = useState('')
  const [error, setError] = useState('')
  const [loadingLists, setLoadingLists] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  async function loadLists() {
    setLoadingLists(true)
    try {
      const [models, orders, colors, stations] = await Promise.all([
        getVehicleModels(),
        getProductionOrders(),
        getVehicleColors(),
        getStations()
      ])
      setLists({ models, orders, colors, stations })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل القوائم.')
    } finally {
      setLoadingLists(false)
    }
  }

  useEffect(() => {
    loadLists()
  }, [])

  async function handleCreateOrder() {
    if (!newOrderNumber.trim() || !modelId) {
      setError('لإنشاء أمر إنتاج: أدخل رقم الأمر واختر الموديل أولاً.')
      return
    }
    try {
      const order = await createProductionOrder({ orderNumber: newOrderNumber, modelId, plannedQty: 1 })
      setLists(prev => ({ ...prev, orders: [order, ...prev.orders] }))
      setProductionOrderId(order.id)
      setNewOrderNumber('')
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إنشاء أمر الإنتاج.')
    }
  }

  function validate(): string | null {
    if (vin.trim().length < 6) return 'رقم الشاسيه (VIN) يجب أن يكون 6 أحرف على الأقل.'
    if (!modelId) return 'اختر الموديل.'
    if (!productionOrderId) return 'اختر أمر الإنتاج أو أنشئ واحداً.'
    return null
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setSubmitting(true)
    const result = await addVehicle({
      vin,
      modelId,
      productionOrderId,
      vehicleColorId: vehicleColorId || null,
      currentStationId: currentStationId || null,
      notes
    })
    setSubmitting(false)
    if (!result.ok) {
      setError(result.message || 'فشل الحفظ.')
      return
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="w-full max-w-2xl card-industrial p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-white">تسجيل سيارة جديدة</h3>
          <button onClick={onClose} className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loadingLists && (
          <div className="mb-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-200">
            جاري تحميل القوائم...
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-300">رقم الشاسيه / VIN</span>
            <input className="input-dark" value={vin} onChange={e => setVin(e.target.value)} placeholder="VIN" />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-300">الموديل</span>
            <select className="input-dark" value={modelId} onChange={e => setModelId(e.target.value)}>
              <option value="">اختر الموديل</option>
              {lists.models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>

          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-bold text-slate-300">أمر الإنتاج</span>
            <select className="input-dark" value={productionOrderId} onChange={e => setProductionOrderId(e.target.value)}>
              <option value="">اختر أمر الإنتاج</option>
              {lists.orders.map(o => <option key={o.id} value={o.id}>{o.orderNumber}</option>)}
            </select>
          </label>

          <div className="flex items-end gap-2 sm:col-span-2">
            <label className="flex-1 space-y-2">
              <span className="text-sm font-bold text-slate-300">أو أنشئ أمر إنتاج جديد</span>
              <input className="input-dark" value={newOrderNumber} onChange={e => setNewOrderNumber(e.target.value)} placeholder="PO-2026-001" />
            </label>
            <button type="button" onClick={handleCreateOrder} className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-bold text-slate-100 hover:bg-slate-600">
              <Plus className="inline h-4 w-4" /> إنشاء
            </button>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-300">اللون</span>
            <select className="input-dark" value={vehicleColorId} onChange={e => setVehicleColorId(e.target.value)}>
              <option value="">اختر اللون</option>
              {lists.colors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-300">المحطة الحالية</span>
            <select className="input-dark" value={currentStationId} onChange={e => setCurrentStationId(e.target.value)}>
              <option value="">اختر المحطة</option>
              {lists.stations.map(s => <option key={s.id} value={s.id}>{s.station_number} - {s.station_name}</option>)}
            </select>
          </label>

          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-bold text-slate-300">ملاحظات</span>
            <textarea className="input-dark min-h-20" value={notes} onChange={e => setNotes(e.target.value)} />
          </label>

          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200 sm:col-span-2">{error}</div>}

          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200">إلغاء</button>
            <button disabled={submitting} className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 disabled:opacity-60">
              {submitting ? 'جاري الحفظ...' : 'حفظ السيارة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
