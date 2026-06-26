import { useEffect, useState } from 'react'
import { ChevronDown, Settings, X } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { useAuth, profileIsAdmin } from '../Context/AuthContext'
import { usePermissions } from '../Context/PermissionsContext'
import { useCanAccessSettings } from '../hooks/useCanAccessSettings'
import { useNavigation } from '../Context/NavigationContext'
import { DEPARTMENTS, departmentAccentClass } from '../config/departments'
import type { DepartmentId, EngineeringPage, ProductionPage } from '../Types/navigation'

type PageChild = { key: string; label: string; onClick: () => void }

type SidebarPage = {
  key: string
  label: string
  visible: boolean
  children?: PageChild[]
  onNavigate: () => void
}

export function AppSidebar() {
  const { t } = useLang()
  const { canViewModule, loading: permsLoading } = usePermissions()
  const { canAccess: canAccessSettings } = useCanAccessSettings()
  const { profile } = useAuth()
  const nav = useNavigation()

  const [expandedDepts, setExpandedDepts] = useState<Set<DepartmentId>>(() => new Set([nav.department]))
  const [expandedPages, setExpandedPages] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    if (!nav.sidebarOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') nav.setSidebarOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [nav.sidebarOpen, nav.setSidebarOpen])

  useEffect(() => {
    if (nav.sidebarOpen) {
      setExpandedDepts(prev => new Set(prev).add(nav.department))
    }
  }, [nav.sidebarOpen, nav.department])

  const canShowEngineeringIpl = canAccessSettings
  const canShowEngineeringStations =
    canAccessSettings || permsLoading || canViewModule('station_operations')
  const canShowLineBalancing = permsLoading || canViewModule('station_operations')

  const go = nav.navigate

  /** Navigate from sidebar; closes the drawer unless `keepSidebarOpen` (parent rows with sub-tabs). */
  function sidebarNav(patch: Parameters<typeof go>[0], keepSidebarOpen = false) {
    go({ ...patch, showProfile: false, closeSidebar: keepSidebarOpen ? false : true })
  }

  const productionPages: SidebarPage[] = [
    {
      key: 'home',
      label: t('nav.home'),
      visible: true,
      onNavigate: () => sidebarNav({ department: 'production', productionPage: 'home' })
    },
    {
      key: 'missing',
      label: t('nav.missingParts'),
      visible: permsLoading || canViewModule('missing_parts'),
      onNavigate: () => sidebarNav({ department: 'production', productionPage: 'missing' })
    },
    {
      key: 'vehicles',
      label: t('nav.productivity'),
      visible: permsLoading || canViewModule('production'),
      onNavigate: () => sidebarNav({ department: 'production', productionPage: 'vehicles' }, true),
      children: [
        {
          key: 'orders',
          label: t('productivity.tabs.orders'),
          onClick: () => sidebarNav({ department: 'production', productionPage: 'vehicles', productivityTab: 'orders' })
        },
        {
          key: 'entry',
          label: t('productivity.tabs.entry'),
          onClick: () => sidebarNav({ department: 'production', productionPage: 'vehicles', productivityTab: 'entry' })
        },
        {
          key: 'exit',
          label: t('productivity.tabs.exit'),
          onClick: () => sidebarNav({ department: 'production', productionPage: 'vehicles', productivityTab: 'exit' })
        },
        {
          key: 'stops',
          label: t('productivity.tabs.stops'),
          onClick: () => sidebarNav({ department: 'production', productionPage: 'vehicles', productivityTab: 'stops' })
        },
        {
          key: 'workDays',
          label: t('productionOrders.tabs.workDays'),
          onClick: () => sidebarNav({ department: 'production', productionPage: 'vehicles', productivityTab: 'workDays' })
        },
        {
          key: 'planOrders',
          label: t('productionOrders.tabs.planOrders'),
          onClick: () =>
            sidebarNav({
              department: 'production',
              productionPage: 'vehicles',
              productivityTab: 'orders',
              productionPlanTab: 'planOrders'
            })
        }
      ]
    },
    {
      key: 'training',
      label: t('nav.training'),
      visible: permsLoading || canViewModule('training_matrix'),
      onNavigate: () => sidebarNav({ department: 'production', productionPage: 'training' }, true),
      children: (
        ['org', 'attendance', 'manpower', 'operations', 'stationSkills', 'matrix', 'qualification', 'expiry'] as const
      ).map(key => ({
        key,
        label: t(`training.tabs.${key}`),
        onClick: () => sidebarNav({ department: 'production', productionPage: 'training', trainingTab: key })
      }))
    },
    {
      key: 'damagedParts',
      label: t('nav.damagedParts'),
      visible: true,
      onNavigate: () => sidebarNav({ department: 'production', productionPage: 'damagedParts' })
    },
    {
      key: 'missions',
      label: t('nav.missions'),
      visible: true,
      onNavigate: () => sidebarNav({ department: 'production', productionPage: 'missions' })
    },
    {
      key: 'requests',
      label: t('nav.requests'),
      visible: true,
      onNavigate: () => sidebarNav({ department: 'production', productionPage: 'requests' })
    },
    {
      key: 'scratches',
      label: t('nav.scratches'),
      visible: true,
      onNavigate: () => sidebarNav({ department: 'production', productionPage: 'scratches' })
    },
    {
      key: 'equipment',
      label: t('nav.equipment'),
      visible: true,
      onNavigate: () => sidebarNav({ department: 'production', productionPage: 'equipment' })
    },
    {
      key: 'feedback',
      label: t('nav.feedback'),
      visible: true,
      onNavigate: () => sidebarNav({ department: 'production', productionPage: 'feedback' })
    }
  ]

  const settingsSidebarPage: SidebarPage = {
    key: 'settings',
    label: t('nav.settings'),
    visible: canAccessSettings,
    onNavigate: () => sidebarNav({ department: 'production', productionPage: 'settings' }, true),
    children: (
      ['models', 'stations', 'colors', 'areas', 'reasons', 'departments', 'users'] as const
    ).map(key => ({
      key,
      label: t(`settings.tabs.${key}`),
      onClick: () => sidebarNav({ department: 'production', productionPage: 'settings', settingsTab: key })
    }))
  }

  const engineeringPages: SidebarPage[] = [
    {
      key: 'home',
      label: t('nav.home'),
      visible: true,
      onNavigate: () => sidebarNav({ department: 'engineering', engineeringPage: 'home' })
    },
    {
      key: 'ipl',
      label: t('nav.ipl'),
      visible: canShowEngineeringIpl,
      onNavigate: () => sidebarNav({ department: 'engineering', engineeringPage: 'ipl' }, true),
      children: (['parts', 'compare', 'categories', 'import', 'dashboard'] as const).map(key => ({
        key,
        label: t(`bom.tabs.${key}`),
        onClick: () => sidebarNav({ department: 'engineering', engineeringPage: 'ipl', bomTab: key })
      }))
    },
    {
      key: 'stations',
      label: t('nav.stations'),
      visible: canShowEngineeringStations,
      onNavigate: () => sidebarNav({ department: 'engineering', engineeringPage: 'stations' })
    },
    {
      key: 'lineBalancing',
      label: t('nav.lineBalancing'),
      visible: canShowLineBalancing,
      onNavigate: () => sidebarNav({ department: 'engineering', engineeringPage: 'lineBalancing' }, true),
      children: (
        ['operations', 'opParts', 'timeStudy', 'routing', 'manpower', 'import'] as const
      ).map(key => ({
        key,
        label: t(`lineBalancing.tabs.${key}`),
        onClick: () => sidebarNav({ department: 'engineering', engineeringPage: 'lineBalancing', lineBalancingTab: key })
      }))
    }
  ]

  function toggleDepartment(deptId: DepartmentId) {
    setExpandedDepts(prev => {
      const next = new Set(prev)
      if (next.has(deptId)) {
        next.delete(deptId)
      } else {
        next.add(deptId)
        nav.selectDepartment(deptId, true)
      }
      return next
    })
  }

  function togglePage(scope: string, page: SidebarPage) {
    const pageId = `${scope}:${page.key}`
    if (page.children?.length) {
      setExpandedPages(prev => {
        const next = new Set(prev)
        if (next.has(pageId)) {
          next.delete(pageId)
        } else {
          next.add(pageId)
          page.onNavigate()
        }
        return next
      })
    } else {
      page.onNavigate()
    }
  }

  function isWarehousesActive(key: string) {
    return !nav.showProfile && nav.department === 'warehouses' && nav.warehousesTab === key
  }

  const warehousesPages: SidebarPage[] = [
    {
      key: 'home',
      label: t('nav.home'),
      visible: true,
      onNavigate: () => sidebarNav({ department: 'warehouses', warehousesTab: 'home' })
    },
    {
      key: 'currentStock',
      label: t('warehouses.tabs.currentStock'),
      visible: true,
      onNavigate: () => sidebarNav({ department: 'warehouses', warehousesTab: 'currentStock' })
    },
    {
      key: 'feeding',
      label: t('warehouses.tabs.feeding'),
      visible: true,
      onNavigate: () => sidebarNav({ department: 'warehouses', warehousesTab: 'feeding' })
    }
  ]

  function isProductionActive(key: string) {
    return !nav.showProfile && nav.department === 'production' && nav.productionPage === key
  }

  function isEngineeringActive(key: string) {
    return !nav.showProfile && nav.department === 'engineering' && nav.engineeringPage === key
  }

  function renderPages(scope: 'production' | 'engineering' | 'warehouses', pages: SidebarPage[], isActive: (key: string) => boolean) {
    return (
      <ul className="mt-1 space-y-0.5 border-s border-slate-700/60 ps-2">
        {pages
          .filter(p => p.visible)
          .map(page => {
            const pageId = `${scope}:${page.key}`
            const pageOpen = expandedPages.has(pageId)
            const hasChildren = Boolean(page.children?.length)
            const active = isActive(page.key)

            return (
              <li key={page.key}>
                <button
                  type="button"
                  onClick={() => togglePage(scope, page)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm font-bold transition ${
                    active ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                  }`}
                >
                  <span>{page.label}</span>
                  {hasChildren && (
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${pageOpen ? 'rotate-180' : ''}`}
                    />
                  )}
                </button>
                {hasChildren && pageOpen && (
                  <ul className="mt-0.5 space-y-0.5 border-s border-slate-800 ps-2">
                    {page.children!.map(child => (
                      <li key={child.key}>
                        <button
                          type="button"
                          onClick={child.onClick}
                          className="w-full rounded-lg px-3 py-1.5 text-start text-xs font-semibold text-slate-500 hover:bg-slate-800/80 hover:text-slate-300"
                        >
                          {child.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
      </ul>
    )
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          nav.sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => nav.setSidebarOpen(false)}
        aria-hidden={!nav.sidebarOpen}
      />

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[min(100vw,20rem)] flex-col border-s border-slate-700/80 bg-slate-950 shadow-2xl transition-transform duration-300 ease-out ${
          nav.sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!nav.sidebarOpen}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cyan-300">{t('sidebar.title')}</p>
            <p className="text-sm text-slate-400">{t('app.title')}</p>
          </div>
          <button
            type="button"
            onClick={() => nav.setSidebarOpen(false)}
            className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <button
            type="button"
            onClick={() => nav.openProfile()}
            className={`mb-4 w-full rounded-xl px-3 py-2.5 text-start text-sm font-bold transition ${
              nav.showProfile ? 'bg-cyan-500/20 text-cyan-100' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            {t('myProfile.title')}
          </button>

          {DEPARTMENTS.map(dept => {
            const Icon = dept.icon
            const deptSelected =
              !nav.showProfile &&
              nav.department === dept.id &&
              !(dept.id === 'production' && nav.productionPage === 'settings')
            const deptOpen = expandedDepts.has(dept.id)
            const isProduction = dept.id === 'production'
            const isEngineering = dept.id === 'engineering'
            const isWarehouses = dept.id === 'warehouses'

            return (
              <div key={dept.id} className="mb-2">
                <button
                  type="button"
                  onClick={() => toggleDepartment(dept.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-black ${departmentAccentClass(dept.accent, deptSelected)}`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0" />
                    {t(`departments.${dept.id}`)}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform ${deptOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {deptOpen && isProduction && renderPages('production', productionPages, isProductionActive)}
                {deptOpen && isEngineering && renderPages('engineering', engineeringPages, isEngineeringActive)}
                {deptOpen && isWarehouses && renderPages('warehouses', warehousesPages, isWarehousesActive)}
                {deptOpen && !isProduction && !isEngineering && !isWarehouses && (
                  <p className="mt-2 px-3 text-xs leading-relaxed text-slate-500">{t('departments.placeholderDesc')}</p>
                )}
              </div>
            )
          })}

          {settingsSidebarPage.visible && (
            <div className="mb-2 border-t border-slate-800 pt-3">
              {renderPages('production', [settingsSidebarPage], isProductionActive)}
            </div>
          )}
        </div>

        {profile && (
          <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-500">
            {profile.full_name || profile.email}
            {profileIsAdmin(profile) ? ` · ${t('permissions.roleCodes.admin')}` : ''}
          </div>
        )}
      </aside>
    </>
  )
}
