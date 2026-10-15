import { useEffect, useMemo, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { getAttendanceDaysForDate, localTodayIso } from '../services/attendanceService'
import { getProductionPlanDayType } from '../services/productionPlanWorkDayDailyService'
import type { AttendanceDayStatus } from '../Types/attendance'
import { ATTENDANCE_STATUSES } from '../Types/attendance'
import type { Employee } from '../Types/employee'
import { attendanceDefaultsFromPlanDay } from '../Utils/attendanceDefaults'
import {
  buildTodayAttendanceReport,
  todayReportGroup,
  type TodayReportBucket
} from '../Utils/todayAttendanceReport'

type Props = {
  employees: Employee[]
}

const STATUS_TEXT: Record<AttendanceDayStatus, string> = {
  present: 'text-emerald-300',
  late: 'text-amber-300',
  absent: 'text-red-300',
  vacation: 'text-sky-300',
  sick: 'text-orange-300',
  permission: 'text-violet-300'
}

function formatTodayLabel(workDate: string, lang: string): string {
  return new Date(workDate + 'T12:00:00').toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function efficiencyLabel(value: number | null): string {
  return value == null ? '—' : `${value}%`
}

export function TodayAttendanceReportTab({ employees }: Props) {
  const { t, lang } = useLang()
  const today = localTodayIso()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [statusByEmployee, setStatusByEmployee] = useState<Map<string, AttendanceDayStatus>>(new Map())

  const activeEmployees = useMemo(() => employees.filter(employee => employee.isActive), [employees])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    void Promise.all([getAttendanceDaysForDate(today), getProductionPlanDayType(today)])
      .then(([days, planDayType]) => {
        if (cancelled) return
        const fallback = attendanceDefaultsFromPlanDay(planDayType).status
        const recorded = new Map(days.map(day => [day.employeeId, day.status]))
        const next = new Map<string, AttendanceDayStatus>()
        for (const employee of activeEmployees) {
          next.set(employee.id, recorded.get(employee.id) ?? fallback)
        }
        setStatusByEmployee(next)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [today, activeEmployees])

  const report = useMemo(() => {
    const people = activeEmployees.map(employee => ({
      group: todayReportGroup(employee),
      status: statusByEmployee.get(employee.id) ?? 'present'
    }))
    return buildTodayAttendanceReport(people)
  }, [activeEmployees, statusByEmployee])

  const rows = report.groups

  return (
    <section className="rounded-2xl border border-slate-700/80 bg-slate-900/40 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <BarChart3 className="h-4 w-4 text-violet-300" />
        <h4 className="text-sm font-black text-violet-200">{t('attendance.today.report.title')}</h4>
        <span className="text-xs text-slate-500">{formatTodayLabel(today, lang)}</span>
        {loading && <span className="text-xs text-slate-500">{t('common.loading')}</span>}
      </div>
      <p className="mb-3 text-xs text-slate-500">{t('attendance.today.report.hint')}</p>
      {error && <p className="mb-3 text-sm text-red-300">{t('attendance.today.report.loadError')}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-y-1 text-sm">
          <thead>
            <tr className="text-[11px] font-bold text-slate-400">
              <th className="px-3 py-2 text-start">{t('attendance.today.report.group')}</th>
              <th className="px-2 py-2 text-center">{t('attendance.today.report.headcount')}</th>
              <th className="px-2 py-2 text-center">{t('attendance.today.report.efficiency')}</th>
              {ATTENDANCE_STATUSES.map(status => (
                <th key={status} className="px-2 py-2 text-center">
                  {t(`attendance.status.${status}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <ReportRow
                key={row.group}
                row={row}
                label={t(`attendance.today.report.groups.${row.group}`)}
                loading={loading || error}
              />
            ))}
            <ReportRow
              row={{ ...report.total, group: 'other' }}
              label={t('attendance.today.report.totalRow')}
              emphasize
              loading={loading || error}
            />
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ReportRow({
  row,
  label,
  emphasize = false,
  loading = false
}: {
  row: TodayReportBucket
  label: string
  emphasize?: boolean
  loading?: boolean
}) {
  const shown = (value: string | number) => (loading ? '—' : value)
  return (
    <tr className={emphasize ? 'bg-cyan-500/10' : 'bg-slate-950/50'}>
      <td className={`rounded-s-xl px-3 py-2.5 font-bold ${emphasize ? 'text-cyan-100' : 'text-slate-100'}`}>
        {label}
      </td>
      <td className="px-2 py-2.5 text-center text-base font-black tabular-nums text-white">{shown(row.total)}</td>
      <td className="px-2 py-2.5 text-center font-black tabular-nums text-cyan-200">
        {shown(efficiencyLabel(row.efficiency))}
      </td>
      {ATTENDANCE_STATUSES.map((status, index) => (
        <td
          key={status}
          className={`px-2 py-2.5 text-center font-bold tabular-nums ${STATUS_TEXT[status]} ${
            index === ATTENDANCE_STATUSES.length - 1 ? 'rounded-e-xl' : ''
          }`}
        >
          {shown(row.byStatus[status])}
        </td>
      ))}
    </tr>
  )
}
