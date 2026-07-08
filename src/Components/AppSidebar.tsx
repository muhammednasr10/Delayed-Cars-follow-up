import { useEffect, useState } from 'react'
import {
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Home,
  LayoutGrid,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  Boxes,
  X
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { useAuth, profileIsAdmin } from '../Context/AuthContext'
import { usePermissions } from '../Context/PermissionsContext'
import { useCanAccessSettings } from '../hooks/useCanAccessSettings'
import { useCanViewPage } from '../hooks/useCanViewPage'
import {
  pagePermForEngineering,
  pagePermForPlanning,
  pagePermForProduction,
  pagePermForWarehouses
} from '../config/pageAccess'
import { useNavigation } from '../Context/NavigationContext'
import { DEPARTMENTS, departmentAccentClass } from '../config/departments'
import { DeveloperCredit } from './DeveloperCredit'
import type { DepartmentId, EngineeringPage, ProductionPage } from '../Types/navigation'
import { SETTINGS_TAB_ORDER, PRODUCTION_AREA_ORDER, BOM_TAB_ORDER, bomTabPermissionKey } from '../Types/navigation'

type PageChild = { key: string; label: string; onClick: () => void; visible?: boolean }

type SidebarPage = {
  key: string
  label: string
  visible: boolean
  icon?: LucideIcon
  children?: PageChild[]
  onNavigate: () => void
}

export function AppSidebar() {
  const { t } = useLang()
  const { loading: permsLoading } = usePermissions()
  const { canAccess: canAccessSettings } = useCanAccessSettings()
  const { canViewPage, loading: pagesLoading } = useCanViewPage()
  const { profile } = useAuth()
  const nav = useNavigation()

  /** البنود مقفولة افتراضياً — المستخدم يفتح ما يحتاجه */
  const [expandedDepts, setExpandedDepts] = useState<Set<DepartmentId>>(() => new Set())
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

  const navLoading = permsLoading || pagesLoading

  const canShowEngineeringIpl = canAccessSettings || canViewPage(pagePermForEngineering('ipl'))
  const canShowLineBalancing = navLoading || canViewPage(pagePermForEngineering('lineBalancing'))
  const canShowSop = navLoading || canViewPage(pagePermForEngineering('sop'))

  const go = nav.navigate

  /** Navigate from sidebar; closes the drawer unless `keepSidebarOpen` (parent rows with sub-tabs). */
  function sidebarNav(patch: Parameters<typeof go>[0], keepSidebarOpen = false) {
    go({ ...patch, showProfile: false, closeSidebar: keepSidebarOpen ? false : true })
  }

  const productionAreaPages: SidebarPage[] = PRODUCTION_AREA_ORDER.map(key => ({
    key,
    label: t(`departments.productionArea.${key}`),
    visible: true,
    onNavigate: () =>
      sidebarNav({
        department: 'production',
        productionArea: key,
        ...(key === 'assembly' ? { productionPage: 'home' } : {})
      })
  }))

  const productionPages: SidebarPage[] = [
    {
      key: 'home',
      label: t('nav.home'),
      visible: navLoading || canViewPage(pagePermForProduction('home')),
      onNavigate: () => sidebarNav({ department: 'production', productionArea: 'assembly', productionPage: 'home' })
    },
    {
      key: 'missing',
      label: t('nav.missingParts'),
      visible: navLoading || canViewPage(pagePermForProduction('missing')),
      onNavigate: () => sidebarNav({ department: 'production', productionArea: 'assembly', productionPage: 'missing' })
    },
    {
      key: 'vehicles',
      label: t('nav.productivity'),
      visible: navLoading || canViewPage(pagePermForProduction('vehicles')),
      onNavigate: () => sidebarNav({ department: 'production', productionArea: 'assembly', productionPage: 'vehicles' }, true),
      children: [
        {
          key: 'productivity',
          label: t('productivity.tabs.productivity'),
          onClick: () =>
            sidebarNav({
              department: 'production',
              productionArea: 'assembly',
              productionPage: 'vehicles',
              productivityTab: 'productivity'
            })
        },
        {
          key: 'stops',
          label: t('productivity.tabs.stops'),
          onClick: () =>
            sidebarNav({
              department: 'production',
              productionArea: 'assembly',
              productionPage: 'vehicles',
              productivityTab: 'stops'
            })
        }
      ]
    },
      {
        key: 'training',
        label: t('nav.training'),
        visible: navLoading || canViewPage(pagePermForProduction('training')),
        onNavigate: () => sidebarNav({ department: 'production', productionArea: 'assembly', productionPage: 'training' }, true),
        children: (
          ['org', 'attendance', 'manpower', 'operations', 'stationSkills', 'matrix', 'qualification', 'expiry'] as const
        ).map(key => ({
          key,
          label: t(`training.tabs.${key}`),
          onClick: () => sidebarNav({ department: 'production', productionArea: 'assembly', productionPage: 'training', trainingTab: key })
        }))
      },
      {
        key: 'damagedParts',
      label: t('nav.damagedParts'),
      visible: navLoading || canViewPage(pagePermForProduction('damagedParts')),
      onNavigate: () => sidebarNav({ department: 'production', productionArea: 'assembly', productionPage: 'damagedParts' })
    },
    {
      key: 'missions',
      label: t('nav.missions'),
      visible: navLoading || canViewPage(pagePermForProduction('missions')),
      onNavigate: () => sidebarNav({ department: 'production', productionArea: 'assembly', productionPage: 'missions' })
    },
    {
      key: 'scratches',
      label: t('nav.scratches'),
      visible: navLoading || canViewPage(pagePermForProduction('scratches')),
      onNavigate: () => sidebarNav({ department: 'production', productionArea: 'assembly', productionPage: 'scratches' })
    },
    {
      key: 'equipment',
      label: t('nav.equipment'),
      visible: navLoading || canViewPage(pagePermForProduction('equipment')),
      onNavigate: () => sidebarNav({ department: 'production', productionArea: 'assembly', productionPage: 'equipment' })
    },
      {
        key: 'feedback',
        label: t('nav.feedback'),
        visible: navLoading || canViewPage(pagePermForProduction('feedback')),
        onNavigate: () => sidebarNav({ department: 'production', productionArea: 'assembly', productionPage: 'feedback' })
      }
    ]

  const settingsSidebarPage: SidebarPage = {
    key: 'settings',
    label: t('nav.settings'),
    visible: canAccessSettings,
    onNavigate: () =>
      sidebarNav({
        department: 'production',
        productionArea: 'assembly',
        productionPage: 'settings',
        settingsTab: SETTINGS_TAB_ORDER[0],
        showGlobalHome: false
      })
  }

  const planningPages: SidebarPage[] = [
    {
      key: 'plan',
      label: t('productionOrders.title'),
      visible: navLoading || canViewPage(pagePermForPlanning('plan')),
      onNavigate: () => sidebarNav({ department: 'planning', planningTab: 'plan' })
    },
    {
      key: 'workDays',
      label: t('productionOrders.tabs.workDays'),
      visible: navLoading || canViewPage(pagePermForPlanning('workDays')),
      onNavigate: () => sidebarNav({ department: 'planning', planningTab: 'workDays' })
    },
    {
      key: 'tracking',
      label: t('planning.tracking.tab'),
      visible: navLoading || canViewPage(pagePermForPlanning('tracking')),
      onNavigate: () => sidebarNav({ department: 'planning', planningTab: 'tracking' })
    },
    {
      key: 'orders',
      label: t('productionOrders.ordersSection'),
      visible: navLoading || canViewPage(pagePermForPlanning('orders')),
      onNavigate: () => sidebarNav({ department: 'planning', planningTab: 'orders' })
    }
  ]

  const engineeringPages: SidebarPage[] = [
    {
      key: 'home',
      label: t('nav.home'),
      visible: navLoading || canViewPage(pagePermForEngineering('home')),
      onNavigate: () => sidebarNav({ department: 'engineering', engineeringPage: 'home' })
    },
    {
      key: 'ipl',
      label: t('nav.ipl'),
      visible: canShowEngineeringIpl,
      onNavigate: () => sidebarNav({ department: 'engineering', engineeringPage: 'ipl', bomTab: 'consolidated' }, true),
      children: BOM_TAB_ORDER.map(key => ({
        key,
        label: t(`bom.tabs.${key}`),
        onClick: () => sidebarNav({ department: 'engineering', engineeringPage: 'ipl', bomTab: key })
      }))
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
    },
    {
      key: 'sop',
      label: t('nav.sop'),
      visible: canShowSop,
      onNavigate: () => sidebarNav({ department: 'engineering', engineeringPage: 'sop' })
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
    if (nav.showProfile || nav.department !== 'warehouses') return false
    if (key === 'feedingPlan') return nav.warehousesTab === 'feeding' && nav.warehousesFeedingSubTab === 'plan'
    if (key === 'feedingActual') return nav.warehousesTab === 'feeding' && nav.warehousesFeedingSubTab === 'actual'
    if (key === 'equipment') return nav.warehousesTab === 'equipment'
    return nav.warehousesTab === key
  }

  function isPlanningActive(key: string) {
    return !nav.showProfile && nav.department === 'planning' && nav.planningTab === key
  }

  function isQualityActive(_key: string) {
    return !nav.showProfile && nav.department === 'quality'
  }

  function isHrActive(_key: string) {
    return !nav.showProfile && nav.department === 'hr'
  }

  const hrPages: SidebarPage[] = [
    {
      key: 'employees',
      label: t('training.tabs.org'),
      visible: navLoading || canViewPage(pagePermForProduction('training')),
      onNavigate: () => sidebarNav({ department: 'hr' })
    }
  ]

  const qualityPages: SidebarPage[] = [
    {
      key: 'notes',
      label: t('qualityNotes.title'),
      visible: true,
      onNavigate: () => sidebarNav({ department: 'quality', qualityTab: 'record' }),
      children: (['record', 'study'] as const).map(key => ({
        key,
        label: t(`qualityNotes.tabs.${key}`),
        onClick: () => sidebarNav({ department: 'quality', qualityTab: key })
      }))
    }
  ]

  const warehousesPages: SidebarPage[] = [
    {
      key: 'home',
      label: t('nav.home'),
      icon: Home,
      visible: navLoading || canViewPage(pagePermForWarehouses('home')),
      onNavigate: () => sidebarNav({ department: 'warehouses', warehousesTab: 'home' })
    },
    {
      key: 'currentStock',
      label: t('warehouses.tabs.currentStock'),
      icon: Package,
      visible: navLoading || canViewPage(pagePermForWarehouses('currentStock')),
      onNavigate: () => sidebarNav({ department: 'warehouses', warehousesTab: 'currentStock' })
    },
    {
      key: 'feedingPlan',
      label: t('warehouses.feeding.subTabs.plan'),
      icon: CalendarDays,
      visible: navLoading || canViewPage(pagePermForWarehouses('feeding')),
      onNavigate: () => sidebarNav({ department: 'warehouses', warehousesTab: 'feeding', warehousesFeedingSubTab: 'plan' })
    },
    {
      key: 'feedingActual',
      label: t('warehouses.feeding.subTabs.actual'),
      icon: Truck,
      visible: navLoading || canViewPage(pagePermForWarehouses('feeding')),
      onNavigate: () => sidebarNav({ department: 'warehouses', warehousesTab: 'feeding', warehousesFeedingSubTab: 'actual' })
    },
    {
      key: 'equipment',
      label: t('warehouses.tabs.equipment'),
      icon: Boxes,
      visible: navLoading || canViewPage(pagePermForWarehouses('equipment')),
      onNavigate: () => sidebarNav({ department: 'warehouses', warehousesTab: 'equipment', warehousesEquipmentSubTab: 'racks' }, true),
      children: (['racks', 'carts'] as const).map(key => ({
        key,
        label: t(`warehouses.equipment.subTabs.${key}`),
        onClick: () =>
          sidebarNav({ department: 'warehouses', warehousesTab: 'equipment', warehousesEquipmentSubTab: key })
      }))
    }
  ]

  function isProductionAreaActive(key: string) {
    return !nav.showProfile && nav.department === 'production' && nav.productionArea === key && nav.productionPage !== 'settings'
  }

  function isProductionActive(key: string) {
    return !nav.showProfile && nav.department === 'production' && nav.productionArea === 'assembly' && nav.productionPage === key
  }

  function isEngineeringActive(key: string) {
    return !nav.showProfile && nav.department === 'engineering' && nav.engineeringPage === key
  }

  function renderPages(
    scope: 'production' | 'planning' | 'engineering' | 'warehouses' | 'quality' | 'hr',
    pages: SidebarPage[],
    isActive: (key: string) => boolean
  ) {
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
                  <span className="flex min-w-0 items-center gap-2">
                    {page.icon && (
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-cyan-500/15 text-cyan-300' : 'bg-slate-900 text-slate-500'}`}>
                        <page.icon className="h-4 w-4" />
                      </span>
                    )}
                    <span className="truncate">{page.label}</span>
                  </span>
                  {hasChildren && (
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${pageOpen ? 'rotate-180' : ''}`}
                    />
                  )}
                </button>
                {hasChildren && pageOpen && (
                  <ul className="mt-0.5 space-y-0.5 border-s border-slate-800 ps-2">
                    {page.children!.filter(c => c.visible !== false).map(child => (
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
            const isPlanning = dept.id === 'planning'
            const isEngineering = dept.id === 'engineering'
            const isWarehouses = dept.id === 'warehouses'
            const isQuality = dept.id === 'quality'
            const isHr = dept.id === 'hr'

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

                {deptOpen && isProduction && renderPages('production', productionAreaPages, isProductionAreaActive)}
                {deptOpen && isProduction && nav.productionArea === 'assembly' && renderPages('production', productionPages, isProductionActive)}
                {deptOpen && isPlanning && renderPages('planning', planningPages, isPlanningActive)}
                {deptOpen && isEngineering && renderPages('engineering', engineeringPages, isEngineeringActive)}
                {deptOpen && isWarehouses && renderPages('warehouses', warehousesPages, isWarehousesActive)}
                {deptOpen && isQuality && renderPages('quality', qualityPages, isQualityActive)}
                {deptOpen && isHr && renderPages('hr', hrPages, isHrActive)}
                {deptOpen && !isProduction && !isPlanning && !isEngineering && !isWarehouses && !isQuality && !isHr && (
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
          <div className="border-t border-slate-800 px-4 py-2 text-xs text-slate-500">
            {profile.full_name || profile.email}
            {profileIsAdmin(profile) ? ` · ${t('permissions.roleCodes.admin')}` : ''}
          </div>
        )}

        <div className="border-t border-slate-800 px-4 py-3">
          <DeveloperCredit variant="footer" />
        </div>
      </aside>
    </>
  )
}
