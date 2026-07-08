import {
  AlertTriangle,
  ClipboardList,
  GraduationCap,
  Layers,
  LayoutGrid,
  ListTodo,
  LogIn,
  LogOut,
  MessageSquareText,
  PackageX,
  Route,
  ScanLine,
  Users,
  Wrench,
  AlertOctagon,
  CalendarClock
} from 'lucide-react'
import { useState } from 'react'
import type { HubSection } from '../Components/DepartmentHub'
import { useAuth } from '../Context/AuthContext'
import { usePermissions } from '../Context/PermissionsContext'
import { useNavigation } from '../Context/NavigationContext'
import { useCanAccessSettings } from './useCanAccessSettings'
import { useCanReportMissingPart } from './useCanReportMissingPart'
import { useCanViewPage } from './useCanViewPage'
import { useMissingPartsVehicleCounts } from './useMissingPartsVehicleCounts'
import { useProductivityMonthCounts } from './useProductivityMonthCounts'
import { formatStopHoursForCard, useProductionStopMonthCounts } from './useProductionStopMonthCounts'
import { useTodayAttendanceEfficiency } from './useTodayAttendanceEfficiency'
import { useHomeCardMonthStats } from './useHomeCardMonthStats'
import { useLang } from '../i18n/LanguageContext'
import { buildAttendanceHubStats } from '../Utils/attendanceHubStats'

