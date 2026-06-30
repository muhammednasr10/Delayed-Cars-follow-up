import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Car,
  ClipboardList,
  FileUp,
  GraduationCap,
  Layers,
  ListTodo,
  LogIn,
  LogOut,
  Package,
  PackageX,
  PlusCircle,
  Route,
  Settings as SettingsIcon,
  Truck,
  Upload,
  Wrench,
  AlertOctagon
} from 'lucide-react'
import { useState } from 'react'
import type { HubSection } from '../Components/DepartmentHub'
import { useAuth } from '../Context/AuthContext'
import { usePermissions } from '../Context/PermissionsContext'
import { useNavigation } from '../Context/NavigationContext'
import { useCanAccessSettings } from './useCanAccessSettings'
import { useCanReportMissingPart } from './useCanReportMissingPart'
import { useMissingPartsVehicleCounts } from './useMissingPartsVehicleCounts'
import { useProductivityMonthCounts } from './useProductivityMonthCounts'
import { formatStopHoursForCard, useProductionStopMonthCounts } from './useProductionStopMonthCounts'
import { useLang } from '../i18n/LanguageContext'
import { SETTINGS_TAB_ORDER } from '../Types/navigation'

export function useGlobalHubSections(refreshKey = 0) {
  const { t } = useLang()
  const nav = useNavigation()
  const { canAccess: canAccessSettings } = useCanAccessSettings()
  const { canReport } = useCanReportMissingPart()
  const { hasRole } = useAuth()
  const { canViewModule, hasPermission, loading: permsLoading } = usePermissions()
  const [reportOpen, setReportOpen] = useState(false)
  const { activeVehicles, archiveVehicles, loading: countsLoading } = useMissingPartsVehicleCounts(refreshKey)
  const { entryVehicles, exitVehicles, loading: productivityLoading } = useProductivityMonthCounts(refreshKey)
  const { totalMinutes, lostVehicles: stopsLostVehicles, loading: stopsLoading } = useProductionStopMonthCounts(refreshKey)

  const canManageStops = hasRole('admin', 'production')

  const go = nav.navigate

  const canImportIpl =
    hasRole('admin') ||
    hasPermission('bom', 'import') ||
    hasPermission('bom', 'create') ||
    hasPermission('bom', 'manage')

  const canIpl = canAccessSettings
  const canStations = canAccessSettings || permsLoading || canViewModule('station_operations')
  const canLineBalancing = permsLoading || canViewModule('station_operations')

  const production: HubSection = {
    key: 'production',
    title: t('departments.production'),
    cards: [
      (permsLoading || canViewModule('missing_parts')) && {
        key: 'missing',
        title: t('modules.missingParts'),
        description: t('modules.missingPartsDesc'),
        icon: AlertTriangle,
        tone: 'text-red-300 bg-red-500/15',
        accent: 'red' as const,
        onClick: () => go({ department: 'production', productionArea: 'assembly', productionPage: 'missing' }),
        stats: [
          { label: t('home.missingActiveVehicles'), value: countsLoading ? '…' : activeVehicles },
          { label: t('home.missingArchiveVehicles'), value: countsLoading ? '…' : archiveVehicles }
        ],
        footerAction: canReport
          ? { label: t('home.reportMissing'), onClick: () => setReportOpen(true) }
          : undefined
      },
      (permsLoading || canViewModule('production')) && {
        key: 'entryProductivity',
        title: t('productivity.entryTitle'),
        description: t('productivity.entrySubtitle'),
        icon: LogIn,
        tone: 'text-emerald-300 bg-emerald-500/15',
        accent: 'emerald' as const,
        onClick: () =>
          go({
            department: 'production',
            productionArea: 'assembly',
            productionPage: 'vehicles',
            productivityTab: 'entry',
            productivitySubTab: 'monthly'
          }),
        stats: [{ label: t('home.productivityMonthVehicles'), value: productivityLoading ? '…' : entryVehicles }]
      },
      (permsLoading || canViewModule('production')) && {
        key: 'exitProductivity',
        title: t('productivity.exitTitle'),
        description: t('productivity.exitSubtitle'),
        icon: LogOut,
        tone: 'text-violet-300 bg-violet-500/15',
        accent: 'violet' as const,
        onClick: () =>
          go({
            department: 'production',
            productionArea: 'assembly',
            productionPage: 'vehicles',
            productivityTab: 'exit',
            productivitySubTab: 'monthly'
          }),
        stats: [{ label: t('home.productivityMonthVehicles'), value: productivityLoading ? '…' : exitVehicles }]
      },
      (permsLoading || canViewModule('production')) && {
        key: 'stops',
        title: t('productivity.tabs.stops'),
        description: t('productivity.stops.subtitle'),
        icon: AlertOctagon,
        tone: 'text-amber-300 bg-amber-500/15',
        accent: 'amber' as const,
        onClick: () =>
          go({
            department: 'production',
            productionArea: 'assembly',
            productionPage: 'vehicles',
            productivityTab: 'stops'
          }),
        stats: [
          { label: t('home.stopsMonthHours'), value: stopsLoading ? '…' : formatStopHoursForCard(totalMinutes) },
          { label: t('home.stopsMonthLost'), value: stopsLoading ? '…' : stopsLostVehicles }
        ],
        footerAction: canManageStops
          ? {
              label: t('home.registerStop'),
              onClick: () =>
                go({
                  department: 'production',
                  productionArea: 'assembly',
                  productionPage: 'vehicles',
                  productivityTab: 'stops',
                  productivityStopFormOpen: true
                })
            }
          : undefined
      },
      canReport && {
        key: 'reportMissing',
        title: t('home.reportMissing'),
        description: t('home.reportMissingDesc'),
        icon: PlusCircle,
        tone: 'text-cyan-300 bg-cyan-500/15',
        kind: 'action' as const,
        onClick: () => setReportOpen(true)
      },
      (permsLoading || canViewModule('production')) && {
        key: 'vehicles',
        title: t('modules.vehicles'),
        description: t('modules.vehiclesDesc'),
        icon: Car,
        tone: 'text-cyan-300 bg-cyan-500/15',
        onClick: () => go({ department: 'production', productionArea: 'assembly', productionPage: 'vehicles', productivityTab: 'orders' })
      },
      (permsLoading || canViewModule('training_matrix')) && {
        key: 'training',
        title: t('modules.training'),
        description: t('modules.trainingDesc'),
        icon: GraduationCap,
        tone: 'text-blue-300 bg-blue-500/15',
        onClick: () => go({ department: 'production', productionArea: 'assembly', productionPage: 'training', trainingTab: 'org' })
      },
      {
        key: 'damagedParts',
        title: t('modules.damagedParts'),
        description: t('modules.damagedPartsDesc'),
        icon: PackageX,
        tone: 'text-orange-300 bg-orange-500/15',
        onClick: () => go({ department: 'production', productionArea: 'assembly', productionPage: 'damagedParts' })
      },
      {
        key: 'missions',
        title: t('modules.missions'),
        description: t('modules.missionsDesc'),
        icon: ListTodo,
        tone: 'text-amber-300 bg-amber-500/15',
        onClick: () => go({ department: 'production', productionArea: 'assembly', productionPage: 'missions' })
      },
      {
        key: 'requests',
        title: t('modules.requests'),
        description: t('modules.requestsDesc'),
        icon: ClipboardList,
        tone: 'text-violet-300 bg-violet-500/15',
        onClick: () => go({ department: 'production', productionArea: 'assembly', productionPage: 'requests' })
      },
      canAccessSettings && {
        key: 'settings',
        title: t('modules.settings'),
        description: t('modules.settingsDesc'),
        icon: SettingsIcon,
        tone: 'text-emerald-300 bg-emerald-500/15',
        onClick: () => go({ department: 'production', productionArea: 'assembly', productionPage: 'settings', settingsTab: SETTINGS_TAB_ORDER[0] })
      }
    ].filter(Boolean) as HubSection['cards']
  }

  const engineering: HubSection = {
    key: 'engineering',
    title: t('departments.engineering'),
    cards: [
      canIpl && {
        key: 'importBom',
        title: t('bom.importTitle'),
        description: t('bom.importHint'),
        icon: FileUp,
        tone: 'text-cyan-300 bg-cyan-500/15',
        kind: 'action' as const,
        onClick: () => go({ department: 'engineering', engineeringPage: 'ipl', bomTab: 'import' })
      },
      canLineBalancing && {
        key: 'importTimeStudy',
        title: t('lineBalancing.tabs.import'),
        icon: Upload,
        tone: 'text-violet-300 bg-violet-500/15',
        kind: 'action' as const,
        onClick: () => go({ department: 'engineering', engineeringPage: 'lineBalancing', lineBalancingTab: 'import' })
      },
      canIpl && {
        key: 'ipl',
        title: t('nav.ipl'),
        description: t('hub.engineering.iplDesc'),
        icon: Layers,
        tone: 'text-orange-300 bg-orange-500/15',
        onClick: () => go({ department: 'engineering', engineeringPage: 'ipl', bomTab: 'parts' })
      },
      canStations && {
        key: 'stations',
        title: t('nav.stations'),
        description: t('settings.tabs.stations'),
        icon: Wrench,
        tone: 'text-amber-300 bg-amber-500/15',
        onClick: () => go({ department: 'production', productionArea: 'assembly', productionPage: 'settings', settingsTab: 'stations' })
      },
      canLineBalancing && {
        key: 'lineBalancing',
        title: t('nav.lineBalancing'),
        description: t('hub.engineering.lineBalancingDesc'),
        icon: Route,
        tone: 'text-violet-300 bg-violet-500/15',
        onClick: () => go({ department: 'engineering', engineeringPage: 'lineBalancing', lineBalancingTab: 'operations' })
      },
      canIpl && {
        key: 'iplDashboard',
        title: t('bom.tabs.dashboard'),
        icon: BarChart3,
        tone: 'text-blue-300 bg-blue-500/15',
        onClick: () => go({ department: 'engineering', engineeringPage: 'ipl', bomTab: 'dashboard' })
      }
    ].filter(Boolean) as HubSection['cards']
  }

  const warehouses: HubSection = {
    key: 'warehouses',
    title: t('departments.warehouses'),
    cards: [
      canImportIpl && {
        key: 'importIpl',
        title: t('warehouses.feeding.iplImportTitle'),
        description: t('warehouses.feeding.iplImportHint'),
        icon: FileUp,
        tone: 'text-cyan-300 bg-cyan-500/15',
        kind: 'action' as const,
        onClick: () => go({ department: 'warehouses', warehousesTab: 'feeding', warehousesFeedingSubTab: 'plan' })
      },
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
      },
      {
        key: 'feedingPlan',
        title: t('warehouses.feeding.subTabs.plan'),
        icon: CalendarDays,
        tone: 'text-violet-300 bg-violet-500/15',
        onClick: () => go({ department: 'warehouses', warehousesTab: 'feeding', warehousesFeedingSubTab: 'plan' })
      }
    ].filter(Boolean) as HubSection['cards']
  }

  return {
    sections: [production, engineering, warehouses],
    reportOpen,
    setReportOpen
  }
}
