import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  Car,
  GraduationCap,
  ListTodo,
  PackageX,
  PlusCircle,
  ScanLine,
  Settings as SettingsIcon,
  CalendarClock,
  ShieldAlert
} from 'lucide-react'
import { useVehicles } from '../Context/VehiclesContext'
import { useCanAccessSettings } from '../hooks/useCanAccessSettings'
import { useLang } from '../i18n/LanguageContext'
import { useCanReportMissingPart } from '../hooks/useCanReportMissingPart'
import { useMpLookups } from '../hooks/useMpLookups'
import { StatCard } from '../Components/StatCard'
import { ReportMissingPartModal } from '../Components/ReportMissingPartModal'
import { getMissingParts } from '../services/missingPartsService'
import { getTopAttendanceIssues } from '../services/attendanceService'
import type { AttendanceIssueLeader } from '../Types/attendance'
import { countActiveVehiclesByDepartment } from '../Utils/missingPartStats'
import { mpLookupLabel } from '../Utils/mpLookupLabel'
import type { DepartmentVehicleCount } from '../Types/missingPart'

import type { ProductionPage } from '../Types/navigation'

type NavTarget = ProductionPage

type ModuleCard = {
  key: string
  icon: typeof Car
  tone: string
  target: NavTarget
}

const moduleCards: ModuleCard[] = [
  { key: 'missingParts', icon: AlertTriangle, tone: 'text-red-300 bg-red-500/15', target: 'missing' },
  { key: 'vehicles', icon: Car, tone: 'text-cyan-300 bg-cyan-500/15', target: 'vehicles' },
  { key: 'training', icon: GraduationCap, tone: 'text-blue-300 bg-blue-500/15', target: 'training' },
  { key: 'damagedParts', icon: PackageX, tone: 'text-orange-300 bg-orange-500/15', target: 'damagedParts' },
  { key: 'missions', icon: ListTodo, tone: 'text-amber-300 bg-amber-500/15', target: 'missions' },
  { key: 'scratches', icon: ScanLine, tone: 'text-rose-300 bg-rose-500/15', target: 'scratches' },
  { key: 'settings', icon: SettingsIcon, tone: 'text-emerald-300 bg-emerald-500/15', target: 'settings' }
]

