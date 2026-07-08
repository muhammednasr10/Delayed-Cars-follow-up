import { useCallback, useMemo } from 'react'
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Boxes,
  CalendarDays,
  Car,
  ClipboardList,
  Factory,
  FileText,
  Home,
  List,
  MessageSquare,
  Package,
  Settings2,
  Target,
  Truck,
  Users,
  Wrench
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { usePermissions } from '../Context/PermissionsContext'
import { useCanAccessSettings } from './useCanAccessSettings'
import { useCanViewPage } from './useCanViewPage'
import {
  pagePermForEngineering,
  pagePermForPlanning,
  pagePermForProduction,
  pagePermForWarehouses,
  type AppPagePermissionKey
} from '../config/pageAccess'
import { useNavigation } from '../Context/NavigationContext'
import { SETTINGS_TAB_ORDER, PRODUCTION_AREA_ORDER, BOM_TAB_ORDER, bomTabPermissionKey, type DepartmentId } from '../Types/navigation'
import { buildWarehousesNavPages } from './warehouses/buildWarehousesNavPages'

export type NavPageChild = {
  key: string
  label: string
  onClick: () => void
  visible?: boolean
  icon?: LucideIcon
}

export type NavPageItem = {
  key: string
  label: string
  visible: boolean
  onNavigate: () => void
  icon?: LucideIcon
  children?: NavPageChild[]
}

