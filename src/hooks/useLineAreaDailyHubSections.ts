import { AlertOctagon, AlertTriangle, CalendarClock, LogIn, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { HubCard, HubSection } from '../Components/DepartmentHub'
import { useAuth } from '../Context/AuthContext'
import { useNavigation } from '../Context/NavigationContext'
import { usePermissions } from '../Context/PermissionsContext'
import { useLang } from '../i18n/LanguageContext'
import {
  computeDailyAttendanceEfficiency,
  countPresentToday,
  countTodayAttendanceByStatus,
  getAttendanceDaysForDate,
  localTodayIso
} from '../services/attendanceService'
import { getEmployees } from '../services/employeesService'
import { getFactoryOrgUnits } from '../services/factoryOrgService'
import { getMissingParts } from '../services/missingPartsService'
import { getProductionPlanDayType } from '../services/productionPlanWorkDayDailyService'
import { buildAttendanceHubStats } from '../Utils/attendanceHubStats'
import { shortageVehicleCountsByArea, workforceIdsForArea } from '../Utils/productionAreaCounts'
import { useCanReportMissingPart } from './useCanReportMissingPart'
import { useCanViewPage } from './useCanViewPage'
import { useProductivityMonthCounts } from './useProductivityMonthCounts'
import { formatStopHoursForCard, useProductionStopMonthCounts } from './useProductionStopMonthCounts'

const DASH = '—'

function formatEfficiencyPct(value: number | null, loading: boolean): string {
  if (loading) return '…'
  if (value == null) return '—'
  return `${value}%`
}

type LineHomeArea = 'body' | 'paint'

/** كروت البودي أو الدهان: الحضور والدخول والخروج والتوقفات، والدهان يزيد النواقص. */
export function useLineAreaDailyHubSections(area: LineHomeArea, refreshKey = 0) {
  const { t } = useLang()
  const nav = useNavigation()
  const { canReport } = useCanReportMissingPart()
  const { hasRole } = useAuth()
  const { canViewModule, loading: permsLoading, loadError } = usePermissions()
  const { canViewPage, loading: pagesLoading } = useCanViewPage()
  const loading = permsLoading || pagesLoading
  const moduleAllowed = (moduleKey: string) => loadError || canViewModule(moduleKey)
  const [attendanceLoading, setAttendanceLoading] = useState(true)
  const [areaMissing, setAreaMissing] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [missingLoading, setMissingLoading] = useState(area === 'paint')
  const [missingCounts, setMissingCounts] = useState<{ active: number; archive: number } | null>(null)
  const [efficiency, setEfficiency] = useState<number | null>(null)
  const [presentTodayCount, setPresentTodayCount] = useState(0)
  const [workforceCount, setWorkforceCount] = useState(0)
  const [statusCounts, setStatusCounts] = useState({
    vacation: 0,
    sick: 0,
    absent: 0,
    permission: 0,
    late: 0
  })
  useEffect(() => {
    let cancelled = false
    const today = localTodayIso()
    const now = new Date()
    setAttendanceLoading(true)
    void Promise.all([
      getEmployees(),
      getFactoryOrgUnits({ includeInactive: true }),
      getAttendanceDaysForDate(today),
      getProductionPlanDayType(today)
    ])
      .then(([employees, orgUnits, days, planDayType]) => {
        if (cancelled) return
        const ids = workforceIdsForArea(employees, orgUnits, area)
        setAreaMissing(ids == null)
        const activeIds = ids ?? []
        const activeIdSet = new Set(activeIds)
        const dayRecords = days
          .filter(record => activeIdSet.has(record.employeeId))
          .map(record => ({
            employeeId: record.employeeId,
            workDate: record.workDate,
            status: record.status
          }))
        const planDayByDate = new Map(planDayType ? [[today, planDayType]] : [])
        const effMap = computeDailyAttendanceEfficiency(
          activeIds,
          now.getFullYear(),
          now.getMonth() + 1,
          dayRecords,
          today,
          planDayByDate
        )
        setEfficiency(ids == null ? null : (effMap.get(today) ?? null))
        setPresentTodayCount(ids == null ? 0 : countPresentToday(activeIds, dayRecords, today, planDayType))
        setWorkforceCount(activeIds.length)
        setStatusCounts(
          ids == null
            ? { vacation: 0, sick: 0, absent: 0, permission: 0, late: 0 }
            : countTodayAttendanceByStatus(activeIds, dayRecords, today)
        )
      })
      .catch(() => {
        if (!cancelled) {
          setAreaMissing(true)
          setEfficiency(null)
          setPresentTodayCount(0)
          setWorkforceCount(0)
        }
      })
      .finally(() => {
        if (!cancelled) setAttendanceLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [area, refreshKey])

  useEffect(() => {
    if (area !== 'paint') return
    let cancelled = false
    setMissingLoading(true)
    void Promise.all([getMissingParts(), getFactoryOrgUnits({ includeInactive: true })])
      .then(([parts, orgUnits]) => {
        if (cancelled) return
        const counts = shortageVehicleCountsByArea(parts, orgUnits, 'paint')
        setMissingCounts(counts)
      })
      .catch(() => {
        if (!cancelled) setMissingCounts(null)
      })
      .finally(() => {
        if (!cancelled) setMissingLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [area, refreshKey])

  const showHomeCard = (card: Parameters<typeof canViewPage>[0], moduleOk = true) =>
    loading || loadError || (canViewPage(card) && moduleOk)
  const go = nav.navigate
  const canManageStops = hasRole('admin', 'production')
  const {
    entryVehicles,
    exitVehicles,
    entryEfficiency,
    exitEfficiency,
    loading: productivityLoading
  } = useProductivityMonthCounts(refreshKey, area)
  const {
    totalMinutes,
    lostVehicles: stopsLostVehicles,
    loading: stopsLoading
  } = useProductionStopMonthCounts(refreshKey, area)

  const attendanceStats = buildAttendanceHubStats(t, {
    loading: attendanceLoading,
    efficiency,
    presentTodayCount,
    workforceCount,
    statusCounts
  }).map(stat => (areaMissing && !attendanceLoading ? { ...stat, value: DASH } : stat))

  const cards = [
    showHomeCard('production_home__attendance', moduleAllowed('training_matrix')) && {
      key: 'attendanceToday',
      title: t('home.attendanceTodayTitle'),
      description: t(`hub.${area}.attendanceDesc`),
      icon: CalendarClock,
      tone: 'text-cyan-300 bg-cyan-500/15',
      accent: 'cyan' as const,
      wide: true,
      onClick: () =>
        go({
          department: 'production',
          productionArea: area,
          productionPage: 'training',
          trainingTab: 'attendance',
          attendanceSubTab: 'today'
        }),
      stats: attendanceStats
    },
    area === 'paint' &&
      showHomeCard('production_home__missing', moduleAllowed('missing_parts')) && {
        key: 'missing',
        title: t('modules.missingParts'),
        description: t('modules.missingPartsDesc'),
        icon: AlertTriangle,
        tone: 'text-red-300 bg-red-500/15',
        accent: 'red' as const,
        onClick: () =>
          go({
            department: 'production',
            productionArea: 'paint',
            productionPage: 'missing'
          }),
        stats: [
          {
            label: t('home.missingActiveVehicles'),
            value: missingLoading || !missingCounts ? (missingLoading ? '…' : DASH) : String(missingCounts.active)
          },
          {
            label: t('home.missingArchiveVehicles'),
            value: missingLoading || !missingCounts ? (missingLoading ? '…' : DASH) : String(missingCounts.archive)
          }
        ],
        footerAction: canReport ? { label: t('home.reportMissing'), onClick: () => setReportOpen(true) } : undefined
      },
    showHomeCard('production_home__entry', moduleAllowed('production')) && {
      key: 'entryProductivity',
      title: t('home.entryProductivityShort'),
      description: t('home.entryProductivityCardDesc'),
      icon: LogIn,
      tone: 'text-emerald-300 bg-emerald-500/15',
      accent: 'emerald' as const,
      onClick: () =>
        go({
          department: 'production',
          productionArea: area,
          productionPage: 'vehicles',
          productivityTab: 'productivity'
        }),
      statsLayout: 'stack' as const,
      stats: [
        { label: t('home.productivityVehiclesShort'), value: productivityLoading ? '…' : String(entryVehicles) },
        {
          label: t('home.productivityEfficiencyShort'),
          value: formatEfficiencyPct(entryEfficiency, productivityLoading)
        }
      ]
    },
    showHomeCard('production_home__exit', moduleAllowed('production')) && {
      key: 'exitProductivity',
      title: t('home.exitProductivityShort'),
      description: t('home.exitProductivityCardDesc'),
      icon: LogOut,
      tone: 'text-cyan-300 bg-cyan-500/15',
      accent: 'cyan' as const,
      onClick: () =>
        go({
          department: 'production',
          productionArea: area,
          productionPage: 'vehicles',
          productivityTab: 'productivity'
        }),
      statsLayout: 'stack' as const,
      stats: [
        { label: t('home.productivityVehiclesShort'), value: productivityLoading ? '…' : String(exitVehicles) },
        {
          label: t('home.productivityEfficiencyShort'),
          value: formatEfficiencyPct(exitEfficiency, productivityLoading)
        }
      ]
    },
    showHomeCard('production_home__stops', moduleAllowed('production')) && {
      key: 'stops',
      title: t('productivity.tabs.stops'),
      description: t('productivity.stops.subtitle'),
      icon: AlertOctagon,
      tone: 'text-amber-300 bg-amber-500/15',
      accent: 'amber' as const,
      onClick: () =>
        go({
          department: 'production',
          productionArea: area,
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
                productionArea: area,
                productionPage: 'vehicles',
                productivityTab: 'stops',
                productivityStopFormOpen: true
              })
          }
        : undefined
    }
  ].filter(Boolean) as HubCard[]

  const section: HubSection = { key: `${area}Daily`, title: '', cards }
  return { sections: [section], reportOpen, setReportOpen }
}
