import { useCallback, useMemo } from 'react'
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
import { SETTINGS_TAB_ORDER, PRODUCTION_AREA_ORDER, type DepartmentId } from '../Types/navigation'

export type NavPageChild = { key: string; label: string; onClick: () => void; visible?: boolean }

export type NavPageItem = {
  key: string
  label: string
  visible: boolean
  onNavigate: () => void
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
    () =>
      PRODUCTION_AREA_ORDER.map(key => ({
        key,
        label: t(`departments.productionArea.${key}`),
        visible: true,
        onNavigate: () =>
          navTo({
            department: 'production',
            productionArea: key,
            ...(key === 'assembly' ? { productionPage: 'home' } : {})
          })
      })),
    [navTo, t]
  )

  const assemblyPages = useMemo<NavPageItem[]>(
    () => [
      {
        key: 'home',
        label: t('nav.home'),
        visible: navLoading || canViewPage(pagePermForProduction('home')),
        onNavigate: () => navTo({ department: 'production', productionArea: 'assembly', productionPage: 'home' })
      },
      {
        key: 'missing',
        label: t('nav.missingParts'),
        visible: navLoading || canViewPage(pagePermForProduction('missing')),
        onNavigate: () => navTo({ department: 'production', productionArea: 'assembly', productionPage: 'missing' })
      },
      {
        key: 'vehicles',
        label: t('nav.productivity'),
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
        visible: navLoading || canViewPage(pagePermForProduction('damagedParts')),
        onNavigate: () => navTo({ department: 'production', productionArea: 'assembly', productionPage: 'damagedParts' })
      },
      {
        key: 'missions',
        label: t('nav.missions'),
        visible: navLoading || canViewPage(pagePermForProduction('missions')),
        onNavigate: () => navTo({ department: 'production', productionArea: 'assembly', productionPage: 'missions' })
      },
      {
        key: 'requests',
        label: t('nav.requests'),
        visible: navLoading || canViewPage(pagePermForProduction('requests')),
        onNavigate: () => navTo({ department: 'production', productionArea: 'assembly', productionPage: 'requests' })
      },
      {
        key: 'scratches',
        label: t('nav.scratches'),
        visible: navLoading || canViewPage(pagePermForProduction('scratches')),
        onNavigate: () => navTo({ department: 'production', productionArea: 'assembly', productionPage: 'scratches' })
      },
      {
        key: 'equipment',
        label: t('nav.equipment'),
        visible: navLoading || canViewPage(pagePermForProduction('equipment')),
        onNavigate: () => navTo({ department: 'production', productionArea: 'assembly', productionPage: 'equipment' })
      },
      {
        key: 'feedback',
        label: t('nav.feedback'),
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
        visible: navLoading || canViewPage(pagePermForEngineering('home')),
        onNavigate: () => navTo({ department: 'engineering', engineeringPage: 'home' })
      },
      {
        key: 'ipl',
        label: t('nav.ipl'),
        visible: canShowEngineeringIpl,
        onNavigate: () => navTo({ department: 'engineering', engineeringPage: 'ipl', bomTab: 'parts' }),
        children: (['parts', 'partsGd', 'compare', 'categories', 'import', 'dashboard'] as const)
          .map(key => ({
            key,
            label: t(`bom.tabs.${key}`),
            visible: tabVisible('engineering_ipl', key),
            onClick: () => navTo({ department: 'engineering', engineeringPage: 'ipl', bomTab: key })
          }))
          .filter(c => c.visible !== false)
      },
      {
        key: 'lineBalancing',
        label: t('nav.lineBalancing'),
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
        visible: canShowSop,
        onNavigate: () => navTo({ department: 'engineering', engineeringPage: 'sop' })
      }
    ],
    [canShowEngineeringIpl, canShowLineBalancing, canShowSop, canViewPage, navLoading, navTo, t]
  )

  const warehousesPages = useMemo<NavPageItem[]>(
    () => [
      {
        key: 'home',
        label: t('nav.home'),
        visible: navLoading || canViewPage(pagePermForWarehouses('home')),
        onNavigate: () => navTo({ department: 'warehouses', warehousesTab: 'home' })
      },
      {
        key: 'currentStock',
        label: t('warehouses.tabs.currentStock'),
        visible: navLoading || canViewPage(pagePermForWarehouses('currentStock')),
        onNavigate: () => navTo({ department: 'warehouses', warehousesTab: 'currentStock' })
      },
      {
        key: 'feeding',
        label: t('warehouses.tabs.feeding'),
        visible: navLoading || canViewPage(pagePermForWarehouses('feeding')),
        onNavigate: () => navTo({ department: 'warehouses', warehousesTab: 'feeding' }),
        children: [
          {
            key: 'plan',
            label: t('warehouses.feeding.subTabs.plan'),
            visible: tabVisible('warehouses_feeding', 'plan'),
            onClick: () => navTo({ department: 'warehouses', warehousesTab: 'feeding', warehousesFeedingSubTab: 'plan' })
          },
          {
            key: 'actual',
            label: t('warehouses.feeding.subTabs.actual'),
            visible: tabVisible('warehouses_feeding', 'actual'),
            onClick: () => navTo({ department: 'warehouses', warehousesTab: 'feeding', warehousesFeedingSubTab: 'actual' })
          }
        ].filter(c => c.visible !== false)
      }
    ],
    [canViewPage, navLoading, navTo, t, tabVisible]
  )

  const planningPages = useMemo<NavPageItem[]>(
    () => [
      {
        key: 'plan',
        label: t('productionOrders.title'),
        visible: navLoading || canViewPage(pagePermForPlanning('plan')),
        onNavigate: () => navTo({ department: 'planning', planningTab: 'plan' })
      },
      {
        key: 'workDays',
        label: t('productionOrders.tabs.workDays'),
        visible: navLoading || canViewPage(pagePermForPlanning('workDays')),
        onNavigate: () => navTo({ department: 'planning', planningTab: 'workDays' })
      },
      {
        key: 'tracking',
        label: t('planning.tracking.tab'),
        visible: navLoading || canViewPage(pagePermForPlanning('tracking')),
        onNavigate: () => navTo({ department: 'planning', planningTab: 'tracking' })
      },
      {
        key: 'orders',
        label: t('productionOrders.ordersSection'),
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
    [navTo, t]
  )

  const hrPages = useMemo<NavPageItem[]>(
    () => [
      {
        key: 'employees',
        label: t('training.tabs.org'),
        visible: navLoading || canViewPage(pagePermForProduction('training')),
        onNavigate: () => navTo({ department: 'hr' })
      }
    ],
    [canViewPage, navLoading, navTo, t, tabVisible]
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
    if (dept === 'warehouses') return nav.warehousesTab === pageKey
    if (dept === 'quality') return pageKey === 'notes'
    if (dept === 'hr') return pageKey === 'employees'
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
    selectDepartment,
    currentDepartment: nav.department,
    showProfile: nav.showProfile
  }
}