export function HomePage({ onNavigate }: { onNavigate: (page: NavTarget) => void }) {
  const { vehicles, setupRequired } = useVehicles()
  const { canAccess: canAccessSettings } = useCanAccessSettings()
  const { canReport } = useCanReportMissingPart()
  const { departments } = useMpLookups()
  const { t, dir, lang } = useLang()
  const [reportOpen, setReportOpen] = useState(false)
  const [deptCounts, setDeptCounts] = useState<DepartmentVehicleCount[]>([])
  const [deptLoading, setDeptLoading] = useState(false)
  const [attendanceLeaders, setAttendanceLeaders] = useState<AttendanceIssueLeader[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)

  const counts = useMemo(() => ({
    total: vehicles.length,
    withMissing: vehicles.filter(v => v.openMissingCount > 0).length,
    blocked: vehicles.filter(v => v.deliveryBlocked).length
  }), [vehicles])

  const deptMax = useMemo(() => Math.max(1, ...deptCounts.map(d => d.vehicleCount)), [deptCounts])

  async function loadDeptReport() {
    if (setupRequired) return
    setDeptLoading(true)
    try {
      const items = await getMissingParts()
      setDeptCounts(countActiveVehiclesByDepartment(items))
    } catch {
      setDeptCounts([])
    } finally {
      setDeptLoading(false)
    }
  }

  async function loadAttendanceReport() {
    if (setupRequired) return
    const d = new Date()
    setAttendanceLoading(true)
    try {
      setAttendanceLeaders(await getTopAttendanceIssues(d.getFullYear(), d.getMonth() + 1, 10))
    } catch {
      setAttendanceLeaders([])
    } finally {
      setAttendanceLoading(false)
    }
  }

  useEffect(() => {
    void loadDeptReport()
    void loadAttendanceReport()
  }, [setupRequired])

  return (
    <section className="space-y-6">
      <div className="card-industrial flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black text-white sm:text-2xl">{t('home.welcomeTitle')}</h2>
          <p className="mt-1 text-sm text-slate-400">{t('home.welcomeSubtitle')}</p>
        </div>
        {canReport && (
          <button
            onClick={() => setReportOpen(true)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-6 py-4 text-base font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400"
          >
            <PlusCircle className="h-5 w-5" /> {t('home.reportMissing')}
          </button>
        )}
      </div>

      {!setupRequired && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard title={t('home.total')} value={counts.total} subtitle={t('home.totalSub')} tone="cyan" icon={<Car className="h-6 w-6" />} />
          <StatCard title={t('home.withMissing')} value={counts.withMissing} subtitle={t('home.withMissingSub')} tone="orange" icon={<AlertTriangle className="h-6 w-6" />} />
          <StatCard title={t('home.blocked')} value={counts.blocked} subtitle={t('home.blockedSub')} tone="red" icon={<ShieldAlert className="h-6 w-6" />} />
        </div>
      )}

      {!setupRequired && (
        <div className="card-industrial p-5 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
              <CalendarClock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{t('home.attendanceReportTitle')}</h3>
              <p className="mt-1 text-sm text-slate-400">{t('home.attendanceReportSubtitle')}</p>
            </div>
          </div>
          {attendanceLoading ? (
            <p className="text-sm text-slate-500">{t('common.loading')}</p>
          ) : attendanceLeaders.length === 0 ? (
            <p className="text-sm text-slate-500">{t('home.attendanceReportEmpty')}</p>
          ) : (
            <ul className="space-y-2">
              {attendanceLeaders.map((row, i) => (
                <li
                  key={row.employeeId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs font-black text-slate-300">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-bold text-white">{row.fullName}</p>
                      <p className="font-mono text-xs text-slate-500" dir="ltr">
                        {row.employeeCode}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    {row.absentDays > 0 && (
                      <span className="rounded-full bg-red-500/15 px-2 py-1 text-red-200">
                        {t('attendance.status.absent')}: {row.absentDays}
                      </span>
                    )}
                    {row.vacationDays > 0 && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-1 text-amber-200">
                        {t('attendance.status.vacation')}: {row.vacationDays}
                      </span>
                    )}
                    {row.sickDays > 0 && (
                      <span className="rounded-full bg-orange-500/15 px-2 py-1 text-orange-200">
                        {t('attendance.status.sick')}: {row.sickDays}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {canAccessSettings && (
            <p className="mt-3 text-xs text-slate-500">{t('home.attendanceReportHint')}</p>
          )}
        </div>
      )}

      {!setupRequired && (
        <div className="card-industrial p-5 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-xl bg-amber-500/15 p-3 text-amber-300">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{t('home.deptReportTitle')}</h3>
              <p className="mt-1 text-sm text-slate-400">{t('home.deptReportSubtitle')}</p>
            </div>
          </div>
          {deptLoading ? (
            <p className="text-sm text-slate-500">{t('common.loading')}</p>
          ) : deptCounts.length === 0 ? (
            <p className="text-sm text-slate-500">{t('home.deptReportEmpty')}</p>
          ) : (
            <ul className="space-y-3">
              {deptCounts.map(row => {
                const pct = Math.round((row.vehicleCount / deptMax) * 100)
                const label = mpLookupLabel(departments, row.department, lang)
                return (
                  <li key={row.department}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="font-bold text-slate-200">{label}</span>
                      <span className="shrink-0 font-black text-cyan-300">
                        {t('home.deptReportVehicles', { n: row.vehicleCount })}
                      </span>
                    </div>
                    <div className={`h-2.5 overflow-hidden rounded-full bg-slate-800 ${dir === 'rtl' ? 'flex justify-end' : ''}`}>
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      <div>
        <h3 className="mb-3 px-1 text-sm font-black uppercase tracking-widest text-slate-400">{t('home.modules')}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {moduleCards.map(mod => {
            const Icon = mod.icon
            if (mod.key === 'settings' && !canAccessSettings) return null
            return (
              <button
                key={mod.key}
                type="button"
                onClick={() => onNavigate(mod.target)}
                className="group flex flex-col items-start gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5 text-start transition hover:border-cyan-400/40 hover:bg-slate-800/70"
              >
                <div className={`rounded-xl p-3 ${mod.tone}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-white">{t(`modules.${mod.key}`)}</h4>
                  <p className="mt-1 text-sm text-slate-400">{t(`modules.${mod.key}Desc`)}</p>
                </div>
                <span className="text-xs font-bold text-slate-500 transition group-hover:text-cyan-300">
                  {dir === 'rtl' ? '←' : '→'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <ReportMissingPartModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onReported={() => {
          void loadDeptReport()
        }}
      />
    </section>
  )
}
