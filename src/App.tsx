import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Car,
  Database,
  GraduationCap,
  Home,
  Languages,
  Layers,
  ListTodo,
  LogOut,
  MapPin,
  MonitorCog,
  PackageX,
  ScanLine,
  Scale,
  Settings,
  UserCircle
} from 'lucide-react'
import { AuthProvider, profileIsAdmin, useAuth } from './Context/AuthContext'
import { PermissionsProvider, usePermissions } from './Context/PermissionsContext'
import { VehiclesProvider } from './Context/VehiclesContext'
import { LanguageProvider, useLang } from './i18n/LanguageContext'
import { HomePage } from './Pages/HomePage'
import { MissingPartsPage } from './Pages/MissingPartsPage'
import { TrainingMatrixPage } from './Pages/TrainingMatrixPage'
import { SettingsPage } from './Pages/SettingsPage'
import { BomPage } from './Pages/BomPage'
import { LineBalancingPage } from './Pages/LineBalancingPage'
import { StationsPage } from './Pages/StationsPage'
import { ProductivityPage } from './Pages/ProductivityPage'
import { DamagedPartsPage, MissionsPage, ScratchesPage } from './Pages/ProductionModulePages'
import { LoginPage } from './Pages/LoginPage'
import { MyProfilePage } from './Pages/MyProfilePage'
import { DepartmentPlaceholderPage } from './Pages/DepartmentPlaceholderPage'
import { useCanAccessSettings } from './hooks/useCanAccessSettings'
import { formatRoleBadge } from './Utils/roleBadge'
import { DEPARTMENTS, departmentAccentClass } from './config/departments'
import type { AppPage, DepartmentId, EngineeringPage, ProductionPage } from './Types/navigation'

export type { AppPage as Page, DepartmentId, ProductionPage, EngineeringPage }

const NAV_PERMISSIONS: Partial<Record<ProductionPage, string>> = {
  missing: 'missing_parts',
  vehicles: 'production',
  training: 'training_matrix'
}

const ENGINEERING_NAV_PERMISSIONS: Partial<Record<EngineeringPage, string>> = {
  stations: 'station_operations',
  lineBalancing: 'station_operations'
}

