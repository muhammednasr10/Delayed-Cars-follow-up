import {
  AlertTriangle,
  AlertOctagon,
  CalendarClock,
  ClipboardList,
  GraduationCap,
  ListTodo,
  LogIn,
  LogOut,
  MessageSquareText,
  PackageX,
  ScanLine,
  Settings as SettingsIcon,
  Users,
  Wrench
} from 'lucide-react'
import { useState } from 'react'
import type { HubSection } from '../Components/DepartmentHub'
import { useAuth } from '../Context/AuthContext'
import { useCanAccessSettings } from './useCanAccessSettings'
import { useCanReportMissingPart } from './useCanReportMissingPart'
import { useCanViewPage } from './useCanViewPage'
import { useMissingPartsVehicleCounts } from './useMissingPartsVehicleCounts'
import { useProductivityMonthCounts } from './useProductivityMonthCounts'
import { formatStopHoursForCard, useProductionStopMonthCounts } from './useProductionStopMonthCounts'
import { useTodayAttendanceEfficiency } from './useTodayAttendanceEfficiency'
import { usePermissions } from '../Context/PermissionsContext'
import { useNavigation } from '../Context/NavigationContext'
import { buildAttendanceHubStats } from '../Utils/attendanceHubStats'
import { SETTINGS_TAB_ORDER } from '../Types/navigation'
import { useLang } from '../i18n/LanguageContext'

