import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
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
import { useAuth } from '../Context/AuthContext'
import { usePermissions } from '../Context/PermissionsContext'
import { isProductivityRecorder } from '../Utils/assemblyAreas'
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
import { lineShopNavItems, type LineShopArea } from '../navigation/lineShopNav'
import {
  SETTINGS_TAB_ORDER,
  PRODUCTION_AREA_ORDER,
  BOM_TAB_ORDER,
  bomTabPermissionKey,
  type DepartmentId
} from '../Types/navigation'
import { getFactoryOrgUnits } from '../services/factoryOrgService'
import {
  externalRepairDepartments,
  externalRepairSiteForSelection,
  externalRepairSites
} from '../Utils/productionAreaCounts'
import type { FactoryOrgUnit } from '../Types/factoryOrg'
import { productivityNavVisible } from '../config/pageTabAccess'
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

const LINE_SHOP_ICONS = {
  home: Home,
  training: CalendarDays,
  missing: AlertTriangle,
  vehicles: Activity
} as const

export function useDepartmentNavPages() {
  const { t } = useLang()
  const { profile } = useAuth()
  const { loading: permsLoading } = usePermissions()
  const recorder = isProductivityRecorder(profile?.system_role_code, profile?.system_role_name_ar)
  const { canAccess: canAccessSettings } = useCanAccessSettings()
  const { canViewPage, canViewTab, loading: pagesLoading } = useCanViewPage()
  const nav = useNavigation()
  const [orgUnits, setOrgUnits] = useState<FactoryOrgUnit[]>([])

  useEffect(() => {
    let cancelled = false
    void getFactoryOrgUnits()
      .then(units => {
        if (!cancelled) setOrgUnits(units)
      })
      .catch(() => {
        if (!cancelled) setOrgUnits([])
      })
    return () => {
      cancelled = true
    }
  }, [])

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

  const productionAreaTabs = useMemo<NavPageItem[]>(() => {
    const icons: Record<string, LucideIcon> = {
      body: Factory,
      paint: Wrench,
      assembly: Car,
      externalRepair: Truck
    }
    const areas = PRODUCTION_AREA_ORDER.map(key => ({
      key,
      label: t(`departments.productionArea.${key}`),
      icon: icons[key],
      visible: true,
      onNavigate: () =>
        navTo({
          department: 'production',
          productionArea: key,
          ...(key === 'assembly' || key === 'body' || key === 'paint' || key === 'externalRepair' || nav.productionPage === 'overview'
            ? {
                productionPage: 'home' as const,
                ...(key === 'externalRepair'
                  ? {
                      externalRepairSectionId: (() => {
                        const firstSite = externalRepairSites(orgUnits)[0]
                        if (!firstSite) return null
                        return externalRepairDepartments(orgUnits, firstSite.id)[0]?.id ?? firstSite.id
                      })()
                    }
                  : { externalRepairSectionId: null })
              }
            : {})
        })
    }))
    return [
      {
        key: 'overview',
        label: t('nav.home'),
        icon: Home,
        visible: navLoading || canViewPage(pagePermForProduction('home')),
        onNavigate: () => navTo({ department: 'production', productionPage: 'overview' })
      },
      ...areas
    ]
  }, [canViewPage, nav.productionPage, navLoading, navTo, orgUnits, t])

  const externalRepairPages = useMemo<NavPageItem[]>(() => {
    const sites = externalRepairSites(orgUnits)
    if (sites.length === 0) {
      return [
        {
          key: 'externalRepairEmpty',
          label: t('externalRepair.noSectionsShort'),
          icon: Factory,
          visible: true,
          onNavigate: () =>
            navTo({
              department: 'production',
              productionArea: 'externalRepair',
              productionPage: 'home',
              externalRepairSectionId: null
            })
        }
      ]
    }
    return sites.map(site => {
      const departments = externalRepairDepartments(orgUnits, site.id)
      const defaultTargetId = departments[0]?.id ?? site.id
      return {
        key: site.id,
        label: site.name,
        icon: Users,
        visible: navLoading || canViewPage(pagePermForProduction('training')),
        onNavigate: () =>
          navTo({
            department: 'production',
            productionArea: 'externalRepair',
            productionPage: nav.productionPage === 'overview' ? 'home' : nav.productionPage || 'home',
            externalRepairSectionId: defaultTargetId
          }),
        children:
          departments.length > 0
            ? departments.map(department => ({
                key: department.id,
                label: department.name,
                visible: true,
                onClick: () =>
                  navTo({
                    department: 'production',
                    productionArea: 'externalRepair',
                    productionPage: nav.productionPage === 'overview' ? 'home' : nav.productionPage || 'home',
                    externalRepairSectionId: department.id
                  })
              }))
            : []
      }
    })
  }, [canViewPage, nav.productionPage, navLoading, navTo, orgUnits, t])

  const buildShopModulePages = useCallback(
    (area: 'assembly' | 'externalRepair'): NavPageItem[] => {
      const go = (patch: Parameters<typeof navTo>[0]) =>
        navTo({
          department: 'production',
          productionArea: area,
          ...(area === 'externalRepair' ? { externalRepairSectionId: nav.externalRepairSectionId } : {}),
          ...patch
        })
      return [
        {
          key: 'home',
          label: t('nav.home'),
          icon: Home,
          visible: navLoading || canViewPage(pagePermForProduction('home')),
          onNavigate: () => go({ productionPage: 'home' })
        },
        {
          key: 'missing',
          label: t('nav.missingParts'),
          icon: AlertTriangle,
          visible: navLoading || canViewPage(pagePermForProduction('missing')),
          onNavigate: () => go({ productionPage: 'missing' })
        },
        {
          key: 'vehicles',
          label: t('nav.productivity'),
          icon: Activity,
          visible: navLoading || productivityNavVisible(canViewPage, canViewTab, recorder),
          onNavigate: () => go({ productionPage: 'vehicles', productivityTab: 'productivity' }),
          children: [
            {
              key: 'productivity',
              label: t('productivity.tabs.productivity'),
              visible: tabVisible('production_productivity', 'productivity'),
              onClick: () => go({ productionPage: 'vehicles', productivityTab: 'productivity' })
            },
            {
              key: 'stops',
              label: t('productivity.tabs.stops'),
              visible: tabVisible('production_productivity', 'stops'),
              onClick: () => go({ productionPage: 'vehicles', productivityTab: 'stops' })
            }
          ].filter(c => c.visible !== false)
        },
        {
          key: 'training',
          label: t('nav.training'),
          icon: Users,
          visible: navLoading || canViewPage(pagePermForProduction('training')),
          onNavigate: () => go({ productionPage: 'training', trainingTab: 'org' }),
          children: (
            ['org', 'attendance', 'manpower', 'operations', 'stationSkills', 'matrix', 'qualification', 'expiry'] as const
          )
            .map(key => ({
              key,
              label: t(`training.tabs.${key}`),
              visible: tabVisible('production_training', key),
              onClick: () => go({ productionPage: 'training', trainingTab: key })
            }))
            .filter(c => c.visible !== false)
        },
        {
          key: 'damagedParts',
          label: t('nav.damagedParts'),
          icon: Package,
          visible: navLoading || canViewPage(pagePermForProduction('damagedParts')),
          onNavigate: () => go({ productionPage: 'damagedParts' })
        },
        {
          key: 'missions',
          label: t('nav.missions'),
          icon: ClipboardList,
          visible: navLoading || canViewPage(pagePermForProduction('missions')),
          onNavigate: () => go({ productionPage: 'missions' })
        },
        {
          key: 'requests',
          label: t('nav.requests'),
          icon: FileText,
          visible: navLoading || canViewPage(pagePermForProduction('requests')),
          onNavigate: () => go({ productionPage: 'requests' })
        },
        {
          key: 'scratches',
          label: t('nav.scratches'),
          icon: Target,
          visible: navLoading || canViewPage(pagePermForProduction('scratches')),
          onNavigate: () => go({ productionPage: 'scratches' })
        },
        {
          key: 'equipment',
          label: t('nav.equipment'),
          icon: Wrench,
          visible: navLoading || canViewPage(pagePermForProduction('equipment')),
          onNavigate: () => go({ productionPage: 'equipment' })
        },
        {
          key: 'internalQuality',
          label: t('nav.internalQuality'),
          icon: BadgeCheck,
          visible: navLoading || canViewPage(pagePermForProduction('internalQuality')),
          onNavigate: () => go({ productionPage: 'internalQuality' })
        },
        {
          key: 'feedback',
          label: t('nav.feedback'),
          icon: MessageSquare,
          visible: navLoading || canViewPage(pagePermForProduction('feedback')),
          onNavigate: () => go({ productionPage: 'feedback' })
        }
      ]
    },
    [canViewPage, canViewTab, nav.externalRepairSectionId, navLoading, navTo, recorder, t, tabVisible]
  )

  const assemblyPages = useMemo(() => buildShopModulePages('assembly'), [buildShopModulePages])
  const externalRepairModulePages = useMemo(
    () => buildShopModulePages('externalRepair'),
    [buildShopModulePages]
  )

  const externalRepairDepartmentSelected = useMemo(() => {
    const id = nav.externalRepairSectionId
    if (!id || nav.productionArea !== 'externalRepair') return false
    const site = externalRepairSiteForSelection(orgUnits, id)
    if (!site) return false
    return externalRepairDepartments(orgUnits, site.id).some(dept => dept.id === id)
  }, [nav.externalRepairSectionId, nav.productionArea, orgUnits])

  const lineShopPages = useCallback(
    (area: LineShopArea): NavPageItem[] =>
      lineShopNavItems(area, t).map(item => ({
        key: item.key,
        label: item.label,
        icon: LINE_SHOP_ICONS[item.key],
        visible:
          navLoading ||
          (item.perm === 'vehicles'
            ? productivityNavVisible(canViewPage, canViewTab, recorder)
            : canViewPage(pagePermForProduction(item.perm))),
        onNavigate: () => navTo(item.patch),
        children: item.children
          ?.map(child => ({
            key: child.key,
            label: child.label,
            visible: tabVisible('production_productivity', child.key),
            onClick: () => navTo(child.patch)
          }))
          .filter(child => child.visible !== false)
      })),
    [canViewPage, canViewTab, navLoading, navTo, recorder, t, tabVisible]
  )

  const bodyPages = useMemo(() => lineShopPages('body'), [lineShopPages])
  const paintPages = useMemo(() => lineShopPages('paint'), [lineShopPages])

  const productionPages = assemblyPages

  const settingsPage = useMemo<NavPageItem>(
    () => ({
      key: 'settings',
      label: t('nav.settings'),
      icon: Settings2,
      visible: canAccessSettings,
      onNavigate: () =>
        navTo({
          department: 'production',
          productionArea: 'assembly',
          productionPage: 'settings',
          settingsTab: 'administrations'
        }),
      children: SETTINGS_TAB_ORDER.map(key => ({
        key,
        label: t(`settings.tabs.${key}`),
        visible: canAccessSettings,
        onClick: () =>
          navTo({
            department: 'production',
            productionArea: 'assembly',
            productionPage: 'settings',
            settingsTab: key,
            ...(key === 'stations' ? { settingsStationsSubTab: 'assemblyLine' as const } : {})
          })
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
        onNavigate: () => navTo({ department: 'engineering', engineeringPage: 'ipl', bomTab: 'iplModels' }),
        children: BOM_TAB_ORDER.map(key => ({
          key,
          label: t(`bom.tabs.${key}`),
          visible: tabVisible('engineering_ipl', bomTabPermissionKey(key)),
          onClick: () => navTo({ department: 'engineering', engineeringPage: 'ipl', bomTab: key })
        })).filter(c => c.visible !== false)
      },
      {
        key: 'lineBalancing',
        label: t('nav.lineBalancing'),
        icon: Activity,
        visible: canShowLineBalancing,
        onNavigate: () =>
          navTo({ department: 'engineering', engineeringPage: 'lineBalancing', lineBalancingTab: 'operations' }),
        children: (['operations', 'timeStudy', 'routing', 'manpower', 'import'] as const)
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
        onNavigate: () => navTo({ department: 'planning', planningTab: 'plan', planScope: 'monthly' })
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
    if (dept === 'production') {
      if (nav.productionArea === 'body') return bodyPages
      if (nav.productionArea === 'paint') return paintPages
      if (nav.productionArea === 'externalRepair') return externalRepairPages
      return assemblyPages
    }
    if (dept === 'planning') return planningPages
    if (dept === 'engineering') return engineeringPages
    if (dept === 'warehouses') return warehousesPages
    if (dept === 'quality') return qualityPages
    if (dept === 'hr') return hrPages
    return []
  }

  function isProductionAreaActive(areaKey: string): boolean {
    if (nav.showProfile || nav.department !== 'production' || nav.productionPage === 'settings') return false
    if (areaKey === 'overview') return nav.productionPage === 'overview'
    return nav.productionArea === areaKey && nav.productionPage !== 'overview'
  }

  function isPageActive(dept: DepartmentId, pageKey: string): boolean {
    if (nav.showProfile) return false
    if (nav.department !== dept) return false
    if (dept === 'production') {
      if (nav.productionArea === 'externalRepair') {
        if (nav.productionPage === 'overview') return false
        if (nav.productionPage === pageKey) return true
        if (nav.externalRepairSectionId === pageKey) return true
        const site = externalRepairSiteForSelection(orgUnits, nav.externalRepairSectionId)
        return site?.id === pageKey
      }
      return (
        (nav.productionArea === 'assembly' || nav.productionArea === 'body' || nav.productionArea === 'paint') &&
        nav.productionPage !== 'overview' &&
        nav.productionPage === pageKey
      )
    }
    if (dept === 'planning') return nav.planningTab === pageKey
    if (dept === 'engineering') return nav.engineeringPage === pageKey
    if (dept === 'warehouses') {
      if (pageKey === 'feedingPlan') return nav.warehousesTab === 'feeding' && nav.warehousesFeedingSubTab === 'plan'
      if (pageKey === 'feedingActual')
        return nav.warehousesTab === 'feeding' && nav.warehousesFeedingSubTab === 'actual'
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
    if (dept === 'production' && nav.productionArea === 'externalRepair') {
      return nav.externalRepairSectionId === childKey
    }
    if (dept === 'production' && parentKey === 'settings') return nav.settingsTab === childKey
    if (dept === 'quality' && parentKey === 'notes') return nav.qualityTab === childKey
    if (dept === 'warehouses' && parentKey === 'equipment') return nav.warehousesEquipmentSubTab === childKey
    return false
  }

  function selectDepartment(dept: DepartmentId) {
    if (dept === 'production' && nav.productionPage === 'settings') {
      nav.navigate({ department: 'production', productionPage: 'overview', showProfile: false })
      return
    }
    nav.selectDepartment(dept)
    nav.navigate({ showProfile: false })
  }

  return {
    productionAreaTabs,
    productionPages,
    assemblyPages,
    bodyPages,
    paintPages,
    externalRepairPages,
    externalRepairModulePages,
    externalRepairDepartmentSelected,
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
