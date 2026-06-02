import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Car,
  ClipboardList,
  PlusCircle,
  ShieldCheck,
  ShieldAlert,
  Boxes,
  BarChart3,
  Settings as SettingsIcon
} from 'lucide-react'
import { useVehicles } from '../Context/VehiclesContext'
import { useAuth } from '../Context/AuthContext'
import { useLang } from '../i18n/LanguageContext'
import { StatCard } from '../Components/StatCard'
import { ReportMissingPartModal } from '../Components/ReportMissingPartModal'

type NavTarget = 'missing' | 'vehicles' | 'settings'

type ModuleCard = {
  key: string
  icon: typeof Car
  tone: string
  target?: NavTarget
  soon?: boolean
}

const moduleCards: ModuleCard[] = [
  { key: 'missingParts', icon: AlertTriangle, tone: 'text-red-300 bg-red-500/15', target: 'missing' },
  { key: 'vehicles', icon: Car, tone: 'text-cyan-300 bg-cyan-500/15', target: 'vehicles' },
  { key: 'settings', icon: SettingsIcon, tone: 'text-emerald-300 bg-emerald-500/15', target: 'settings' },
  { key: 'productionOrders', icon: ClipboardList, tone: 'text-amber-300 bg-amber-500/15', soon: true },
  { key: 'inventory', icon: Boxes, tone: 'text-purple-300 bg-purple-500/15', soon: true },
  { key: 'quality', icon: ShieldCheck, tone: 'text-blue-300 bg-blue-500/15', soon: true },
  { key: 'reports', icon: BarChart3, tone: 'text-rose-300 bg-rose-500/15', soon: true }
]

export function HomePage({ onNavigate }: { onNavigate: (page: NavTarget) => void }) {
  const { vehicles, setupRequired } = useVehicles()
  const { hasRole } = useAuth()
  const { t, dir } = useLang()
  const [reportOpen, setReportOpen] = useState(false)

  const canReport = hasRole('admin', 'production', 'warehouse', 'quality')

  const counts = useMemo(() => ({
    total: vehicles.length,
    withMissing: vehicles.filter(v => v.openMissingCount > 0).length,
    blocked: vehicles.filter(v => v.deliveryBlocked).length
  }), [vehicles])

  return (
    <section className="space-y-6">
      <div className="card-industrial flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black text-white sm:text-2xl">{t('home.welcomeTitle')}</h2>
          <p className="mt-1 text-sm text-slate-400">{t('home.welcomeSubtitle')}</p>
        </div>
        {canReport && (
          <button
            onClick={() => setReportOpen(true)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-6 py-4 text-base font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400"
          >
            <PlusCircle className="h-5 w-5" /> {t('home.reportMissing')}
          </button>
        )}
      </div>

      {!setupRequired && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard title={t('home.total')} value={counts.total} subtitle={t('home.totalSub')} tone="cyan" icon={<Car className="h-6 w-6" />} />
          <StatCard title={t('home.withMissing')} value={counts.withMissing} subtitle={t('home.withMissingSub')} tone="orange" icon={<AlertTriangle className="h-6 w-6" />} />
          <StatCard title={t('home.blocked')} value={counts.blocked} subtitle={t('home.blockedSub')} tone="red" icon={<ShieldAlert className="h-6 w-6" />} />
        </div>
      )}

      <div>
        <h3 className="mb-3 px-1 text-sm font-black uppercase tracking-widest text-slate-400">{t('home.modules')}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {moduleCards.map(mod => {
            const Icon = mod.icon
            const clickable = !mod.soon && mod.target
            return (
              <button
                key={mod.key}
                disabled={!clickable}
                onClick={() => clickable && mod.target && onNavigate(mod.target)}
                className={`group flex flex-col items-start gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5 text-start transition ${clickable ? 'hover:border-cyan-400/40 hover:bg-slate-800/70' : 'cursor-not-allowed opacity-60'}`}
              >
                <div className="flex w-full items-center justify-between">
                  <div className={`rounded-xl p-3 ${mod.tone}`}><Icon className="h-6 w-6" /></div>
                  {mod.soon && <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-400">{t('home.soon')}</span>}
                </div>
                <div>
                  <h4 className="text-lg font-black text-white">{t(`modules.${mod.key}`)}</h4>
                  <p className="mt-1 text-sm text-slate-400">{t(`modules.${mod.key}Desc`)}</p>
                </div>
                {clickable && <span className="text-xs font-bold text-slate-500 transition group-hover:text-cyan-300">{dir === 'rtl' ? '←' : '→'}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <ReportMissingPartModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </section>
  )
}
