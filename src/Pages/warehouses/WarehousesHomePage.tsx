import { CalendarDays, FileUp, Package, Truck } from 'lucide-react'
import { DepartmentHub, type HubSection } from '../../Components/DepartmentHub'
import { useLang } from '../../i18n/LanguageContext'
import { useNavigation } from '../../Context/NavigationContext'
import { useAuth } from '../../Context/AuthContext'
import { usePermissions } from '../../Context/PermissionsContext'

export function WarehousesHomePage() {
  const { t } = useLang()
  const nav = useNavigation()
  const { hasRole } = useAuth()
  const { hasPermission } = usePermissions()

  const canImportIpl =
    hasRole('admin') ||
    hasPermission('bom', 'import') ||
    hasPermission('bom', 'create') ||
    hasPermission('bom', 'manage')

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
        key: 'actual',
        title: t('warehouses.feeding.subTabs.actual'),
        icon: Truck,
        tone: 'text-emerald-300 bg-emerald-500/15',
        onClick: () => go({ department: 'warehouses', warehousesTab: 'feeding', warehousesFeedingSubTab: 'actual' })
      }
    ]
  }

  const actions: HubSection = {
    key: 'actions',
    title: t('hub.sections.actions'),
    cards: [
      canImportIpl && {
        key: 'importIpl',
        title: t('warehouses.feeding.iplImportTitle'),
        description: t('warehouses.feeding.iplImportHint'),
        icon: FileUp,
        tone: 'text-cyan-300 bg-cyan-500/15',
        kind: 'action' as const,
        onClick: () => go({ department: 'warehouses', warehousesTab: 'feeding', warehousesFeedingSubTab: 'plan' })
      }
    ].filter(Boolean) as HubSection['cards']
  }

  return (
    <DepartmentHub
      title={t('hub.warehouses.title')}
      subtitle={t('hub.warehouses.subtitle')}
      sections={[pages, feedingTabs, actions]}
    />
  )
}
