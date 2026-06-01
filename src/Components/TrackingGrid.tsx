import { useMemo, useState } from 'react'
import { Edit3, Filter, MessageSquarePlus } from 'lucide-react'
import { useDelayedCars } from '../Context/DelayedCarsContext'
import { stationNumbers } from '../Data/options'
import type { CriticalityLevel, DelayedCar, DelayStatus, TrackingFilters } from '../Types/car'
import { criticalityLabel, formatDateTime, getDelayHours, statusLabel } from '../Utils/formatters'
import { CriticalityBadge, StatusBadge } from './StatusBadge'

const nextStatus: Record<DelayStatus, DelayStatus> = {
  waiting: 'shipping',
  shipping: 'installed',
  installed: 'closed',
  closed: 'waiting'
}

export function TrackingGrid() {
  const { cars, updateStatus, addNote, updateCar } = useDelayedCars()
  const [filters, setFilters] = useState<TrackingFilters>({
    stationNumber: '',
    criticality: '',
    drOnly: false,
    search: ''
  })
  const [editingCar, setEditingCar] = useState<DelayedCar | null>(null)
  const [noteCar, setNoteCar] = useState<DelayedCar | null>(null)
  const [noteText, setNoteText] = useState('')

  const filteredCars = useMemo(() => {
    return cars
      .filter(car => !filters.stationNumber || car.stationNumber === filters.stationNumber)
      .filter(car => !filters.criticality || car.criticality === filters.criticality)
      .filter(car => !filters.drOnly || car.isDrItem)
      .filter(car => {
        const q = filters.search.trim().toLowerCase()
        if (!q) return true
        return [car.chassisNumber, car.model, car.missingPart, car.assignedEngineer]
          .join(' ')
          .toLowerCase()
          .includes(q)
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [cars, filters])

  function handleSaveNote() {
    if (!noteCar || !noteText.trim()) return
    addNote(noteCar.id, `[${new Date().toLocaleString()}] ${noteText.trim()}`)
    setNoteText('')
    setNoteCar(null)
  }

  function handleSaveEdit() {
    if (!editingCar) return
    updateCar(editingCar.id, editingCar)
    setEditingCar(null)
  }

  return (
    <section className="card-industrial overflow-hidden">
      <div className="border-b border-slate-800 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-slate-800 p-3 text-slate-200">
            <Filter className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Tracking Grid</h2>
            <p className="text-sm text-slate-400">فلترة حسب المحطة، DR Items، الحرجية، والبحث الذكي.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            className="input-dark"
            placeholder="بحث برقم الشاسيه / القطعة / المهندس"
            value={filters.search}
            onChange={event => setFilters(prev => ({ ...prev, search: event.target.value }))}
          />
          <select
            className="input-dark"
            value={filters.stationNumber}
            onChange={event => setFilters(prev => ({ ...prev, stationNumber: event.target.value }))}
          >
            <option value="">كل المحطات</option>
            {stationNumbers.map(station => <option key={station} value={station}>{station}</option>)}
          </select>
          <select
            className="input-dark"
            value={filters.criticality}
            onChange={event => setFilters(prev => ({ ...prev, criticality: event.target.value as '' | CriticalityLevel }))}
          >
            <option value="">كل درجات الأهمية</option>
            <option value="critical">حرج جداً</option>
            <option value="medium">متوسط</option>
            <option value="low">منخفض</option>
          </select>
          <button
            onClick={() => setFilters(prev => ({ ...prev, drOnly: !prev.drOnly }))}
            className={`rounded-xl px-4 py-2 text-sm font-black transition ${filters.drOnly ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            {filters.drOnly ? 'DR Items فقط' : 'عرض كل القطع'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1100px] w-full text-left">
          <thead className="bg-slate-950/90">
            <tr>
              <th className="table-cell text-xs font-black uppercase text-slate-400">Chassis</th>
              <th className="table-cell text-xs font-black uppercase text-slate-400">Model</th>
              <th className="table-cell text-xs font-black uppercase text-slate-400">Station</th>
              <th className="table-cell text-xs font-black uppercase text-slate-400">Missing Part</th>
              <th className="table-cell text-xs font-black uppercase text-slate-400">Criticality</th>
              <th className="table-cell text-xs font-black uppercase text-slate-400">DR</th>
              <th className="table-cell text-xs font-black uppercase text-slate-400">Engineer</th>
              <th className="table-cell text-xs font-black uppercase text-slate-400">Status</th>
              <th className="table-cell text-xs font-black uppercase text-slate-400">Delay</th>
              <th className="table-cell text-xs font-black uppercase text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredCars.map(car => (
              <tr key={car.id} className="bg-slate-900/30 hover:bg-slate-800/40">
                <td className="table-cell font-black text-white">{car.chassisNumber}</td>
                <td className="table-cell">{car.model}</td>
                <td className="table-cell">{car.stationNumber}</td>
                <td className="table-cell">{car.missingPart}</td>
                <td className="table-cell"><CriticalityBadge level={car.criticality} /></td>
                <td className="table-cell">{car.isDrItem ? <span className="font-black text-purple-300">YES</span> : <span className="text-slate-500">NO</span>}</td>
                <td className="table-cell">{car.assignedEngineer}</td>
                <td className="table-cell"><StatusBadge status={car.status} /></td>
                <td className="table-cell">
                  <div className="font-bold text-white">{getDelayHours(car.createdAt)}h</div>
                  <div className="text-xs text-slate-500">{formatDateTime(car.createdAt)}</div>
                </td>
                <td className="table-cell">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => updateStatus(car.id, nextStatus[car.status])}
                      className="rounded-lg bg-cyan-500/15 px-3 py-2 text-xs font-black text-cyan-200 hover:bg-cyan-500/25"
                    >
                      {statusLabel[nextStatus[car.status]]}
                    </button>
                    <button
                      onClick={() => setEditingCar(car)}
                      className="rounded-lg bg-orange-500/15 px-3 py-2 text-xs font-black text-orange-200 hover:bg-orange-500/25"
                    >
                      <Edit3 className="inline h-3 w-3" /> تعديل
                    </button>
                    <button
                      onClick={() => setNoteCar(car)}
                      className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-black text-slate-100 hover:bg-slate-600"
                    >
                      <MessageSquarePlus className="inline h-3 w-3" /> ملاحظة
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredCars.length === 0 && (
        <div className="p-8 text-center text-slate-400">لا توجد نتائج مطابقة للفلاتر الحالية.</div>
      )}

      {noteCar && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <h3 className="text-lg font-black text-white">إضافة ملاحظة - {noteCar.chassisNumber}</h3>
            <textarea className="input-dark mt-4 min-h-28" value={noteText} onChange={event => setNoteText(event.target.value)} />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setNoteCar(null)} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200">إلغاء</button>
              <button onClick={handleSaveNote} className="rounded-xl bg-cyan-500 px-4 py-2 font-black text-slate-950">حفظ</button>
            </div>
          </div>
        </div>
      )}

      {editingCar && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <h3 className="text-lg font-black text-white">تعديل بيانات السيارة</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input className="input-dark" value={editingCar.chassisNumber} onChange={event => setEditingCar({ ...editingCar, chassisNumber: event.target.value })} />
              <input className="input-dark" value={editingCar.missingPart} onChange={event => setEditingCar({ ...editingCar, missingPart: event.target.value })} />
              <input className="input-dark" value={editingCar.stationNumber} onChange={event => setEditingCar({ ...editingCar, stationNumber: event.target.value })} />
              <select className="input-dark" value={editingCar.criticality} onChange={event => setEditingCar({ ...editingCar, criticality: event.target.value as CriticalityLevel })}>
                <option value="critical">{criticalityLabel.critical}</option>
                <option value="medium">{criticalityLabel.medium}</option>
                <option value="low">{criticalityLabel.low}</option>
              </select>
              <textarea className="input-dark min-h-28 sm:col-span-2" value={editingCar.notes} onChange={event => setEditingCar({ ...editingCar, notes: event.target.value })} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditingCar(null)} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200">إلغاء</button>
              <button onClick={handleSaveEdit} className="rounded-xl bg-orange-500 px-4 py-2 font-black text-slate-950">حفظ التعديل</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