function Shell() {
  const { configured, loading, session, profile, signOut, displayRole } = useAuth()
  const { canViewModule, loading: permsLoading } = usePermissions()
  const { canAccess: canAccessSettings } = useCanAccessSettings()
  const { t, lang, toggle } = useLang()
  let badgeRole = formatRoleBadge(profile, displayRole, t)
  if (profileIsAdmin(profile) && badgeRole === t('permissions.roleCodes.viewer')) {
    badgeRole = t('permissions.roleCodes.admin')
  }
  const [department, setDepartment] = useState<DepartmentId>('production')
  const [page, setPage] = useState<ProductionPage | 'profile'>('home')
  const [engineeringPage, setEngineeringPage] = useState<EngineeringPage>('ipl')

  useEffect(() => {
    if (!canAccessSettings && page === 'settings') setPage('home')
  }, [canAccessSettings, page])

  function selectDepartment(next: DepartmentId) {
    setDepartment(next)
    if (next === 'production') setPage('home')
    if (next === 'engineering') setEngineeringPage('ipl')
  }

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

  const allNavItems: { key: ProductionPage; label: string; icon: typeof Home }[] = [
    { key: 'home', label: t('nav.home'), icon: Home },
    { key: 'missing', label: t('nav.missingParts'), icon: AlertTriangle },
    { key: 'vehicles', label: t('nav.productivity'), icon: Car },
    { key: 'training', label: t('nav.training'), icon: GraduationCap },
    { key: 'damagedParts', label: t('nav.damagedParts'), icon: PackageX },
    { key: 'missions', label: t('nav.missions'), icon: ListTodo },
    { key: 'scratches', label: t('nav.scratches'), icon: ScanLine },
    { key: 'settings', label: t('nav.settings'), icon: Settings }
  ]
  const navItems = allNavItems.filter(item => {
    if (item.key === 'home') return true
    if (item.key === 'settings') return canAccessSettings
    const mod = NAV_PERMISSIONS[item.key]
    if (!mod || permsLoading) return true
    return canViewModule(mod)
  })

  const engineeringNavItems: { key: EngineeringPage; label: string; icon: typeof Layers }[] = [
    { key: 'ipl', label: t('nav.ipl'), icon: Layers },
    { key: 'stations', label: t('nav.stations'), icon: MapPin },
    { key: 'lineBalancing', label: t('nav.lineBalancing'), icon: Scale }
  ]
  const visibleEngineeringNav = engineeringNavItems.filter(item => {
    if (item.key === 'ipl') return canAccessSettings
    if (item.key === 'stations') return canAccessSettings || (permsLoading ? true : canViewModule('station_operations'))
    const mod = ENGINEERING_NAV_PERMISSIONS[item.key]
    if (!mod || permsLoading) return true
    return canViewModule(mod)
  })

  const canShowEngineeringIpl = canAccessSettings
  const canShowEngineeringStations =
    canAccessSettings || permsLoading || canViewModule('station_operations')

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
                <button
                  type="button"
                  onClick={() => setPage('profile')}
                  className={`flex max-w-[min(100%,20rem)] items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${
                    page === 'profile'
                      ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-100'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
                  }`}
                  title={t('myProfile.title')}
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <UserCircle className="h-8 w-8 shrink-0 text-slate-500" />
                  )}
                  <span className="truncate text-start">
                    {profile?.full_name || profile?.email} ·{' '}
                    <span className="font-black text-cyan-300">{badgeRole}</span>
                  </span>
                </button>
                <button onClick={signOut} className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700">
                  <LogOut className="mr-1 inline h-4 w-4" /> {t('common.logout')}
                </button>
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-800/80 pt-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('departments.sectionLabel')}</p>
              <nav className="flex flex-wrap gap-2">
                {DEPARTMENTS.map(item => {
                  const Icon = item.icon
                  const active = department === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectDepartment(item.id)}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-black sm:px-4 ${departmentAccentClass(item.accent, active)}`}
                    >
                      <Icon className="h-4 w-4" /> {t(`departments.${item.id}`)}
                    </button>
                  )
                })}
              </nav>
            </div>

            {department === 'production' && (
              <div className="space-y-2 border-t border-slate-800/80 pt-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('departments.productionTabs')}</p>
                <nav className="flex flex-wrap gap-2">
                  {navItems.map(item => {
                    const Icon = item.icon
                    const active = page !== 'profile' && page === item.key
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setPage(item.key)}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-black sm:px-4 ${active ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                      >
                        <Icon className="h-4 w-4" /> {item.label}
                      </button>
                    )
                  })}
                </nav>
              </div>
            )}
            {department === 'engineering' && visibleEngineeringNav.length > 0 && (
              <div className="space-y-2 border-t border-slate-800/80 pt-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('departments.engineeringTabs')}</p>
                <nav className="flex flex-wrap gap-2">
                  {visibleEngineeringNav.map(item => {
                    const Icon = item.icon
                    const active = engineeringPage === item.key
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setEngineeringPage(item.key)}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-black sm:px-4 ${active ? 'bg-orange-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                      >
                        <Icon className="h-4 w-4" /> {item.label}
                      </button>
                    )
                  })}
                </nav>
              </div>
            )}
          </header>

          {page === 'profile' && <MyProfilePage onBack={() => setPage('home')} />}

          {page !== 'profile' && department !== 'production' && department !== 'engineering' && (
            <DepartmentPlaceholderPage department={department} onOpenProduction={() => selectDepartment('production')} />
          )}

          {page !== 'profile' && department === 'production' && (
            <>
              {page === 'home' && <HomePage onNavigate={setPage} />}
              {page === 'missing' && <MissingPartsPage />}
              {page === 'vehicles' && <ProductivityPage />}
              {page === 'training' && <TrainingMatrixPage />}
              {page === 'damagedParts' && <DamagedPartsPage />}
              {page === 'missions' && <MissionsPage />}
              {page === 'scratches' && <ScratchesPage />}
              {page === 'settings' && canAccessSettings && <SettingsPage />}
            </>
          )}

          {page !== 'profile' && department === 'engineering' && (
            <>
              {engineeringPage === 'ipl' && canShowEngineeringIpl && <BomPage />}
              {engineeringPage === 'stations' && canShowEngineeringStations && <StationsPage />}
              {engineeringPage === 'lineBalancing' && <LineBalancingPage />}
              {engineeringPage === 'ipl' && !canShowEngineeringIpl && (
                <DepartmentPlaceholderPage department="engineering" onOpenProduction={() => selectDepartment('production')} />
              )}
              {engineeringPage === 'stations' && !canShowEngineeringStations && (
                <DepartmentPlaceholderPage department="engineering" onOpenProduction={() => selectDepartment('production')} />
              )}
            </>
          )}
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
