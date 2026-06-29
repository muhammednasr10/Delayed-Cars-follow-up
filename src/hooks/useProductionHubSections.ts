import {
  AlertTriangle,
  AlertOctagon,
  CalendarClock,
  Car,
  ClipboardList,
  GraduationCap,
  LayoutGrid,
  ListTodo,
  LogIn,
  LogOut,
  MessageSquareText,
  PackageX,
  PlusCircle,
  ScanLine,
  Settings as SettingsIcon,
  Users,
  Wrench
} from 'lucide-react'
import { useState } from 'react'
import type { HubSection } from '../Components/DepartmentHub'
import { useCanAccessSettings } from './useCanAccessSettings'
import { useCanReportMissingPart } from './useCanReportMissingPart'
import { usePermissions } from '../Context/PermissionsContext'
import { useNavigation } from '../Context/NavigationContext'
import { SETTINGS_TAB_ORDER } from '../Types/navigation'
import { useLang } from '../i18n/LanguageContext'

export function useProductionHubSections() {
  const { t } = useLang()
  const nav = useNavigation()
  const { canAccess: canAccessSettings } = useCanAccessSettings()
  const { canReport } = useCanReportMissingPart()
  const { canViewModule, loading: permsLoading } = usePermissions()
  const [reportOpen, setReportOpen] = useState(false)

  const go = nav.navigate

  const actions: HubSection = {
    key: 'actions',
    title: t('hub.sections.actions'),
    cards: [
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
        key: 'addEntry',
        title: t('productivity.addVehicleCta'),
        description: t('productivity.addVehicleCtaHint'),
        icon: LogIn,
        tone: 'text-emerald-300 bg-emerald-500/15',
        kind: 'action' as const,
        onClick: () => go({ productionArea: 'assembly', productionPage: 'vehicles', productivityTab: 'entry' })
      },
      (permsLoading || canViewModule('production')) && {
        key: 'recordExit',
        title: t('productivity.exitTitle'),
        description: t('productivity.exitSubtitle'),
        icon: LogOut,
        tone: 'text-violet-300 bg-violet-500/15',
        kind: 'action' as const,
        onClick: () => go({ productionArea: 'assembly', productionPage: 'vehicles', productivityTab: 'exit' })
      }
    ].filter(Boolean) as HubSection['cards']
  }

  const pages: HubSection = {
    key: 'pages',
    title: t('hub.sections.pages'),
    cards: [
      (permsLoading || canViewModule('missing_parts')) && {
        key: 'missing',
        title: t('modules.missingParts'),
        description: t('modules.missingPartsDesc'),
        icon: AlertTriangle,
        tone: 'text-red-300 bg-red-500/15',
        onClick: () => go({ productionArea: 'assembly', productionPage: 'missing' })
      },
      (permsLoading || canViewModule('production')) && {
        key: 'vehicles',
        title: t('modules.vehicles'),
        description: t('modules.vehiclesDesc'),
        icon: Car,
        tone: 'text-cyan-300 bg-cyan-500/15',
        onClick: () => go({ productionArea: 'assembly', productionPage: 'vehicles', productivityTab: 'orders' })
      },
      (permsLoading || canViewModule('training_matrix')) && {
        key: 'training',
        title: t('modules.training'),
        description: t('modules.trainingDesc'),
        icon: GraduationCap,
        tone: 'text-blue-300 bg-blue-500/15',
        onClick: () => go({ productionArea: 'assembly', productionPage: 'training', trainingTab: 'org' })
      },
      {
        key: 'damagedParts',
        title: t('modules.damagedParts'),
        description: t('modules.damagedPartsDesc'),
        icon: PackageX,
        tone: 'text-orange-300 bg-orange-500/15',
        onClick: () => go({ productionArea: 'assembly', productionPage: 'damagedParts' })
      },
      {
        key: 'missions',
        title: t('modules.missions'),
        description: t('modules.missionsDesc'),
        icon: ListTodo,
        tone: 'text-amber-300 bg-amber-500/15',
        onClick: () => go({ productionArea: 'assembly', productionPage: 'missions' })
      },
      {
        key: 'requests',
        title: t('modules.requests'),
        description: t('modules.requestsDesc'),
        icon: ClipboardList,
        tone: 'text-violet-300 bg-violet-500/15',
        onClick: () => go({ productionArea: 'assembly', productionPage: 'requests' })
      },
      {
        key: 'scratches',
        title: t('modules.scratches'),
        description: t('modules.scratchesDesc'),
        icon: ScanLine,
        tone: 'text-rose-300 bg-rose-500/15',
        onClick: () => go({ productionArea: 'assembly', productionPage: 'scratches' })
      },
      {
        key: 'equipment',
        title: t('modules.equipment'),
        description: t('modules.equipmentDesc'),
        icon: Wrench,
        tone: 'text-sky-300 bg-sky-500/15',
        onClick: () => go({ productionArea: 'assembly', productionPage: 'equipment' })
      },
      {
        key: 'feedback',
        title: t('modules.feedback'),
        description: t('modules.feedbackDesc'),
        icon: MessageSquareText,
        tone: 'text-indigo-300 bg-indigo-500/15',
        onClick: () => go({ productionArea: 'assembly', productionPage: 'feedback' })
      },
      canAccessSettings && {
        key: 'settings',
        title: t('modules.settings'),
        description: t('modules.settingsDesc'),
        icon: SettingsIcon,
        tone: 'text-emerald-300 bg-emerald-500/15',
        onClick: () => go({ productionArea: 'assembly', productionPage: 'settings', settingsTab: 'administrations' })
      }
    ].filter(Boolean) as HubSection['cards']
  }

  const productivityTabs: HubSection = {
    key: 'productivityTabs',
    title: t('hub.sections.tabs', { page: t('nav.productivity') }),
    cards: (permsLoading || canViewModule('production'))
      ? [
          { key: 'orders', title: t('productivity.tabs.orders'), icon: ClipboardList, tone: 'text-cyan-300 bg-cyan-500/15', onClick: () => go({ productionArea: 'assembly', productionPage: 'vehicles', productivityTab: 'orders' }) },
          { key: 'entry', title: t('productivity.tabs.entry'), icon: LogIn, tone: 'text-cyan-300 bg-cyan-500/15', onClick: () => go({ productionArea: 'assembly', productionPage: 'vehicles', productivityTab: 'entry' }) },
          { key: 'exit', title: t('productivity.tabs.exit'), icon: LogOut, tone: 'text-cyan-300 bg-cyan-500/15', onClick: () => go({ productionArea: 'assembly', productionPage: 'vehicles', productivityTab: 'exit' }) },
          { key: 'stops', title: t('productivity.tabs.stops'), icon: AlertOctagon, tone: 'text-red-300 bg-red-500/15', onClick: () => go({ productionArea: 'assembly', productionPage: 'vehicles', productivityTab: 'stops' }) },
          { key: 'workDays', title: t('productionOrders.tabs.workDays'), icon: CalendarClock, tone: 'text-violet-300 bg-violet-500/15', onClick: () => go({ productionArea: 'assembly', productionPage: 'vehicles', productivityTab: 'workDays' }) },
          { key: 'planOrders', title: t('productionOrders.tabs.planOrders'), icon: LayoutGrid, tone: 'text-violet-300 bg-violet-500/15', onClick: () => go({ productionArea: 'assembly', productionPage: 'vehicles', productivityTab: 'orders', productionPlanTab: 'planOrders' }) }
        ]
      : []
  }

  const trainingTabs: HubSection = {
    key: 'trainingTabs',
    title: t('hub.sections.tabs', { page: t('nav.training') }),
    cards: (permsLoading || canViewModule('training_matrix'))
      ? (['org', 'attendance', 'manpower', 'operations', 'stationSkills', 'matrix', 'qualification', 'expiry'] as const).map(key => ({
          key,
          title: t(`training.tabs.${key}`),
          icon: Users,
          tone: 'text-blue-300 bg-blue-500/15',
          onClick: () => go({ productionArea: 'assembly', productionPage: 'training', trainingTab: key })
        }))
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
          onClick: () => go({ productionArea: 'assembly', productionPage: 'settings', settingsTab: key })
        }))
      : []
  }

  return {
    sections: [actions, pages, productivityTabs, trainingTabs, settingsTabs],
    reportOpen,
    setReportOpen
  }
}
