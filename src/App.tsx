import { useEffect, lazy, Suspense, type ReactNode } from 'react'
import { Database, Languages, LogOut, PanelRightOpen, Settings, UserCircle } from 'lucide-react'
import { AppLogo } from './Components/AppLogo'
import { DeveloperCredit } from './Components/DeveloperCredit'
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
import { LoginPage } from './Pages/shared/LoginPage'
import { MyProfilePage } from './Pages/shared/MyProfilePage'
import { DepartmentPlaceholderPage } from './Pages/shared/DepartmentPlaceholderPage'
import { GlobalHomePage } from './Pages/shared/GlobalHomePage'
import { ProductionAreaPlaceholderPage } from './Pages/production/ProductionAreaPlaceholderPage'
import { useCanAccessSettings } from './hooks/useCanAccessSettings'
import { useCanViewPage } from './hooks/useCanViewPage'
import {
  pagePermForEngineering,
  pagePermForPlanning,
  pagePermForProduction,
  pagePermForQuality,
  canViewAnyWarehousesPage
} from './config/pageAccess'
import { SETTINGS_TAB_ORDER } from './Types/navigation'
import { formatRoleBadge } from './Utils/roleBadge'
import { PwaInstallPrompt } from './Components/PwaInstallPrompt'
import { PwaInstallButton } from './Components/PwaInstallButton'
import { usePresenceHeartbeat } from './hooks/usePresenceHeartbeat'

export type { AppPage as Page, DepartmentId, ProductionPage, EngineeringPage } from './Types/navigation'

const TrainingMatrixPage = lazy(() =>
  import('./Pages/production/TrainingMatrixPage').then(m => ({ default: m.TrainingMatrixPage }))
)
const SettingsPage = lazy(() => import('./Pages/production/SettingsPage').then(m => ({ default: m.SettingsPage })))
const BomPage = lazy(() => import('./Pages/engineering/BomPage').then(m => ({ default: m.BomPage })))
const LineBalancingPage = lazy(() =>
  import('./Pages/engineering/LineBalancingPage').then(m => ({ default: m.LineBalancingPage }))
)
const SopPage = lazy(() => import('./Pages/engineering/SopPage').then(m => ({ default: m.SopPage })))
const ProductivityPage = lazy(() =>
  import('./Pages/production/ProductivityPage').then(m => ({ default: m.ProductivityPage }))
)
const DamagedPartsPage = lazy(() =>
  import('./Pages/production/DamagedPartsPage').then(m => ({ default: m.DamagedPartsPage }))
)
const MissionsPage = lazy(() => import('./Pages/production/MissionsPage').then(m => ({ default: m.MissionsPage })))
const RequestsPage = lazy(() => import('./Pages/production/RequestsPage').then(m => ({ default: m.RequestsPage })))
const ScratchesPage = lazy(() => import('./Pages/production/ScratchesPage').then(m => ({ default: m.ScratchesPage })))
const EquipmentPage = lazy(() => import('./Pages/production/EquipmentPage').then(m => ({ default: m.EquipmentPage })))
const FeedbackPage = lazy(() => import('./Pages/production/FeedbackPage').then(m => ({ default: m.FeedbackPage })))
const PlanningPage = lazy(() => import('./Pages/planning/PlanningPage').then(m => ({ default: m.PlanningPage })))
const QualityPage = lazy(() => import('./Pages/quality/QualityPage').then(m => ({ default: m.QualityPage })))
const HrPage = lazy(() => import('./Pages/hr/HrPage').then(m => ({ default: m.HrPage })))
const EngineeringHomePage = lazy(() =>
  import('./Pages/engineering/EngineeringHomePage').then(m => ({ default: m.EngineeringHomePage }))
)
const WarehousesPage = lazy(() =>
  import('./Pages/warehouses/WarehousesPage').then(m => ({ default: m.WarehousesPage }))
)

function LazyPage({ children }: { children: ReactNode }) {
  const { t } = useLang()
  return (
    <Suspense fallback={<p className="p-8 text-center text-slate-400">{t('common.loading')}</p>}>{children}</Suspense>
  )
}

