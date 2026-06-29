import { useEffect } from 'react'
import {
  Database,
  Languages,
  LogOut,
  MonitorCog,
  PanelRightOpen,
  UserCircle
} from 'lucide-react'
import { AuthProvider, profileIsAdmin, useAuth } from './Context/AuthContext'
import { PermissionsProvider, usePermissions } from './Context/PermissionsContext'
import { NavigationProvider, useNavigation } from './Context/NavigationContext'
import { VehiclesProvider } from './Context/VehiclesContext'
import { LanguageProvider, useLang } from './i18n/LanguageContext'
import { AppSidebar } from './Components/AppSidebar'
import { DepartmentTopBar } from './Components/layout/DepartmentTopBar'
import { HeaderNotificationsBell } from './Components/layout/HeaderNotificationsBell'
import { HomePage } from './Pages/production/HomePage'
import { MissingPartsPage } from './Pages/production/MissingPartsPage'
import { TrainingMatrixPage } from './Pages/production/TrainingMatrixPage'
import { SettingsPage } from './Pages/production/SettingsPage'
import { BomPage } from './Pages/engineering/BomPage'
import { LineBalancingPage } from './Pages/engineering/LineBalancingPage'
import { SopPage } from './Pages/engineering/SopPage'
import { ProductivityPage } from './Pages/production/ProductivityPage'
import { DamagedPartsPage } from './Pages/production/DamagedPartsPage'
import { MissionsPage } from './Pages/production/MissionsPage'
import { RequestsPage } from './Pages/production/RequestsPage'
import { ScratchesPage } from './Pages/production/ScratchesPage'
import { EquipmentPage } from './Pages/production/EquipmentPage'
import { FeedbackPage } from './Pages/production/FeedbackPage'
import { WorkerProfilePage } from './Pages/production/WorkerProfilePage'
import { ProductionAreaPlaceholderPage } from './Pages/production/ProductionAreaPlaceholderPage'
import { GlobalHomePage } from './Pages/shared/GlobalHomePage'
import { LoginPage } from './Pages/shared/LoginPage'
import { MyProfilePage } from './Pages/shared/MyProfilePage'
import { DepartmentPlaceholderPage } from './Pages/shared/DepartmentPlaceholderPage'
import { QualityPage } from './Pages/quality/QualityPage'
import { HrPage } from './Pages/hr/HrPage'
import { EngineeringHomePage } from './Pages/engineering/EngineeringHomePage'
import { WarehousesPage } from './Pages/warehouses/WarehousesPage'
import { useCanAccessSettings } from './hooks/useCanAccessSettings'
import { useCanViewPage } from './hooks/useCanViewPage'
import { pagePermForEngineering, pagePermForProduction } from './config/pageAccess'
import { formatRoleBadge } from './Utils/roleBadge'
import { PwaInstallPrompt } from './Components/PwaInstallPrompt'
import { usePresenceHeartbeat } from './hooks/usePresenceHeartbeat'

export type { AppPage as Page, DepartmentId, ProductionPage, EngineeringPage } from './Types/navigation'