function formatCost(value: number | null, loading: boolean): string {
  if (loading) return '…'
  if (value == null) return '—'
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function formatEfficiencyPct(value: number | null, loading: boolean): string {
  if (loading) return '…'
  if (value == null) return '—'
  return `${value}%`
}

export function useGlobalHubSections(refreshKey = 0) {
  const { t } = useLang()
  const nav = useNavigation()
  const { canAccess: canAccessSettings } = useCanAccessSettings()
  const { canReport } = useCanReportMissingPart()
  const { hasRole } = useAuth()
  const { canViewModule, loading: permsLoading } = usePermissions()
  const { canViewPage, loading: pagesLoading } = useCanViewPage()
  const loading = permsLoading || pagesLoading
  const [reportOpen, setReportOpen] = useState(false)
  const { activeVehicles, archiveVehicles, loading: countsLoading } = useMissingPartsVehicleCounts(refreshKey)
  const { entryEfficiency, exitEfficiency, loading: productivityLoading } = useProductivityMonthCounts(refreshKey)
  const { totalMinutes, lostVehicles: stopsLostVehicles, loading: stopsLoading } = useProductionStopMonthCounts(refreshKey)
  const { efficiency, presentTodayCount, workforceCount, statusCounts, loading: attendanceLoading } =
    useTodayAttendanceEfficiency(refreshKey)
  const {
    plannedVehicles,
    workHours,
    ordersCount,
    damagedQty,
    damagedCost,
    scratchesCount,
    loading: monthStatsLoading
  } = useHomeCardMonthStats(refreshKey)

  const canManageStops = hasRole('admin', 'production')
  const go = nav.navigate
  const canLineBalancing = loading || canViewModule('station_operations')
  const showHomeCard = (card: Parameters<typeof canViewPage>[0], moduleOk = true) =>
    loading || (canViewPage(card) && moduleOk)

  /** ترتيب تدفق العمل: تخطيط → إنتاج → جودة → عمالة → هندسة → دعم */
  const home: HubSection = {
    key: 'home',
    title: '',
    cards: [
      showHomeCard('production_home__plan', canViewModule('production')) && {
        key: 'planOrders',
        title: t('productionOrders.title'),
        description: t('productionOrders.planSummary'),
        icon: LayoutGrid,
        tone: 'text-violet-300 bg-violet-500/15',
        accent: 'violet' as const,
        onClick: () => go({ department: 'planning', planningTab: 'plan' }),
        stats: [
          { label: t('home.planMonthVehicles'), value: monthStatsLoading ? '…' : String(plannedVehicles) },
          { label: t('home.planMonthHours'), value: monthStatsLoading ? '…' : String(workHours) }
        ]
      },
      showHomeCard('production_home__orders', canViewModule('production')) && {
        key: 'productionOrders',
        title: t('productionOrders.ordersSection'),
        description: t('productionOrders.ordersSectionHint'),
        icon: ClipboardList,
        tone: 'text-cyan-300 bg-cyan-500/15',
        accent: 'cyan' as const,
        onClick: () => go({ department: 'planning', planningTab: 'orders' }),
        stats: [{ label: t('home.ordersCountMonth'), value: monthStatsLoading ? '…' : String(ordersCount) }]
      },
      showHomeCard('production_home__entry', canViewModule('production')) && {
        key: 'productivity',
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
            productivityTab: 'productivity'
          }),
        stats: [
          { label: t('home.entryProductivityEfficiency'), value: formatEfficiencyPct(entryEfficiency, productivityLoading) },
          { label: t('home.exitProductivityEfficiency'), value: formatEfficiencyPct(exitEfficiency, productivityLoading) }
        ]
      },
      showHomeCard('production_home__stops', canViewModule('production')) && {
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
          { label: t('home.stopsMonthLost'), value: stopsLoading ? '…' : String(stopsLostVehicles) }
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
      showHomeCard('production_home__missing', canViewModule('missing_parts')) && {
        key: 'missing',
        title: t('modules.missingParts'),
        description: t('modules.missingPartsDesc'),
        icon: AlertTriangle,
        tone: 'text-red-300 bg-red-500/15',
        accent: 'red' as const,
        onClick: () => go({ department: 'production', productionArea: 'assembly', productionPage: 'missing' }),
        stats: [
          { label: t('home.missingActiveVehicles'), value: countsLoading ? '…' : String(activeVehicles) },
          { label: t('home.missingArchiveVehicles'), value: countsLoading ? '…' : String(archiveVehicles) }
        ],
        footerAction: canReport
          ? { label: t('home.reportMissing'), onClick: () => setReportOpen(true) }
          : undefined
      },
      showHomeCard('production_home__damaged') && {
        key: 'damagedParts',
        title: t('modules.damagedParts'),
        description: t('modules.damagedPartsDesc'),
        icon: PackageX,
        tone: 'text-orange-300 bg-orange-500/15',
        accent: 'orange' as const,
        onClick: () =>
          go({ department: 'production', productionArea: 'assembly', productionPage: 'damagedParts' }),
        stats: [
          { label: t('home.damagedQtyMonth'), value: monthStatsLoading ? '…' : String(damagedQty) },
          { label: t('home.damagedCostMonth'), value: formatCost(damagedCost, monthStatsLoading) }
        ]
      },
      showHomeCard('production_home__scratches') && {
        key: 'scratches',
        title: t('modules.scratches'),
        description: t('modules.scratchesDesc'),
        icon: ScanLine,
        tone: 'text-rose-300 bg-rose-500/15',
        accent: 'rose' as const,
        onClick: () =>
          go({ department: 'production', productionArea: 'assembly', productionPage: 'scratches' }),
        stats: [{ label: t('home.scratchesMonth'), value: monthStatsLoading ? '…' : String(scratchesCount) }]
      },
      showHomeCard('production_home__attendance', canViewModule('training_matrix')) && {
        key: 'attendanceToday',
        title: t('home.attendanceTodayTitle'),
        description: t('home.attendanceTodayDesc'),
        icon: CalendarClock,
        tone: 'text-cyan-300 bg-cyan-500/15',
        accent: 'cyan' as const,
        wide: true,
        onClick: () =>
          go({
            department: 'production',
            productionArea: 'assembly',
            productionPage: 'training',
            trainingTab: 'attendance',
            attendanceSubTab: 'today'
          }),
        stats: buildAttendanceHubStats(t, {
          loading: attendanceLoading,
          efficiency,
          presentTodayCount,
          workforceCount,
          statusCounts
        })
      },
      showHomeCard('production_home__training', canViewModule('training_matrix')) && {
        key: 'training',
        title: t('modules.training'),
        description: t('modules.trainingDesc'),
        icon: GraduationCap,
        tone: 'text-blue-300 bg-blue-500/15',
        accent: 'blue' as const,
        onClick: () =>
          go({ department: 'production', productionArea: 'assembly', productionPage: 'training', trainingTab: 'org' })
      },
      showHomeCard('production_home__manpower', canViewModule('training_matrix')) && {
        key: 'manpower',
        title: t('training.tabs.manpower'),
        description: t('manpower.sectionSubtitle'),
        icon: Users,
        tone: 'text-violet-300 bg-violet-500/15',
        accent: 'indigo' as const,
        onClick: () =>
          go({
            department: 'production',
            productionArea: 'assembly',
            productionPage: 'training',
            trainingTab: 'manpower'
          })
      },
      showHomeCard('production_home__equipment') && {
        key: 'equipment',
        title: t('modules.equipment'),
        description: t('modules.equipmentDesc'),
        icon: Wrench,
        tone: 'text-sky-300 bg-sky-500/15',
        accent: 'sky' as const,
        onClick: () =>
          go({ department: 'production', productionArea: 'assembly', productionPage: 'equipment' })
      },
      showHomeCard('production_home__ipl', canAccessSettings || canViewModule('bom')) && {
        key: 'ipl',
        title: t('nav.ipl'),
        description: t('hub.engineering.iplDesc'),
        icon: Layers,
        tone: 'text-orange-300 bg-orange-500/15',
        accent: 'orange' as const,
        onClick: () => go({ department: 'engineering', engineeringPage: 'ipl', bomTab: 'consolidated' })
      },
      showHomeCard('production_home__line_balancing', canLineBalancing) && {
        key: 'lineBalancing',
        title: t('nav.lineBalancing'),
        description: t('hub.engineering.lineBalancingDesc'),
        icon: Route,
        tone: 'text-violet-300 bg-violet-500/15',
        accent: 'indigo' as const,
        onClick: () =>
          go({ department: 'engineering', engineeringPage: 'lineBalancing', lineBalancingTab: 'operations' })
      },
      showHomeCard('production_home__missions') && {
        key: 'missions',
        title: t('modules.missions'),
        description: t('modules.missionsDesc'),
        icon: ListTodo,
        tone: 'text-amber-300 bg-amber-500/15',
        accent: 'amber' as const,
        onClick: () => go({ department: 'production', productionArea: 'assembly', productionPage: 'missions' })
      },
      showHomeCard('production_home__requests') && {
        key: 'requests',
        title: t('modules.requests'),
        description: t('modules.requestsDesc'),
        icon: ClipboardList,
        tone: 'text-violet-300 bg-violet-500/15',
        accent: 'violet' as const,
        onClick: () => go({ department: 'production', productionArea: 'assembly', productionPage: 'requests' })
      },
      showHomeCard('production_home__feedback') && {
        key: 'feedback',
        title: t('modules.feedback'),
        description: t('modules.feedbackDesc'),
        icon: MessageSquareText,
        tone: 'text-indigo-300 bg-indigo-500/15',
        accent: 'indigo' as const,
        onClick: () =>
          go({ department: 'production', productionArea: 'assembly', productionPage: 'feedback' })
      }
    ].filter(Boolean) as HubSection['cards']
  }

  return {
    sections: [home],
    reportOpen,
    setReportOpen
  }
}
