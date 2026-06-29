import {
  BarChart3,
  BookOpen,
  ClipboardList,
  FileUp,
  GitCompare,
  Layers,
  Map,
  Route,
  Settings2,
  Timer,
  Upload,
  Users,
  Wrench
} from 'lucide-react'
import { DepartmentHub, type HubSection } from '../../Components/DepartmentHub'
import { useLang } from '../../i18n/LanguageContext'
import { useNavigation } from '../../Context/NavigationContext'
import { useCanAccessSettings } from '../../hooks/useCanAccessSettings'
import { usePermissions } from '../../Context/PermissionsContext'

export function EngineeringHomePage() {
  const { t } = useLang()
  const nav = useNavigation()
  const { canAccess: canAccessSettings } = useCanAccessSettings()
  const { canViewModule, loading: permsLoading } = usePermissions()

  const canIpl = canAccessSettings
  const canStations = canAccessSettings || permsLoading || canViewModule('station_operations')
  const canLineBalancing = permsLoading || canViewModule('station_operations')
  const canSop = permsLoading || canViewModule('station_operations')

  const go = nav.navigate

  const pages: HubSection = {
    key: 'pages',
    title: t('hub.sections.pages'),
    cards: [
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
      canSop && {
        key: 'sop',
        title: t('nav.sop'),
        description: t('hub.engineering.sopDesc'),
        icon: BookOpen,
        tone: 'text-fuchsia-300 bg-fuchsia-500/15',
        onClick: () => go({ department: 'engineering', engineeringPage: 'sop' })
      }
    ].filter(Boolean) as HubSection['cards']
  }

  const iplTabs: HubSection = {
    key: 'iplTabs',
    title: t('hub.sections.tabs', { page: t('nav.ipl') }),
    cards: canIpl
      ? (
          [
            { key: 'parts', tab: 'parts' as const, icon: ClipboardList, tone: 'text-cyan-300 bg-cyan-500/15' },
            { key: 'partsGd', tab: 'partsGd' as const, icon: ClipboardList, tone: 'text-emerald-300 bg-emerald-500/15' },
            { key: 'compare', tab: 'compare' as const, icon: GitCompare, tone: 'text-blue-300 bg-blue-500/15' },
            { key: 'categories', tab: 'categories' as const, icon: Settings2, tone: 'text-emerald-300 bg-emerald-500/15' },
            { key: 'import', tab: 'import' as const, icon: FileUp, tone: 'text-amber-300 bg-amber-500/15' },
            { key: 'dashboard', tab: 'dashboard' as const, icon: BarChart3, tone: 'text-violet-300 bg-violet-500/15' }
          ] as const
        ).map(item => ({
          key: item.key,
          title: t(`bom.tabs.${item.key}`),
          icon: item.icon,
          tone: item.tone,
          onClick: () => go({ department: 'engineering', engineeringPage: 'ipl', bomTab: item.tab })
        }))
      : []
  }

  const lbTabs: HubSection = {
    key: 'lbTabs',
    title: t('hub.sections.tabs', { page: t('nav.lineBalancing') }),
    cards: canLineBalancing
      ? (
          [
            { key: 'operations', tab: 'operations' as const, icon: ClipboardList },
            { key: 'opParts', tab: 'opParts' as const, icon: Layers },
            { key: 'timeStudy', tab: 'timeStudy' as const, icon: Timer },
            { key: 'routing', tab: 'routing' as const, icon: Map },
            { key: 'manpower', tab: 'manpower' as const, icon: Users },
            { key: 'import', tab: 'import' as const, icon: Upload }
          ] as const
        ).map(item => ({
          key: item.key,
          title: t(`lineBalancing.tabs.${item.key}`),
          icon: item.icon,
          tone: 'text-slate-300 bg-slate-700/50',
          onClick: () => go({ department: 'engineering', engineeringPage: 'lineBalancing', lineBalancingTab: item.tab })
        }))
      : []
  }

  const actions: HubSection = {
    key: 'actions',
    title: t('hub.sections.actions'),
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
      }
    ].filter(Boolean) as HubSection['cards']
  }

  return (
    <DepartmentHub
      title={t('hub.engineering.title')}
      subtitle={t('hub.engineering.subtitle')}
      sections={[pages, iplTabs, lbTabs, actions]}
    />
  )
}
