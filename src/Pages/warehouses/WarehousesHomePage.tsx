import { CalendarDays, Kanban, Package, ShoppingCart, Truck, Boxes, LayoutGrid } from 'lucide-react'
import { DepartmentHub, type HubSection } from '../../Components/DepartmentHub'
import { useLang } from '../../i18n/LanguageContext'
import { useNavigation } from '../../Context/NavigationContext'

export function WarehousesHomePage() {
  const { t } = useLang()
  const nav = useNavigation()
  const go = nav.navigate

  const pages: HubSection = {
    key: 'pages',
    title: t('hub.sections.pages'),
    cards: [
      {
        key: 'currentStock',
        title: t('warehouses.tabs.currentStock'),
        description: t('hub.warehouses.stockDesc'),
        icon: Package,
        tone: 'text-amber-300 bg-amber-500/15',
        onClick: () => go({ department: 'warehouses', warehousesTab: 'currentStock' })
      },
      {
        key: 'feeding',
        title: t('warehouses.tabs.feeding'),
        description: t('hub.warehouses.feedingDesc'),
        icon: Truck,
        tone: 'text-violet-300 bg-violet-500/15',
        onClick: () => go({ department: 'warehouses', warehousesTab: 'feeding' })
      }
    ]
  }

  const feedingTabs: HubSection = {
    key: 'feedingTabs',
    title: t('hub.sections.tabs', { page: t('warehouses.tabs.feeding') }),
    cards: [
      {
        key: 'plan',
        title: t('warehouses.feeding.subTabs.plan'),
        icon: CalendarDays,
        tone: 'text-violet-300 bg-violet-500/15',
        onClick: () => go({ department: 'warehouses', warehousesTab: 'feeding', warehousesFeedingSubTab: 'plan' })
      },
      {
        key: 'kanban',
        title: t('warehouses.kanban.title'),
        icon: Kanban,
        tone: 'text-cyan-300 bg-cyan-500/15',
        onClick: () => go({ department: 'warehouses', warehousesTab: 'feeding', warehousesFeedingSubTab: 'kanban' })
      },
      {
        key: 'actual',
        title: t('warehouses.feeding.subTabs.actual'),
        icon: Truck,
        tone: 'text-emerald-300 bg-emerald-500/15',
        onClick: () => go({ department: 'warehouses', warehousesTab: 'feeding', warehousesFeedingSubTab: 'actual' })
      }
    ]
  }

  const equipmentTabs: HubSection = {
    key: 'equipmentTabs',
    title: t('hub.sections.tabs', { page: t('warehouses.tabs.equipment') }),
    cards: [
      {
        key: 'racks',
        title: t('warehouses.equipment.subTabs.racks'),
        icon: LayoutGrid,
        tone: 'text-emerald-300 bg-emerald-500/15',
        onClick: () => go({ department: 'warehouses', warehousesTab: 'equipment', warehousesEquipmentSubTab: 'racks' })
      },
      {
        key: 'carts',
        title: t('warehouses.equipment.subTabs.carts'),
        icon: ShoppingCart,
        tone: 'text-amber-300 bg-amber-500/15',
        onClick: () => go({ department: 'warehouses', warehousesTab: 'equipment', warehousesEquipmentSubTab: 'carts' })
      }
    ]
  }

  const equipmentCard = {
    key: 'equipment',
    title: t('warehouses.tabs.equipment'),
    description: t('hub.warehouses.equipmentDesc'),
    icon: Boxes,
    tone: 'text-sky-300 bg-sky-500/15',
    onClick: () => go({ department: 'warehouses', warehousesTab: 'equipment', warehousesEquipmentSubTab: 'racks' })
  }

  return (
    <DepartmentHub
      title={t('hub.warehouses.title')}
      subtitle={t('hub.warehouses.subtitle')}
      sections={[{ ...pages, cards: [...pages.cards, equipmentCard] }, feedingTabs, equipmentTabs]}
    />
  )
}
