import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, Clock, User } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { JobRoleBadge } from '../EmployeeBadges'
import { MyProfileAttendanceTab } from '../profile/MyProfileAttendanceTab'
import { attendanceStatusHasTimes } from '../../Types/attendance'
import {
  getEmployeeAttendanceForDate,
  getEmployeeAttendanceSummary,
  localTodayIso
} from '../../services/attendanceService'
import { fetchMyEmployeeProfile, type MyEmployeeProfile } from '../../services/workerProfileService'
import type { AttendanceDay, EmployeeAttendanceSummary } from '../../Types/attendance'
import type { Employee } from '../../Types/employee'

function formatTime(value: string | null | undefined): string {
  if (!value) return '—'
  return value.length >= 5 ? value.slice(0, 5) : value
}

export function WorkerProfileAttendanceTab() {
  const { t } = useLang()
  const workDate = localTodayIso()
  const [profile, setProfile] = useState<MyEmployeeProfile | null>(null)
  const [today, setToday] = useState<AttendanceDay | null>(null)
  const [monthSummary, setMonthSummary] = useState<EmployeeAttendanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const employee = await fetchMyEmployeeProfile()
      setProfile(employee)
      if (!employee) {
        setToday(null)
        setMonthSummary(null)
        return
      }
      const d = new Date()
      const [dayRow, summary] = await Promise.all([
        getEmployeeAttendanceForDate(employee.employeeId, workDate),
        getEmployeeAttendanceSummary(employee.employeeId, d.getFullYear(), d.getMonth() + 1)
      ])
      setToday(dayRow)
      setMonthSummary(summary)
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [t, workDate])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return <div className="card-industrial p-8 text-center text-slate-400">{t('common.loading')}</div>
  }

  if (!profile) {
    return <div className="card-industrial p-6 text-center text-sm text-amber-200">{t('workerProfile.noEmployeeLink')}</div>
  }

  const todayHasTimes = today ? attendanceStatusHasTimes(today.status) : false

  return (
    <div className="space-y-4">
      <section className="card-industrial space-y-3 p-5">
        <div className="flex items-center gap-2 text-cyan-300">
          <User className="h-5 w-5" />
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-400">{t('workerProfile.attendanceEmployee')}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-lg font-black text-white" dir="ltr">
            {profile.employeeCode}
          </p>
          <p className="text-lg font-bold text-slate-100">{profile.fullName}</p>
          <JobRoleBadge role={profile.jobRole as Employee['jobRole']} />
        </div>
        <p className="text-xs text-slate-500">{t('workerProfile.attendanceFromWorkforce')}</p>
      </section>

      {err && <div className="card-industrial p-4 text-sm text-red-300">{err}</div>}

      <section className="card-industrial space-y-4 p-5">
        <div className="flex items-center gap-2 text-emerald-300">
          <Clock className="h-5 w-5" />
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-400">{t('attendance.today.title')}</h3>
          <span className="ms-auto font-mono text-xs text-slate-500" dir="ltr">
            {workDate}
          </span>
        </div>

        {!today ? (
          <p className="text-sm text-amber-200">{t('workerProfile.attendanceNotRecordedToday')}</p>
        ) : (
          <>
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
              <p className="text-[10px] font-bold uppercase text-slate-500">{t('attendance.cols.status')}</p>
              <p className="mt-1 text-base font-black text-white">{t(`attendance.status.${today.status}`)}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-500">{t('attendance.checkIn')}</p>
                <p className="mt-1 font-mono text-2xl font-black text-emerald-200" dir="ltr">
                  {todayHasTimes ? formatTime(today.checkIn) : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-500">{t('attendance.checkOut')}</p>
                <p className="mt-1 font-mono text-2xl font-black text-amber-200" dir="ltr">
                  {todayHasTimes ? formatTime(today.checkOut) : '—'}
                </p>
              </div>
            </div>
            {today.notes && (
              <p className="text-xs text-slate-400">
                {t('common.notes')}: {today.notes}
              </p>
            )}
          </>
        )}
      </section>

      {monthSummary && (
        <section className="card-industrial space-y-3 p-5">
          <div className="flex items-center gap-2 text-violet-300">
            <CalendarClock className="h-5 w-5" />
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-400">{t('workerProfile.attendanceMonthlySummary')}</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:grid-cols-7">
            {(
              [
                ['present', monthSummary.presentDays, 'text-emerald-300'],
                ['absent', monthSummary.absentDays, 'text-red-300'],
                ['vacation', monthSummary.vacationDays, 'text-amber-300'],
                ['sick', monthSummary.sickDays, 'text-orange-300'],
                ['permission', monthSummary.permissionDays, 'text-cyan-300'],
                ['late', monthSummary.lateDays, 'text-violet-300'],
                ['total', monthSummary.issueDays, 'text-white']
              ] as const
            ).map(([key, value, color]) => (
              <div key={key} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-500">
                  {key === 'total' ? t('attendance.cols.total') : t(`attendance.status.${key}`)}
                </p>
                <p className={`mt-1 text-xl font-black ${color}`}>{value || '—'}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">{t('attendance.monthly.hint')}</p>
        </section>
      )}

      <MyProfileAttendanceTab employeeId={profile.employeeId} employeeName={profile.fullName} />
    </div>
  )
}
