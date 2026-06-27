import { useCallback, useMemo } from 'react'
import { useLang } from '../i18n/LanguageContext'
import { usePermissions } from '../Context/PermissionsContext'
import { useCanAccessSettings } from './useCanAccessSettings'
import { useCanViewPage } from './useCanViewPage'
import { pagePermForEngineering, pagePermForProduction, pagePermForWarehouses } from '../config/pageAccess'
import { useNavigation } from '../Context/NavigationContext'
import type { DepartmentId } from '../Types/navigation'

export type NavPageChild = { key: string; label: string; onClick: () => void }

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
  const { canViewPage, loading: pagesLoading } = useCanViewPage()
  const nav = useNavigation()

  const navLoading = permsLoading || pagesLoading

  const canShowEngineeringIpl = canAccessSettings || canViewPage(pagePermForEngineering('ipl'))
  const canShowEngineeringStations =
    canAccessSettings || navLoading || canViewPage(pagePermForEngineering('stations'))
  const canShowLineBalancing = navLoading || canViewPage(pagePermForEngineering('lineBalancing'))

  const go = nav.navigate

  const navTo = useCallback(
    (patch: Parameters<typeof go>[0]) => {
      go({ ...patch, showProfile: false })
    },
    [go]
  )

  const productionPages = useMemo<NavPageItem[]>(
    () => [
      {
        key: 'home',
        label: t('nav.home'),
        visible: navLoading || canViewPage(pagePermForProduction('home')),
        onNavigate: () => navTo({ department: 'production', productionPage: 'home' })
      },
      {
        key: 'missing',
        label: t('nav.missingParts'),
        visible: navLoading || canViewPage(pagePermForProduction('missing')),
        onNavigate: () => navTo({ department: 'production', productionPage: 'missing' })
      },
      {
        key: 'vehicles',
        label: t('nav.productivity'),
        visible: navLoading || canViewPage(pagePermForProduction('vehicles')),
        onNavigate: () => navTo({ department: 'production', productionPage: 'vehicles', productivityTab: 'orders' }),
        children: [
          { key: 'orders', label: t('productivity.tabs.orders'), onClick: () => navTo({ department: 'production', productionPage: 'vehicles', productivityTab: 'orders' }) },
          { key: 'entry', label: t('productivity.tabs.entry'), onClick: () => navTo({ department: 'production', productionPage: 'vehicles', productivityTab: 'entry' }) },
          { key: 'exit', label: t('productivity.tabs.exit'), onClick: () => navTo({ department: 'production', productionPage: 'vehicles', productivityTab: 'exit' }) },
          { key: 'stops', label: t('productivity.tabs.stops'), onClick: () => navTo({ department: 'production', productionPage: 'vehicles', productivityTab: 'stops' }) },
          { key: 'workDays', label: t('productionOrders.tabs.workDays'), onClick: () => navTo({ department: 'production', productionPage: 'vehicles', productivityTab: 'workDays' }) },
          {
            key: 'planOrders',
            label: t('productionOrders.tabs.planOrders'),
            onClick: () =>
              navTo({
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
        visible: navLoading || canViewPage(pagePermForProduction('training')),
        onNavigate: () => navTo({ department: 'production', productionPage: 'training', trainingTab: 'org' }),
        children: (['org', 'attendance', 'manpower', 'operations', 'stationSkills', 'matrix', 'qualification', 'expiry'] as const).map(key => ({
          key,
          label: t(`training.tabs.${key}`),
          onClick: () => navTo({ department: 'production', productionPage: 'training', trainingTab: key })
        }))
      },
      {
        key: 'damagedParts',
        label: t('nav.damagedParts'),
        visible: navLoading || canViewPage(pagePermForProduction('damagedParts')),
        onNavigate: () => navTo({ department: 'production', productionPage: 'damagedParts' })
      },
      {
        key: 'missions',
        label: t('nav.missions'),
        visible: navLoading || canViewPage(pagePermForProduction('missions')),
        onNavigate: () => navTo({ department: 'production', productionPage: 'missions' })
      },
      {
        key: 'requests',
        label: t('nav.requests'),
        visible: navLoading || canViewPage(pagePermForProduction('requests')),
        onNavigate: () => navTo({ department: 'production', productionPage: 'requests' })
      },
      {
        key: 'scratches',
        label: t('nav.scratches'),
        visible: navLoading || canViewPage(pagePermForProduction('scratches')),
        onNavigate: () => navTo({ department: 'production', productionPage: 'scratches' })
      },
      {
        key: 'equipment',
        label: t('nav.equipment'),
        visible: navLoading || canViewPage(pagePermForProduction('equipment')),
        onNavigate: () => navTo({ department: 'production', productionPage: 'equipment' })
      },
      {
        key: 'feedback',
        label: t('nav.feedback'),
        visible: navLoading || canViewPage(pagePermForProduction('feedback')),
        onNavigate: () => navTo({ department: 'production', productionPage: 'feedback' })
      }
    ],
    [canViewPage, navLoading, navTo, t]
  )

  const settingsPage = useMemo<NavPageItem>(
    () => ({
      key: 'settings',
      label: t('nav.settings'),
      visible: canViewPage(pagePermForProduction('settings')),
      onNavigate: () => navTo({ department: 'production', productionPage: 'settings', settingsTab: 'models' }),
      children: (['models', 'stations', 'colors', 'areas', 'reasons', 'departments', 'users'] as const).map(key => ({
        key,
        label: t(`settings.tabs.${key}`),
        onClick: () => navTo({ department: 'production', productionPage: 'settings', settingsTab: key })
      }))
    }),
    [canViewPage, navTo, t]
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
        children: (['parts', 'compare', 'categories', 'import', 'dashboard'] as const).map(key => ({
          key,
          label: t(`bom.tabs.${key}`),
          onClick: () => navTo({ department: 'engineering', engineeringPage: 'ipl', bomTab: key })
        }))
      },
      {
        key: 'stations',
        label: t('nav.stations'),
        visible: canShowEngineeringStations,
        onNavigate: () => navTo({ department: 'engineering', engineeringPage: 'stations' })
      },
      {
        key: 'lineBalancing',
        label: t('nav.lineBalancing'),
        visible: canShowLineBalancing,
        onNavigate: () => navTo({ department: 'engineering', engineeringPage: 'lineBalancing', lineBalancingTab: 'operations' }),
        children: (['operations', 'opParts', 'timeStudy', 'routing', 'manpower', 'import'] as const).map(key => ({
          key,
          label: t(`lineBalancing.tabs.${key}`),
          onClick: () => navTo({ department: 'engineering', engineeringPage: 'lineBalancing', lineBalancingTab: key })
        }))
      }
    ],
    [canShowEngineeringIpl, canShowEngineeringStations, canShowLineBalancing, canViewPage, navLoading, navTo, t]
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
        onNavigate: () => navTo({ department: 'warehouses', warehousesTab: 'feeding' })
      }
    ],
    [canViewPage, navLoading, navTo, t]
  )

  function pagesForDepartment(dept: DepartmentId): NavPageItem[] {
    if (dept === 'production') return productionPages
    if (dept === 'engineering') return engineeringPages
    if (dept === 'warehouses') return warehousesPages
    return []
  }

  function isPageActive(dept: DepartmentId, pageKey: string): boolean {
    if (nav.showProfile) return false
    if (nav.department !== dept) return false
    if (dept === 'production') return nav.productionPage === pageKey
    if (dept === 'engineering') return nav.engineeringPage === pageKey
    if (dept === 'warehouses') return nav.warehousesTab === pageKey
    return false
  }

  function selectDepartment(dept: DepartmentId) {
    nav.selectDepartment(dept)
    nav.navigate({ showProfile: false })
  }

  return {
    productionPages,
    engineeringPages,
    warehousesPages,
    settingsPage,
    pagesForDepartment,
    isPageActive,
    selectDepartment,
    currentDepartment: nav.department,
    showProfile: nav.showProfile
  }
}
