import { useState } from 'react'
import { AlertTriangle, Car, Database, GraduationCap, Home, Languages, Layers, LogOut, MonitorCog, Settings, Users } from 'lucide-react'
import { AuthProvider, useAuth } from './Context/AuthContext'
import { PermissionsProvider, usePermissions } from './Context/PermissionsContext'
import { VehiclesProvider } from './Context/VehiclesContext'
import { LanguageProvider, useLang } from './i18n/LanguageContext'
import { HomePage } from './Pages/HomePage'
import { MissingPartsPage } from './Pages/MissingPartsPage'
import { VehiclesPage } from './Pages/VehiclesPage'
import { OrgStructurePage } from './Pages/OrgStructurePage'
import { TrainingMatrixPage } from './Pages/TrainingMatrixPage'
import { SettingsPage } from './Pages/SettingsPage'
import { BomPage } from './Pages/BomPage'
import { LoginPage } from './Pages/LoginPage'

export type Page = 'home' | 'missing' | 'vehicles' | 'org' | 'training' | 'bom' | 'settings'

const NAV_PERMISSIONS: Partial<Record<Page, string>> = {
  missing: 'missing_parts',
  vehicles: 'production',
  org: 'organizational_structure',
  training: 'training_matrix',
  bom: 'bom',
  settings: 'settings'
}

function Shell() {
  const { configured, loading, session, profile, role, signOut } = useAuth()
  const { canViewModule, loading: permsLoading } = usePermissions()
  const { t, lang, toggle } = useLang()
  const [page, setPage] = useState<Page>('home')

  if (!configured) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-slate-100">
        <div className="max-w-md card-industrial p-8 text-center">
          <Database className="mx-auto mb-3 h-8 w-8 text-cyan-300" />
          <h1 className="text-lg font-black text-white">Supabase</h1>
          <p className="mt-2 text-sm text-slate-400">
            Add <code className="text-cyan-300">VITE_SUPABASE_URL</code> and
            <code className="text-cyan-300"> VITE_SUPABASE_ANON_KEY</code> to your .env file, then restart.
          </p>
        </div>
      </main>
    )
  }

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-300">{t('common.loading')}</main>
  }

  if (!session) return <LoginPage />

  const allNavItems: { key: Page; label: string; icon: typeof Home }[] = [
    { key: 'home', label: t('nav.home'), icon: Home },
    { key: 'missing', label: t('nav.missingParts'), icon: AlertTriangle },
    { key: 'vehicles', label: t('nav.vehicles'), icon: Car },
    { key: 'org', label: t('nav.org'), icon: Users },
    { key: 'training', label: t('nav.training'), icon: GraduationCap },
    { key: 'bom', label: t('nav.bom'), icon: Layers },
    { key: 'settings', label: t('nav.settings'), icon: Settings }
  ]
  const navItems = allNavItems.filter(item => {
    if (item.key === 'home') return true
    const mod = NAV_PERMISSIONS[item.key]
    if (!mod || permsLoading) return true
    return canViewModule(mod)
  })

  return (
    <VehiclesProvider>
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_35%),linear-gradient(135deg,_#020617,_#0f172a_45%,_#111827)] px-3 py-4 text-slate-100 sm:px-6 sm:py-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <header className="flex flex-col gap-4 rounded-3xl border border-slate-700/70 bg-slate-950/60 p-4 shadow-2xl shadow-black/20 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-cyan-500 p-2.5 text-slate-950 shadow-lg shadow-cyan-500/20 sm:p-3">
                  <MonitorCog className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300 sm:text-xs">{t('brand')}</p>
                  <h1 className="text-lg font-black text-white sm:text-2xl md:text-3xl">{t('app.title')}</h1>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button onClick={toggle} className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700">
                  <Languages className="mr-1 inline h-4 w-4" /> {lang === 'ar' ? 'EN' : 'عربي'}
                </button>
                <span className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300">
                  {profile?.full_name || profile?.email} · <span className="font-black text-cyan-300">{role}</span>
                </span>
                <button onClick={signOut} className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700">
                  <LogOut className="mr-1 inline h-4 w-4" /> {t('common.logout')}
                </button>
              </div>
            </div>

            <nav className="flex flex-wrap gap-2">
              {navItems.map(item => {
                const Icon = item.icon
                return (
                  <button
                    key={item.key}
                    onClick={() => setPage(item.key)}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-black sm:px-4 ${page === item.key ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                  >
                    <Icon className="h-4 w-4" /> {item.label}
                  </button>
                )
              })}
            </nav>
          </header>

          {page === 'home' && <HomePage onNavigate={setPage} />}
          {page === 'missing' && <MissingPartsPage />}
          {page === 'vehicles' && <VehiclesPage />}
          {page === 'org' && <OrgStructurePage />}
          {page === 'training' && <TrainingMatrixPage />}
          {page === 'bom' && <BomPage />}
          {page === 'settings' && <SettingsPage />}
        </div>
      </main>
    </VehiclesProvider>
  )
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <PermissionsProvider>
          <Shell />
        </PermissionsProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