function Shell() {
  const { configured, loading, session, profile, signOut, displayRole } = useAuth()
  const { canAccess: canAccessSettings } = useCanAccessSettings()
  const { loading: permsLoading, canViewModule, loadError: permsLoadError, reload: reloadPermissions } = usePermissions()
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
      nav.navigate({
        department: 'production',
        productionArea: 'assembly',
        productionPage: 'settings',
        settingsTab: 'stations',
        showGlobalHome: false
      })
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
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-center">
        <p className="max-w-md text-lg font-black leading-relaxed text-cyan-200 sm:text-xl">
          {t('developer.bootLoading')}
        </p>
      </main>
    )
  }

  if (!session) return <LoginPage />

  const navLoading = permsLoading || pagesLoading
  const canShowEngineeringIpl = canAccessSettings || canViewPage(pagePermForEngineering('ipl'))
  const canViewQuality = navLoading || canViewPage(pagePermForQuality())
  const canViewWarehouses = navLoading || canViewAnyWarehousesPage(canViewPage)
  const canViewHr = navLoading || canViewModule('employees')
  const canViewEngineeringHome = navLoading || canViewPage(pagePermForEngineering('home'))

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
              <button
                type="button"
                onClick={() => nav.openGlobalHome()}
                className="flex min-w-0 items-center gap-2 rounded-xl text-start transition hover:opacity-90 sm:gap-3"
                title={t('nav.globalHome')}
              >
                <AppLogo className="p-1.5 sm:p-2" imgClassName="h-8 w-8 sm:h-10 sm:w-10" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300 sm:text-xs">
                    {t('brand')}
                  </p>
                  <h1 className="truncate text-lg font-black text-white sm:text-2xl md:text-3xl">{t('app.title')}</h1>
                </div>
              </button>
            </div>

            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              {canAccessSettings && (
                <button
                  type="button"
                  onClick={() =>
                    nav.navigate({
                      department: 'production',
                      productionArea: 'assembly',
                      productionPage: 'settings',
                      settingsTab: SETTINGS_TAB_ORDER[0],
                      showGlobalHome: false,
                      showProfile: false
                    })
                  }
                  className={`touch-target rounded-xl p-2.5 transition ${
                    !nav.showProfile && nav.productionPage === 'settings'
                      ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/40'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                  title={t('nav.settings')}
                  aria-label={t('nav.settings')}
                >
                  <Settings className="h-5 w-5" />
                </button>
              )}
              <PwaInstallButton />
              <HeaderNotificationsBell />
              <button
                onClick={toggle}
                className="touch-target rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
              >
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
                  {profile?.full_name || profile?.email} · <span className="font-black text-cyan-300">{badgeRole}</span>
                </span>
              </button>
              <button
                onClick={signOut}
                className="touch-target rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
                title={t('common.logout')}
              >
                <LogOut className="h-4 w-4 sm:me-1 sm:inline" />
                <span className="hidden sm:inline">{t('common.logout')}</span>
              </button>
            </div>

            {!nav.showProfile && (
              <div className="w-full border-t border-slate-800/80 pt-3">
                <DeveloperCredit variant="inline" />
              </div>
            )}
          </header>

          <DepartmentTopBar />

          {permsLoadError && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              <p className="font-bold">{t('permissions.loadFailed')}</p>
              <button
                type="button"
                onClick={() => void reloadPermissions()}
                className="rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-black text-slate-950 hover:bg-amber-300"
              >
                {t('permissions.retryLoad')}
              </button>
            </div>
          )}

          {nav.showProfile && <MyProfilePage onBack={() => nav.closeProfile()} />}

          {!nav.showProfile && nav.showGlobalHome && <GlobalHomePage />}

          {!nav.showProfile &&
            !nav.showGlobalHome &&
            nav.department !== 'production' &&
            nav.department !== 'engineering' &&
            nav.department !== 'planning' &&
            nav.department !== 'warehouses' &&
            nav.department !== 'quality' &&
            nav.department !== 'hr' && (
              <DepartmentPlaceholderPage
                department={nav.department}
                onOpenProduction={() => nav.selectDepartment('production')}
              />
            )}

          {!nav.showProfile &&
            !nav.showGlobalHome &&
            nav.department === 'planning' &&
            (navLoading ||
              canViewPage(pagePermForPlanning('plan')) ||
              canViewPage(pagePermForPlanning('workDays')) ||
              canViewPage(pagePermForPlanning('tracking')) ||
              canViewPage(pagePermForPlanning('orders'))) && (
              <LazyPage>
                <PlanningPage />
              </LazyPage>
            )}

          {!nav.showProfile && !nav.showGlobalHome && nav.department === 'warehouses' && canViewWarehouses && (
            <LazyPage>
              <WarehousesPage />
            </LazyPage>
          )}

          {!nav.showProfile && !nav.showGlobalHome && nav.department === 'quality' && canViewQuality && (
            <LazyPage>
              <QualityPage />
            </LazyPage>
          )}

          {!nav.showProfile && !nav.showGlobalHome && nav.department === 'hr' && canViewHr && (
            <LazyPage>
              <HrPage />
            </LazyPage>
          )}

          {!nav.showProfile && !nav.showGlobalHome && nav.department === 'production' && (
            <>
              {nav.productionPage === 'settings' && canViewPage(pagePermForProduction('settings')) && (
                <LazyPage>
                  <SettingsPage />
                </LazyPage>
              )}
              {nav.productionArea !== 'assembly' && nav.productionPage !== 'settings' && (
                <ProductionAreaPlaceholderPage area={nav.productionArea} />
              )}
              {nav.productionArea === 'assembly' && (
                <>
                  {nav.productionPage === 'home' && (navLoading || canViewPage(pagePermForProduction('home'))) && (
                    <HomePage />
                  )}
                  {nav.productionPage === 'missing' &&
                    (navLoading || canViewPage(pagePermForProduction('missing'))) && <MissingPartsPage />}
                  {nav.productionPage === 'vehicles' &&
                    (navLoading || canViewPage(pagePermForProduction('vehicles'))) && (
                      <LazyPage>
                        <ProductivityPage />
                      </LazyPage>
                    )}
                  {nav.productionPage === 'training' &&
                    (navLoading || canViewPage(pagePermForProduction('training'))) && (
                      <LazyPage>
                        <TrainingMatrixPage />
                      </LazyPage>
                    )}
                  {nav.productionPage === 'damagedParts' &&
                    (navLoading || canViewPage(pagePermForProduction('damagedParts'))) && (
                      <LazyPage>
                        <DamagedPartsPage />
                      </LazyPage>
                    )}
                  {nav.productionPage === 'missions' &&
                    (navLoading || canViewPage(pagePermForProduction('missions'))) && (
                      <LazyPage>
                        <MissionsPage />
                      </LazyPage>
                    )}
                  {nav.productionPage === 'requests' &&
                    (navLoading || canViewPage(pagePermForProduction('requests'))) && (
                      <LazyPage>
                        <RequestsPage />
                      </LazyPage>
                    )}
                  {nav.productionPage === 'scratches' &&
                    (navLoading || canViewPage(pagePermForProduction('scratches'))) && (
                      <LazyPage>
                        <ScratchesPage />
                      </LazyPage>
                    )}
                  {nav.productionPage === 'equipment' &&
                    (navLoading || canViewPage(pagePermForProduction('equipment'))) && (
                      <LazyPage>
                        <EquipmentPage />
                      </LazyPage>
                    )}
                  {nav.productionPage === 'feedback' &&
                    (navLoading || canViewPage(pagePermForProduction('feedback'))) && (
                      <LazyPage>
                        <FeedbackPage />
                      </LazyPage>
                    )}
                </>
              )}
            </>
          )}

          {!nav.showProfile && !nav.showGlobalHome && nav.department === 'engineering' && (
            <>
              {nav.engineeringPage === 'home' && canViewEngineeringHome && (
                <LazyPage>
                  <EngineeringHomePage />
                </LazyPage>
              )}
              {nav.engineeringPage === 'ipl' && canShowEngineeringIpl && (
                <LazyPage>
                  <BomPage />
                </LazyPage>
              )}
              {nav.engineeringPage === 'lineBalancing' &&
                (navLoading || canViewPage(pagePermForEngineering('lineBalancing'))) && (
                  <LazyPage>
                    <LineBalancingPage />
                  </LazyPage>
                )}
              {nav.engineeringPage === 'sop' && (navLoading || canViewPage(pagePermForEngineering('sop'))) && (
                <LazyPage>
                  <SopPage />
                </LazyPage>
              )}
              {nav.engineeringPage === 'ipl' && !canShowEngineeringIpl && (
                <DepartmentPlaceholderPage
                  department="engineering"
                  onOpenProduction={() => nav.selectDepartment('production')}
                />
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
