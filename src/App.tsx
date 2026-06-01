import { Activity, Database, MonitorCog } from 'lucide-react'
import { DelayedCarsProvider } from './Context/DelayedCarsContext'
import { Dashboard } from './Components/Dashboard'
import { DelayedCarForm } from './Components/DelayedCarForm'
import { TrackingGrid } from './Components/TrackingGrid'

function App() {
  return (
    <DelayedCarsProvider>
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_35%),linear-gradient(135deg,_#020617,_#0f172a_45%,_#111827)] px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex flex-col gap-4 rounded-3xl border border-slate-700/70 bg-slate-950/60 p-5 shadow-2xl shadow-black/20 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-cyan-500 p-3 text-slate-950 shadow-lg shadow-cyan-500/20">
                <MonitorCog className="h-8 w-8" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">Assembly Line</p>
                <h1 className="text-2xl font-black text-white md:text-4xl">Tracking System</h1>
                <p className="mt-1 text-sm text-slate-400">متابعة السيارات المتأخرة والنواقص داخل خط إنتاج السيارات</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 sm:flex">
              <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
                <Activity className="mr-1 inline h-4 w-4 text-emerald-300" /> Live Local State
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
                <Database className="mr-1 inline h-4 w-4 text-cyan-300" /> Backend Ready
              </div>
            </div>
          </header>

          <Dashboard />
          <DelayedCarForm />
          <TrackingGrid />
        </div>
      </main>
    </DelayedCarsProvider>
  )
}

export default App