function Shell() {
  const { configured, loading, session, profile, signOut, displayRole } = useAuth()
  const { canAccess: canAccessSettings } = useCanAccessSettings()
  const { loading: permsLoading } = usePermissions()
  const { canViewPage, loading: pagesLoading } = useCanViewPage()
  const { t, lang, toggle } = useLang()
  const nav = useNavigation()

  usePresenceHeartbeat(Boolean(session))

  let badgeRole = formatRoleBadge(profile, displayRole, t)
  if (profileIsAdmin(profile) && badgeRole === t('permissions.roleCodes.viewer')) {
    badgeRole = t('permissions.roleCodes.admin')
  }

  useEffect(() => {
    if (!canAccessSettings && nav.productionPage === 'settings') {
      nav.setProductionPage('home')
    }
  }, [canAccessSettings, nav.productionPage, nav.setProductionPage])

  useEffect(() => {
    if (nav.department === 'engineering' && nav.engineeringPage === 'stations') {
      nav.navigate({ department: 'production', productionArea: 'assembly', productionPage: 'settings', settingsTab: 'stations', showGlobalHome: false })
    }
  }, [nav.department, nav.engineeringPage, nav.navigate])

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

  const navLoading = permsLoading || pagesLoading
  const canShowEngineeringIpl = canAccessSettings || canViewPage(pagePermForEngineering('ipl'))

  return (
    <VehiclesProvider>
      <AppSidebar />
      <main className="min-h-screen min-h-[100dvh] overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_35%),linear-gradient(135deg,_#020617,_#0f172a_45%,_#111827)] px-2 py-3 text-slate-100 sm:px-6 sm:py-6 lg:px-8 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-7xl space-y-3 sm:space-y-5">
          <header className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-700/70 bg-slate-950/60 p-3 shadow-2xl shadow-black/20 sm:gap-3 sm:rounded-3xl sm:p-5">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => nav.setSidebarOpen(true)}
                className="shrink-0 rounded-xl bg-violet-600 p-2.5 text-white shadow-lg shadow-violet-900/30 hover:bg-violet-500 sm:px-3"
                aria-label={t('sidebar.openMenu')}
              >
                <PanelRightOpen className="h-5 w-5" />
              </button>
              <div className="rounded-2xl bg-cyan-500 p-2.5 text-slate-950 shadow-lg shadow-cyan-500/20 sm:p-3">
                <MonitorCog className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300 sm:text-xs">{t('brand')}</p>
                <h1 className="truncate text-lg font-black text-white sm:text-2xl md:text-3xl">{t('app.title')}</h1>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              <HeaderNotificationsBell />
              <button onClick={toggle} className="touch-target rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700">
                <Languages className="inline h-4 w-4 sm:me-1" /> <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
              </button>
              <button
                type="button"
                onClick={() => nav.openProfile()}
                className={`touch-target flex max-w-[min(100%,12rem)] items-center gap-2 rounded-xl border px-2 py-2 text-xs transition sm:max-w-[min(100%,20rem)] sm:px-3 ${
                  nav.showProfile
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
                <span className="hidden truncate text-start sm:inline">
                  {profile?.full_name || profile?.email} ·{' '}
                  <span className="font-black text-cyan-300">{badgeRole}</span>
                </span>
              </button>
              <button onClick={signOut} className="touch-target rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700" title={t('common.logout')}>
                <LogOut className="h-4 w-4 sm:me-1 sm:inline" />
                <span className="hidden sm:inline">{t('common.logout')}</span>
              </button>
            </div>
          </header>

          <DepartmentTopBar />

          {nav.showProfile && <MyProfilePage onBack={() => nav.closeProfile()} />}

          {!nav.showProfile && nav.showGlobalHome && <GlobalHomePage />}

          {!nav.showProfile && !nav.showGlobalHome && nav.department !== 'production' && nav.department !== 'engineering' && nav.department !== 'warehouses' && nav.department !== 'quality' && nav.department !== 'hr' && (
            <DepartmentPlaceholderPage
              department={nav.department}
              onOpenProduction={() => nav.selectDepartment('production')}
            />
          )}

          {!nav.showProfile && !nav.showGlobalHome && nav.department === 'warehouses' && <WarehousesPage />}

          {!nav.showProfile && !nav.showGlobalHome && nav.department === 'quality' && <QualityPage />}

          {!nav.showProfile && !nav.showGlobalHome && nav.department === 'hr' && <HrPage />}

          {!nav.showProfile && !nav.showGlobalHome && nav.department === 'production' && (
            <>
              {nav.productionPage === 'settings' && canViewPage(pagePermForProduction('settings')) && <SettingsPage />}
              {nav.productionArea !== 'assembly' && nav.productionPage !== 'settings' && (
                <ProductionAreaPlaceholderPage area={nav.productionArea} />
              )}
              {nav.productionArea === 'assembly' && (
                <>
                  {nav.productionPage === 'home' && (navLoading || canViewPage(pagePermForProduction('home'))) && <HomePage />}
                  {nav.productionPage === 'missing' && (navLoading || canViewPage(pagePermForProduction('missing'))) && <MissingPartsPage />}
                  {nav.productionPage === 'vehicles' && (navLoading || canViewPage(pagePermForProduction('vehicles'))) && <ProductivityPage />}
                  {nav.productionPage === 'training' && (navLoading || canViewPage(pagePermForProduction('training'))) && <TrainingMatrixPage />}
                  {nav.productionPage === 'damagedParts' && (navLoading || canViewPage(pagePermForProduction('damagedParts'))) && <DamagedPartsPage />}
                  {nav.productionPage === 'missions' && (navLoading || canViewPage(pagePermForProduction('missions'))) && <MissionsPage />}
                  {nav.productionPage === 'requests' && (navLoading || canViewPage(pagePermForProduction('requests'))) && <RequestsPage />}
                  {nav.productionPage === 'scratches' && (navLoading || canViewPage(pagePermForProduction('scratches'))) && <ScratchesPage />}
                  {nav.productionPage === 'equipment' && (navLoading || canViewPage(pagePermForProduction('equipment'))) && <EquipmentPage />}
                  {nav.productionPage === 'feedback' && (navLoading || canViewPage(pagePermForProduction('feedback'))) && <FeedbackPage />}
                  {nav.productionPage === 'workerProfile' && (navLoading || canViewPage(pagePermForProduction('workerProfile'))) && <WorkerProfilePage />}
                </>
              )}
            </>
          )}

          {!nav.showProfile && !nav.showGlobalHome && nav.department === 'engineering' && (
            <>
              {nav.engineeringPage === 'home' && <EngineeringHomePage />}
              {nav.engineeringPage === 'ipl' && canShowEngineeringIpl && <BomPage />}
              {nav.engineeringPage === 'lineBalancing' && (navLoading || canViewPage(pagePermForEngineering('lineBalancing'))) && <LineBalancingPage />}
              {nav.engineeringPage === 'sop' && (navLoading || canViewPage(pagePermForEngineering('sop'))) && <SopPage />}
              {nav.engineeringPage === 'ipl' && !canShowEngineeringIpl && (
                <DepartmentPlaceholderPage department="engineering" onOpenProduction={() => nav.selectDepartment('production')} />
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
          <NavigationProvider>
            <Shell />
          </NavigationProvider>
        </PermissionsProvider>
      </AuthProvider>
      <PwaInstallPrompt />
    </LanguageProvider>
  )
}

export default App