export function useProductionHubSections(refreshKey = 0) {
  const { t } = useLang()
  const nav = useNavigation()
  const { hasRole } = useAuth()
  const { canAccess: canAccessSettings } = useCanAccessSettings()
  const { canReport } = useCanReportMissingPart()
  const { canViewModule, loading: permsLoading } = usePermissions()
  const { canViewPage, loading: pagesLoading } = useCanViewPage()
  const loading = permsLoading || pagesLoading
  const showHomeCard = (card: Parameters<typeof canViewPage>[0], moduleOk = true) =>
    loading || (canViewPage(card) && moduleOk)
  const [reportOpen, setReportOpen] = useState(false)
  const { activeVehicles, archiveVehicles, loading: countsLoading } = useMissingPartsVehicleCounts(refreshKey)
  const { entryVehicles, exitVehicles, loading: productivityLoading } = useProductivityMonthCounts(refreshKey)
  const { totalMinutes, lostVehicles: stopsLostVehicles, loading: stopsLoading } = useProductionStopMonthCounts(refreshKey)
  const { efficiency, presentTodayCount, workforceCount, statusCounts, loading: attendanceLoading } =
    useTodayAttendanceEfficiency(refreshKey)

  const canManageStops = hasRole('admin', 'production')

  const go = nav.navigate

  const overview: HubSection = {
    key: 'overview',
    title: t('hub.sections.overview'),
    cards: [
      showHomeCard('production_home__missing', canViewModule('missing_parts')) && {
        key: 'missing',
        title: t('modules.missingParts'),
        description: t('modules.missingPartsDesc'),
        icon: AlertTriangle,
        tone: 'text-red-300 bg-red-500/15',
        accent: 'red' as const,
        onClick: () => go({ productionArea: 'assembly', productionPage: 'missing' }),
        stats: [
          { label: t('home.missingActiveVehicles'), value: countsLoading ? '…' : activeVehicles },
          { label: t('home.missingArchiveVehicles'), value: countsLoading ? '…' : archiveVehicles }
        ],
        footerAction: canReport
          ? { label: t('home.reportMissing'), onClick: () => setReportOpen(true) }
          : undefined
      },
      showHomeCard('production_home__entry', canViewModule('production')) && {
        key: 'productivity',
        title: t('productivity.title'),
        description: t('productivity.subtitle'),
        icon: LogIn,
        tone: 'text-emerald-300 bg-emerald-500/15',
        accent: 'emerald' as const,
        onClick: () =>
          go({
            productionArea: 'assembly',
            productionPage: 'vehicles',
            productivityTab: 'productivity'
          }),
        stats: [
          { label: t('home.productivityMonthVehicles'), value: productivityLoading ? '…' : entryVehicles },
          { label: t('productivity.exitTitle'), value: productivityLoading ? '…' : exitVehicles }
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
                  productionArea: 'assembly',
                  productionPage: 'vehicles',
                  productivityTab: 'stops',
                  productivityStopFormOpen: true
                })
            }
          : undefined
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
      }
    ].filter(Boolean) as HubSection['cards']
  }

  const pages: HubSection = {
    key: 'pages',
    title: t('hub.sections.pages'),
    cards: [
      showHomeCard('production_home__training', canViewModule('training_matrix')) && {
        key: 'training',
        title: t('modules.training'),
        description: t('modules.trainingDesc'),
        icon: GraduationCap,
        tone: 'text-blue-300 bg-blue-500/15',
        accent: 'blue' as const,
        onClick: () => go({ productionArea: 'assembly', productionPage: 'training', trainingTab: 'org' })
      },
      showHomeCard('production_home__damaged') && {
        key: 'damagedParts',
        title: t('modules.damagedParts'),
        description: t('modules.damagedPartsDesc'),
        icon: PackageX,
        tone: 'text-orange-300 bg-orange-500/15',
        accent: 'orange' as const,
        onClick: () => go({ productionArea: 'assembly', productionPage: 'damagedParts' })
      },
      showHomeCard('production_home__missions') && {
        key: 'missions',
        title: t('modules.missions'),
        description: t('modules.missionsDesc'),
        icon: ListTodo,
        tone: 'text-amber-300 bg-amber-500/15',
        accent: 'amber' as const,
        onClick: () => go({ productionArea: 'assembly', productionPage: 'missions' })
      },
      showHomeCard('production_home__requests') && {
        key: 'requests',
        title: t('modules.requests'),
        description: t('modules.requestsDesc'),
        icon: ClipboardList,
        tone: 'text-violet-300 bg-violet-500/15',
        accent: 'violet' as const,
        onClick: () => go({ productionArea: 'assembly', productionPage: 'requests' })
      },
      showHomeCard('production_home__scratches') && {
        key: 'scratches',
        title: t('modules.scratches'),
        description: t('modules.scratchesDesc'),
        icon: ScanLine,
        tone: 'text-rose-300 bg-rose-500/15',
        accent: 'rose' as const,
        onClick: () => go({ productionArea: 'assembly', productionPage: 'scratches' })
      },
      showHomeCard('production_home__equipment') && {
        key: 'equipment',
        title: t('modules.equipment'),
        description: t('modules.equipmentDesc'),
        icon: Wrench,
        tone: 'text-sky-300 bg-sky-500/15',
        accent: 'sky' as const,
        onClick: () => go({ productionArea: 'assembly', productionPage: 'equipment' })
      },
      showHomeCard('production_home__feedback') && {
        key: 'feedback',
        title: t('modules.feedback'),
        description: t('modules.feedbackDesc'),
        icon: MessageSquareText,
        tone: 'text-indigo-300 bg-indigo-500/15',
        accent: 'indigo' as const,
        onClick: () => go({ productionArea: 'assembly', productionPage: 'feedback' })
      },
      showHomeCard('production_home__settings', canAccessSettings) && {
        key: 'settings',
        title: t('modules.settings'),
        description: t('modules.settingsDesc'),
        icon: SettingsIcon,
        tone: 'text-emerald-300 bg-emerald-500/15',
        accent: 'emerald' as const,
        onClick: () => go({ productionArea: 'assembly', productionPage: 'settings', settingsTab: 'administrations' })
      }
    ].filter(Boolean) as HubSection['cards']
  }

  const productivityTabAccents = ['emerald', 'red'] as const
  const productivityTabs: HubSection = {
    key: 'productivityTabs',
    title: t('hub.sections.tabs', { page: t('nav.productivity') }),
    cards: (permsLoading || canViewModule('production'))
      ? (
          [
            {
              key: 'productivity',
              title: t('productivity.tabs.productivity'),
              icon: CalendarClock,
              onClick: () => go({ productionArea: 'assembly', productionPage: 'vehicles', productivityTab: 'productivity' })
            },
            {
              key: 'stops',
              title: t('productivity.tabs.stops'),
              icon: AlertOctagon,
              onClick: () => go({ productionArea: 'assembly', productionPage: 'vehicles', productivityTab: 'stops' })
            }
          ] as const
        ).map((card, i) => ({
          ...card,
          tone: 'text-cyan-300 bg-cyan-500/15',
          accent: productivityTabAccents[i] ?? ('cyan' as const)
        }))
      : []
  }

  const trainingAccents = ['blue', 'cyan', 'violet', 'amber', 'emerald', 'indigo', 'sky', 'orange'] as const
  const trainingTabs: HubSection = {
    key: 'trainingTabs',
    title: t('hub.sections.tabs', { page: t('nav.training') }),
    cards: (permsLoading || canViewModule('training_matrix'))
      ? (['org', 'attendance', 'manpower', 'operations', 'stationSkills', 'matrix', 'qualification', 'expiry'] as const).map(
          (key, i) => ({
            key,
            title: t(`training.tabs.${key}`),
            icon: Users,
            tone: 'text-blue-300 bg-blue-500/15',
            accent: trainingAccents[i] ?? ('blue' as const),
            onClick: () => go({ productionArea: 'assembly', productionPage: 'training', trainingTab: key })
          })
        )
      : []
  }

  const settingsTabs: HubSection = {
    key: 'settingsTabs',
    title: t('hub.sections.tabs', { page: t('nav.settings') }),
    cards: canAccessSettings
      ? SETTINGS_TAB_ORDER.map(key => ({
          key,
          title: t(`settings.tabs.${key}`),
          icon: SettingsIcon,
          tone: 'text-emerald-300 bg-emerald-500/15',
          accent: 'emerald' as const,
          onClick: () => go({ productionArea: 'assembly', productionPage: 'settings', settingsTab: key })
        }))
      : []
  }

  return {
    sections: [overview, pages, productivityTabs, trainingTabs, settingsTabs].filter(s => s.cards.length > 0),
    reportOpen,
    setReportOpen
  }
}
