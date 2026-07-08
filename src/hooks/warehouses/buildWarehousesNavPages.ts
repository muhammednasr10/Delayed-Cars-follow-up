import type { LucideIcon } from 'lucide-react'
import type { NavPageItem } from '../useDepartmentNavPages'
import { pagePermForWarehouses } from '../../config/pageAccess'

type NavTo = (patch: Record<string, unknown>) => void

type BuildWarehousesNavPagesArgs = {
  t: (key: string) => string
  navLoading: boolean
  navTo: NavTo
  canViewPage: (key: ReturnType<typeof pagePermForWarehouses>) => boolean
  tabVisible: (parent: 'warehouses_feeding', tab: string) => boolean
  icons: {
    Home: LucideIcon
    Package: LucideIcon
    CalendarDays: LucideIcon
    Truck: LucideIcon
    Boxes: LucideIcon
  }
}

export function buildWarehousesNavPages({
  t,
  navLoading,
  navTo,
  canViewPage,
  tabVisible,
  icons
}: BuildWarehousesNavPagesArgs): NavPageItem[] {
  const { Home, Package, CalendarDays, Truck, Boxes } = icons
  const canView = (tab: string) => navLoading || Boolean(canViewPage(pagePermForWarehouses(tab as 'home')))

  return [
    {
      key: 'home',
      label: t('nav.home'),
      icon: Home,
      visible: canView('home'),
      onNavigate: () => navTo({ department: 'warehouses', warehousesTab: 'home' })
    },
    {
      key: 'currentStock',
      label: t('warehouses.tabs.currentStock'),
      icon: Package,
      visible: canView('currentStock'),
      onNavigate: () => navTo({ department: 'warehouses', warehousesTab: 'currentStock' })
    },
    {
      key: 'feedingPlan',
      label: t('warehouses.feeding.subTabs.plan'),
      icon: CalendarDays,
      visible: navLoading || (canViewPage(pagePermForWarehouses('feeding')) && tabVisible('warehouses_feeding', 'plan')),
      onNavigate: () => navTo({ department: 'warehouses', warehousesTab: 'feeding', warehousesFeedingSubTab: 'plan' })
    },
    {
      key: 'feedingActual',
      label: t('warehouses.feeding.subTabs.actual'),
      icon: Truck,
      visible: navLoading || (canViewPage(pagePermForWarehouses('feeding')) && tabVisible('warehouses_feeding', 'actual')),
      onNavigate: () => navTo({ department: 'warehouses', warehousesTab: 'feeding', warehousesFeedingSubTab: 'actual' })
    },
    {
      key: 'equipment',
      label: t('warehouses.tabs.equipment'),
      icon: Boxes,
      visible: canView('equipment'),
      onNavigate: () => navTo({ department: 'warehouses', warehousesTab: 'equipment', warehousesEquipmentSubTab: 'racks' }),
      children: (['racks', 'carts'] as const).map(key => ({
        key,
        label: t(`warehouses.equipment.subTabs.${key}`),
        visible: true,
        onClick: () => navTo({ department: 'warehouses', warehousesTab: 'equipment', warehousesEquipmentSubTab: key })
      }))
    }
  ]
}
