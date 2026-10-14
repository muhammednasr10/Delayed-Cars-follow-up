import { AlertOctagon, AlertTriangle, CalendarClock, LogIn, LogOut } from 'lucide-react'
import type { HubCard, HubSection } from '../Components/DepartmentHub'
import { useAuth } from '../Context/AuthContext'
import { usePermissions } from '../Context/PermissionsContext'
import { homeProductivityCardVisible } from '../config/pageTabAccess'
import { isProductivityRecorder } from '../Utils/assemblyAreas'
import { useLang } from '../i18n/LanguageContext'
import type { ProductionArea } from '../Types/navigation'
import { PRODUCTION_AREA_ORDER } from '../Types/navigation'
import { useCanViewPage } from './useCanViewPage'
import { useProductionAreaCounts } from './useProductionAreaCounts'
import { useProductivityMonthCounts } from './useProductivityMonthCounts'
import { formatStopHoursForCard, useProductionStopMonthCounts } from './useProductionStopMonthCounts'

function areaLabels(t: (key: string) => string, area: ProductionArea) {
  return t(`departments.productionArea.${area}`)
}

function recordedAreaValue(
  area: ProductionArea,
  loading: boolean,
  values: { body: string; paint: string; assembly: string }
): string {
  if (area !== 'body' && area !== 'paint' && area !== 'assembly') return '—'
  if (loading) return '…'
  return values[area]
}

export function useProductionOverviewHubSections(refreshKey = 0) {
  const { t } = useLang()
  const { profile } = useAuth()
  const recorder = isProductivityRecorder(profile?.system_role_code, profile?.system_role_name_ar)
  const { canViewModule, loading: permsLoading, loadError } = usePermissions()
  const { canViewPage, loading: pagesLoading } = useCanViewPage()
  const loading = permsLoading || pagesLoading
  const moduleAllowed = (moduleKey: string) => loadError || canViewModule(moduleKey)
  const { attendance, openShortages, loading: areaLoading } = useProductionAreaCounts(refreshKey)
  const bodyLine = useProductivityMonthCounts(refreshKey, 'body')
  const paintLine = useProductivityMonthCounts(refreshKey, 'paint')
  const assemblyLine = useProductivityMonthCounts(refreshKey, 'assembly')
  const { totalMinutes, lostVehicles, loading: stopsLoading } = useProductionStopMonthCounts(refreshKey, 'all')

  const showHomeCard = (card: Parameters<typeof canViewPage>[0], _moduleOk = true) =>
    loading || loadError || homeProductivityCardVisible(card, canViewPage(card), recorder)

  const attendanceStats = PRODUCTION_AREA_ORDER.map(area => {
    const count = attendance?.[area]
    let value = '…'
    if (!areaLoading) {
      value = count ? `${count.present}/${count.workforce}` : '—'
    }
    return { label: areaLabels(t, area), value }
  })

  const missingStats = PRODUCTION_AREA_ORDER.map(area => {
    const count = openShortages?.[area]
    let value = '…'
    if (!areaLoading) value = count == null ? '—' : String(count)
    return { label: areaLabels(t, area), value }
  })

  const cards = [
    showHomeCard('production_home__attendance', moduleAllowed('training_matrix')) && {
      key: 'attendanceToday',
      title: t('home.attendanceTodayTitle'),
      description: t('hub.production.areaAttendanceHint'),
      icon: CalendarClock,
      tone: 'text-cyan-300 bg-cyan-500/15',
      accent: 'cyan' as const,
      stats: attendanceStats
    },
    showHomeCard('production_home__missing', moduleAllowed('missing_parts')) && {
      key: 'missing',
      title: t('modules.missingParts'),
      description: t('hub.production.areaMissingHint'),
      icon: AlertTriangle,
      tone: 'text-red-300 bg-red-500/15',
      accent: 'red' as const,
      stats: missingStats
    },
    showHomeCard('production_home__entry', moduleAllowed('production')) && {
      key: 'entryProductivity',
      title: t('home.entryProductivityShort'),
      description: t('hub.production.areaEntryHint'),
      icon: LogIn,
      tone: 'text-emerald-300 bg-emerald-500/15',
      accent: 'emerald' as const,
      stats: PRODUCTION_AREA_ORDER.map(area => ({
        label: areaLabels(t, area),
        value: recordedAreaValue(area, bodyLine.loading || paintLine.loading || assemblyLine.loading, {
          body: String(bodyLine.entryVehicles),
          paint: String(paintLine.entryVehicles),
          assembly: String(assemblyLine.entryVehicles)
        })
      }))
    },
    showHomeCard('production_home__exit', moduleAllowed('production')) && {
      key: 'exitProductivity',
      title: t('home.exitProductivityShort'),
      description: t('hub.production.areaEntryHint'),
      icon: LogOut,
      tone: 'text-cyan-300 bg-cyan-500/15',
      accent: 'cyan' as const,
      stats: PRODUCTION_AREA_ORDER.map(area => ({
        label: areaLabels(t, area),
        value: recordedAreaValue(area, bodyLine.loading || paintLine.loading || assemblyLine.loading, {
          body: String(bodyLine.exitVehicles),
          paint: String(paintLine.exitVehicles),
          assembly: String(assemblyLine.exitVehicles)
        })
      }))
    },
    showHomeCard('production_home__stops', moduleAllowed('production')) && {
      key: 'stops',
      title: t('productivity.tabs.stops'),
      description: t('hub.production.stopsTotalHint'),
      icon: AlertOctagon,
      tone: 'text-amber-300 bg-amber-500/15',
      accent: 'amber' as const,
      stats: [
        { label: t('home.stopsMonthHours'), value: stopsLoading ? '…' : formatStopHoursForCard(totalMinutes) },
        { label: t('home.stopsMonthLost'), value: stopsLoading ? '…' : String(lostVehicles) }
      ]
    }
  ].filter(Boolean) as HubCard[]

  const section: HubSection = { key: 'productionOverview', title: '', cards }
  return { sections: [section] }
}