export function useDepartmentNavPages() {
  const { t } = useLang()
  const { loading: permsLoading } = usePermissions()
  const { canAccess: canAccessSettings } = useCanAccessSettings()
  const { canViewPage, canViewTab, loading: pagesLoading } = useCanViewPage()
  const nav = useNavigation()

  const navLoading = permsLoading || pagesLoading

  const tabVisible = useCallback(
    (parentPerm: AppPagePermissionKey, tabKey: string) => navLoading || canViewTab(parentPerm, tabKey),
    [canViewTab, navLoading]
  )

  const canShowEngineeringIpl = canAccessSettings || canViewPage(pagePermForEngineering('ipl'))
  const canShowLineBalancing = navLoading || canViewPage(pagePermForEngineering('lineBalancing'))
  const canShowSop = navLoading || canViewPage(pagePermForEngineering('sop'))

  const go = nav.navigate

  const navTo = useCallback(
    (patch: Parameters<typeof go>[0]) => {
      go({ ...patch, showProfile: false })
    },
    [go]
  )

  const productionAreaTabs = useMemo<NavPageItem[]>(
    () => {
      const icons: Record<string, LucideIcon> = {
        body: Factory,
        paint: Wrench,
        assembly: Car,
        externalRepair: Truck
      }
      return PRODUCTION_AREA_ORDER.map(key => ({
        key,
        label: t(`departments.productionArea.${key}`),
        icon: icons[key],
        visible: true,
        onNavigate: () =>
          navTo({
            department: 'production',
            productionArea: key,
            ...(key === 'assembly' ? { productionPage: 'home' } : {})
          })
      }))
    },
    [navTo, t]
  )

  const assemblyPages = useMemo<NavPageItem[]>(
    () => [
      {
        key: 'home',
        label: t('nav.home'),
        icon: Home,
        visible: navLoading || canViewPage(pagePermForProduction('home')),
        onNavigate: () => navTo({ department: 'production', productionArea: 'assembly', productionPage: 'home' })
      },
      {
        key: 'missing',
        label: t('nav.missingParts'),
        icon: AlertTriangle,
        visible: navLoading || canViewPage(pagePermForProduction('missing')),
        onNavigate: () => navTo({ department: 'production', productionArea: 'assembly', productionPage: 'missing' })
      },
      {
        key: 'vehicles',
        label: t('nav.productivity'),
        icon: Activity,
        visible: navLoading || canViewPage(pagePermForProduction('vehicles')),
        onNavigate: () =>
          navTo({ department: 'production', productionArea: 'assembly', productionPage: 'vehicles', productivityTab: 'productivity' }),
        children: [
          {
            key: 'productivity',
            label: t('productivity.tabs.productivity'),
            visible: tabVisible('production_productivity', 'productivity'),
            onClick: () =>
              navTo({ department: 'production', productionArea: 'assembly', productionPage: 'vehicles', productivityTab: 'productivity' })
          },
          {
            key: 'stops',
            label: t('productivity.tabs.stops'),
            visible: tabVisible('production_productivity', 'stops'),
            onClick: () =>
              navTo({ department: 'production', productionArea: 'assembly', productionPage: 'vehicles', productivityTab: 'stops' })
          }
        ].filter(c => c.visible !== false)
      },
      {
        key: 'training',
        label: t('nav.training'),
        icon: Users,
        visible: navLoading || canViewPage(pagePermForProduction('training')),
        onNavigate: () => navTo({ department: 'production', productionArea: 'assembly', productionPage: 'training', trainingTab: 'org' }),
        children: (['org', 'attendance', 'manpower', 'operations', 'stationSkills', 'matrix', 'qualification', 'expiry'] as const)
          .map(key => ({
            key,
            label: t(`training.tabs.${key}`),
            visible: tabVisible('production_training', key),
            onClick: () => navTo({ department: 'production', productionArea: 'assembly', productionPage: 'training', trainingTab: key })
          }))
          .filter(c => c.visible !== false)
      },
      {
        key: 'damagedParts',
        label: t('nav.damagedParts'),
        icon: Package,
        visible: navLoading || canViewPage(pagePermForProduction('damagedParts')),
        onNavigate: () => navTo({ department: 'production', productionArea: 'assembly', productionPage: 'damagedParts' })
      },
      {
        key: 'missions',
        label: t('nav.missions'),
        icon: ClipboardList,
        visible: navLoading || canViewPage(pagePermForProduction('missions')),
        onNavigate: () => navTo({ department: 'production', productionArea: 'assembly', productionPage: 'missions' })
      },
      {
        key: 'requests',
        label: t('nav.requests'),
        icon: FileText,
        visible: navLoading || canViewPage(pagePermForProduction('requests')),
        onNavigate: () => navTo({ department: 'production', productionArea: 'assembly', productionPage: 'requests' })
      },
      {
        key: 'scratches',
        label: t('nav.scratches'),
        icon: Target,
        visible: navLoading || canViewPage(pagePermForProduction('scratches')),
        onNavigate: () => navTo({ department: 'production', productionArea: 'assembly', productionPage: 'scratches' })
      },
      {
        key: 'equipment',
        label: t('nav.equipment'),
        icon: Wrench,
        visible: navLoading || canViewPage(pagePermForProduction('equipment')),
        onNavigate: () => navTo({ department: 'production', productionArea: 'assembly', productionPage: 'equipment' })
      },
      {
        key: 'feedback',
        label: t('nav.feedback'),
        icon: MessageSquare,
        visible: navLoading || canViewPage(pagePermForProduction('feedback')),
        onNavigate: () => navTo({ department: 'production', productionArea: 'assembly', productionPage: 'feedback' })
      }
    ],
    [canViewPage, navLoading, navTo, t, tabVisible]
  )

  const productionPages = assemblyPages

  const settingsPage = useMemo<NavPageItem>(
    () => ({
      key: 'settings',
      label: t('nav.settings'),
      icon: Settings2,
      visible: canAccessSettings,
      onNavigate: () => navTo({ department: 'production', productionArea: 'assembly', productionPage: 'settings', settingsTab: 'administrations' }),
      children: SETTINGS_TAB_ORDER.map(key => ({
        key,
        label: t(`settings.tabs.${key}`),
        visible: canAccessSettings,
        onClick: () => navTo({ department: 'production', productionArea: 'assembly', productionPage: 'settings', settingsTab: key })
      })).filter(c => c.visible !== false)
    }),
    [canAccessSettings, navTo, t]
  )

  const engineeringPages = useMemo<NavPageItem[]>(
    () => [
      {
        key: 'home',
        label: t('nav.home'),
        icon: Home,
        visible: navLoading || canViewPage(pagePermForEngineering('home')),
        onNavigate: () => navTo({ department: 'engineering', engineeringPage: 'home' })
      },
      {
        key: 'ipl',
        label: t('nav.ipl'),
        icon: List,
        visible: canShowEngineeringIpl,
        onNavigate: () => navTo({ department: 'engineering', engineeringPage: 'ipl', bomTab: 'consolidated' }),
        children: BOM_TAB_ORDER.map(key => ({
            key,
            label: t(`bom.tabs.${key}`),
            visible: tabVisible('engineering_ipl', bomTabPermissionKey(key)),
            onClick: () => navTo({ department: 'engineering', engineeringPage: 'ipl', bomTab: key })
          }))
          .filter(c => c.visible !== false)
      },
      {
        key: 'lineBalancing',
        label: t('nav.lineBalancing'),
        icon: Activity,
        visible: canShowLineBalancing,
        onNavigate: () => navTo({ department: 'engineering', engineeringPage: 'lineBalancing', lineBalancingTab: 'operations' }),
        children: (['operations', 'opParts', 'timeStudy', 'routing', 'manpower', 'import'] as const)
          .map(key => ({
            key,
            label: t(`lineBalancing.tabs.${key}`),
            visible: tabVisible('engineering_line_balancing', key),
            onClick: () => navTo({ department: 'engineering', engineeringPage: 'lineBalancing', lineBalancingTab: key })
          }))
          .filter(c => c.visible !== false)
      },
      {
        key: 'sop',
        label: t('nav.sop'),
        icon: BookOpen,
        visible: canShowSop,
        onNavigate: () => navTo({ department: 'engineering', engineeringPage: 'sop' })
      }
    ],
    [canShowEngineeringIpl, canShowLineBalancing, canShowSop, canViewPage, navLoading, navTo, t, tabVisible]
  )

  const warehousesPages = useMemo<NavPageItem[]>(
    () =>
      buildWarehousesNavPages({
        t,
        navLoading,
        navTo,
        canViewPage,
        tabVisible,
        icons: { Home, Package, CalendarDays, Truck, Boxes }
      }),
    [canViewPage, navLoading, navTo, t, tabVisible]
  )

  const planningPages = useMemo<NavPageItem[]>(
    () => [
      {
        key: 'plan',
        label: t('productionOrders.title'),
        icon: ClipboardList,
        visible: navLoading || canViewPage(pagePermForPlanning('plan')),
        onNavigate: () => navTo({ department: 'planning', planningTab: 'plan' })
      },
      {
        key: 'workDays',
        label: t('productionOrders.tabs.workDays'),
        icon: CalendarDays,
        visible: navLoading || canViewPage(pagePermForPlanning('workDays')),
        onNavigate: () => navTo({ department: 'planning', planningTab: 'workDays' })
      },
      {
        key: 'tracking',
        label: t('planning.tracking.tab'),
        icon: Target,
        visible: navLoading || canViewPage(pagePermForPlanning('tracking')),
        onNavigate: () => navTo({ department: 'planning', planningTab: 'tracking' })
      },
      {
        key: 'orders',
        label: t('productionOrders.ordersSection'),
        icon: List,
        visible: navLoading || canViewPage(pagePermForPlanning('orders')),
        onNavigate: () => navTo({ department: 'planning', planningTab: 'orders' })
      }
    ],
    [canViewPage, navLoading, navTo, t]
  )

  const qualityPages = useMemo<NavPageItem[]>(
    () => [
      {
        key: 'notes',
        label: t('qualityNotes.title'),
        icon: MessageSquare,
        visible: navLoading || canViewPage('quality_notes' as AppPagePermissionKey),
        onNavigate: () => navTo({ department: 'quality', qualityTab: 'record' }),
        children: (['record', 'study'] as const)
          .map(key => ({
            key,
            label: t(`qualityNotes.tabs.${key}`),
            visible: tabVisible('quality_notes', key),
            onClick: () => navTo({ department: 'quality', qualityTab: key })
          }))
          .filter(c => c.visible !== false)
      }
    ],
    [canViewPage, navLoading, navTo, t, tabVisible]
  )

  const hrPages = useMemo<NavPageItem[]>(
    () => [
      {
        key: 'employees',
        label: t('training.tabs.org'),
        icon: Users,
        visible: navLoading || canViewPage(pagePermForProduction('training')),
        onNavigate: () => navTo({ department: 'hr' })
      }
    ],
    [canViewPage, navLoading, navTo, t]
  )

  function pagesForDepartment(dept: DepartmentId): NavPageItem[] {
    if (dept === 'production') return assemblyPages
    if (dept === 'planning') return planningPages
    if (dept === 'engineering') return engineeringPages
    if (dept === 'warehouses') return warehousesPages
    if (dept === 'quality') return qualityPages
    if (dept === 'hr') return hrPages
    return []
  }

  function isProductionAreaActive(areaKey: string): boolean {
    if (nav.showProfile || nav.productionPage === 'settings') return false
    return nav.department === 'production' && nav.productionArea === areaKey
  }

  function isPageActive(dept: DepartmentId, pageKey: string): boolean {
    if (nav.showProfile) return false
    if (nav.department !== dept) return false
    if (dept === 'production') return nav.productionArea === 'assembly' && nav.productionPage === pageKey
    if (dept === 'planning') return nav.planningTab === pageKey
    if (dept === 'engineering') return nav.engineeringPage === pageKey
    if (dept === 'warehouses') {
      if (pageKey === 'feedingPlan') return nav.warehousesTab === 'feeding' && nav.warehousesFeedingSubTab === 'plan'
      if (pageKey === 'feedingActual') return nav.warehousesTab === 'feeding' && nav.warehousesFeedingSubTab === 'actual'
      if (pageKey === 'equipment') return nav.warehousesTab === 'equipment'
      return nav.warehousesTab === pageKey
    }
    if (dept === 'quality') return pageKey === 'notes'
    if (dept === 'hr') return pageKey === 'employees'
    return false
  }

  function isNavChildActive(dept: DepartmentId, parentKey: string, childKey: string): boolean {
    if (!isPageActive(dept, parentKey)) return false
    if (dept === 'engineering' && parentKey === 'ipl') return nav.bomTab === childKey
    if (dept === 'engineering' && parentKey === 'lineBalancing') return nav.lineBalancingTab === childKey
    if (dept === 'production' && parentKey === 'vehicles') return nav.productivityTab === childKey
    if (dept === 'production' && parentKey === 'training') return nav.trainingTab === childKey
    if (dept === 'production' && parentKey === 'settings') return nav.settingsTab === childKey
    if (dept === 'quality' && parentKey === 'notes') return nav.qualityTab === childKey
    if (dept === 'warehouses' && parentKey === 'equipment') return nav.warehousesEquipmentSubTab === childKey
    return false
  }

  function selectDepartment(dept: DepartmentId) {
    if (dept === 'production' && nav.productionPage === 'settings') {
      nav.navigate({ department: 'production', productionArea: 'assembly', productionPage: 'home', showProfile: false })
      return
    }
    nav.selectDepartment(dept)
    nav.navigate({ showProfile: false })
  }

  return {
    productionAreaTabs,
    productionPages,
    assemblyPages,
    engineeringPages,
    planningPages,
    warehousesPages,
    qualityPages,
    hrPages,
    settingsPage,
    pagesForDepartment,
    isProductionAreaActive,
    isPageActive,
    isNavChildActive,
    selectDepartment,
    currentDepartment: nav.department,
    showProfile: nav.showProfile
  }
}
