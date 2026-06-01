import { AlertTriangle, CheckCircle2, Factory, ShieldAlert } from 'lucide-react'
import { StatCard } from './StatCard'
import { useDelayedCars } from '../Context/DelayedCarsContext'
import { CriticalityBadge, StatusBadge } from './StatusBadge'
import { formatDateTime, getDelayHours } from '../Utils/formatters'

export function Dashboard() {
  const { cars } = useDelayedCars()

  const today = new Date().toDateString()
  const openCars = cars.filter(car => car.status !== 'installed' && car.status !== 'closed')
  const criticalShortage = openCars.filter(car => car.criticality === 'critical')
  const resolvedToday = cars.filter(car => car.resolvedAt && new Date(car.resolvedAt).toDateString() === today)

  const priorityCars = [...openCars].sort((a, b) => {
    const criticalWeight = (carCriticality: string) => (carCriticality === 'critical' ? 3 : carCriticality === 'medium' ? 2 : 1)
    return criticalWeight(b.criticality) - criticalWeight(a.criticality) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title="إجمالي السيارات المتأخرة"
          value={openCars.length}
          subtitle="السيارات المفتوحة داخل خط الإنتاج"
          tone="cyan"
          icon={<Factory className="h-6 w-6" />}
        />
        <StatCard
          title="نواقص حرجة"
          value={criticalShortage.length}
          subtitle="سيارات قد تؤثر على استمرار الخط"
          tone="red"
          icon={<ShieldAlert className="h-6 w-6" />}
        />
        <StatCard
          title="تم حلها اليوم"
          value={resolvedToday.length}
          subtitle="توريد وتركيب أو إغلاق خلال اليوم"
          tone="green"
          icon={<CheckCircle2 className="h-6 w-6" />}
        />
      </div>

      <div className="card-industrial overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-white">أولوية المتابعة الحالية</h2>
            <p className="text-sm text-slate-400">مرتبة حسب الحرجية ووقت التأخير</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-200">
            <AlertTriangle className="h-4 w-4" />
            Critical cars first
          </div>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-2">
          {priorityCars.length === 0 ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-200">
              لا توجد سيارات مفتوحة حالياً.
            </div>
          ) : (
            priorityCars.map(car => (
              <div key={car.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs text-slate-500">{car.stationNumber}</p>
                    <h3 className="text-lg font-black text-white">{car.chassisNumber}</h3>
                    <p className="text-sm text-slate-400">{car.model} • {car.missingPart}</p>
                  </div>
                  <CriticalityBadge level={car.criticality} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <StatusBadge status={car.status} />
                  {car.isDrItem && <span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs font-bold text-purple-200 ring-1 ring-purple-400/30">DR Item</span>}
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">Delay: {getDelayHours(car.createdAt)}h</span>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">Since {formatDateTime(car.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
