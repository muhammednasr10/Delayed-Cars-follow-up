import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, Save } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { inputCls } from './FormField'
import { JobRoleBadge } from './EmployeeBadges'
import {
  ATTENDANCE_STATUSES,
  DEFAULT_ATTENDANCE_CHECK_IN,
  DEFAULT_ATTENDANCE_CHECK_OUT,
  type AttendanceDayStatus
} from '../Types/attendance'
import {
  bulkUpsertAttendanceDays,
  dayEditToInput,
  getAttendanceDaysForDate,
  localTodayIso
} from '../services/attendanceService'
import { compareEmployees } from '../services/employeesService'
import type { Employee } from '../Types/employee'

type TodayRow = {
  employeeId: string
  employeeCode: string
  fullName: string
  jobRole: Employee['jobRole']
  status: AttendanceDayStatus
  checkIn: string
  checkOut: string
  notes: string
}

type Props = {
  employees: Employee[]
  canManage: boolean
}

function buildDefaultRow(employee: Employee): TodayRow {
  return {
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
    fullName: employee.fullName,
    jobRole: employee.jobRole,
    status: 'present',
    checkIn: DEFAULT_ATTENDANCE_CHECK_IN,
    checkOut: DEFAULT_ATTENDANCE_CHECK_OUT,
    notes: ''
  }
}

function formatTodayLabel(workDate: string, lang: string): string {
  const d = new Date(workDate + 'T12:00:00')
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function TodayAttendanceTab({ employees, canManage }: Props) {
  const { t, lang } = useLang()
  const workDate = localTodayIso()
  const [rows, setRows] = useState<TodayRow[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const activeEmployees = useMemo(
    () => [...employees].filter(e => e.isActive).sort(compareEmployees),
    [employees]
  )

  useEffect(() => {
    setLoading(true)
    setError('')
    getAttendanceDaysForDate(workDate)
      .then(existing => {
        const byEmployee = new Map(existing.map(d => [d.employeeId, d]))
        setRows(
          activeEmployees.map(employee => {
            const saved = byEmployee.get(employee.id)
            if (!saved) return buildDefaultRow(employee)
            const status = saved.status
            return {
              employeeId: employee.id,
              employeeCode: employee.employeeCode,
              fullName: employee.fullName,
              jobRole: employee.jobRole,
              status,
              checkIn:
                status === 'present'
                  ? (saved.checkIn?.slice(0, 5) ?? DEFAULT_ATTENDANCE_CHECK_IN)
                  : '',
              checkOut:
                status === 'present'
                  ? (saved.checkOut?.slice(0, 5) ?? DEFAULT_ATTENDANCE_CHECK_OUT)
                  : '',
              notes: saved.notes ?? ''
            }
          })
        )
      })
      .catch(e => setError(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false))
  }, [workDate, activeEmployees, t])

  function patchRow(index: number, patch: Partial<TodayRow>) {
    setRows(prev =>
      prev.map((row, i) => {
        if (i !== index) return row
        const next = { ...row, ...patch }
        const status = patch.status ?? row.status
        if (status !== 'present') {
          next.checkIn = ''
          next.checkOut = ''
        } else if (row.status !== 'present' || !next.checkIn) {
          next.checkIn = DEFAULT_ATTENDANCE_CHECK_IN
          next.checkOut = DEFAULT_ATTENDANCE_CHECK_OUT
        }
        return next
      })
    )
    setSuccess('')
  }

  function markAllPresent() {
    setRows(prev =>
      prev.map(row => ({
        ...row,
        status: 'present' as AttendanceDayStatus,
        checkIn: DEFAULT_ATTENDANCE_CHECK_IN,
        checkOut: DEFAULT_ATTENDANCE_CHECK_OUT
      }))
    )
    setSuccess('')
  }

  async function save() {
    if (!canManage) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const inputs = rows.map(row =>
        dayEditToInput(row.employeeId, {
          workDate,
          status: row.status,
          checkIn: row.checkIn,
          checkOut: row.checkOut,
          notes: row.notes
        })
      )
      await bulkUpsertAttendanceDays(inputs)
      setSuccess(t('attendance.today.saved'))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{t('attendance.today.title')}</h3>
            <p className="text-sm text-slate-400">{formatTodayLabel(workDate, lang)}</p>
          </div>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={markAllPresent}
              className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
            >
              {t('attendance.markAllPresent')}
            </button>
            <button
              type="button"
              disabled={busy || loading}
              onClick={() => void save()}
              className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
            >
              <Save className="mr-1 inline h-4 w-4" /> {busy ? t('common.saving') : t('attendance.today.save')}
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500">{t('attendance.today.hint')}</p>
      {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>}
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        {loading ? (
          <p className="p-8 text-center text-slate-500">{t('common.loading')}</p>
        ) : (
          <table className="w-full min-w-[760px] text-start">
            <thead className="bg-slate-950/90">
              <tr>
                <th className="table-cell text-xs font-black uppercase text-slate-400">{t('attendance.cols.code')}</th>
                <th className="table-cell text-xs font-black uppercase text-slate-400">{t('attendance.cols.name')}</th>
                <th className="table-cell text-xs font-black uppercase text-slate-400">{t('attendance.cols.role')}</th>
                <th className="table-cell text-xs font-black uppercase text-slate-400">{t('attendance.cols.status')}</th>
                <th className="table-cell text-xs font-black uppercase text-slate-400">{t('attendance.checkIn')}</th>
                <th className="table-cell text-xs font-black uppercase text-slate-400">{t('attendance.checkOut')}</th>
                <th className="table-cell text-xs font-black uppercase text-slate-400">{t('common.notes')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((row, i) => (
                <tr key={row.employeeId} className="bg-slate-900/30 hover:bg-slate-800/40">
                  <td className="table-cell font-mono font-bold text-white" dir="ltr">
                    {row.employeeCode}
                  </td>
                  <td className="table-cell font-bold text-slate-100">{row.fullName}</td>
                  <td className="table-cell">
                    <JobRoleBadge role={row.jobRole} />
                  </td>
                  <td className="table-cell">
                    <select
                      disabled={!canManage}
                      className={`${inputCls()} min-w-[7rem] py-1.5 text-xs`}
                      value={row.status}
                      onChange={e => patchRow(i, { status: e.target.value as AttendanceDayStatus })}
                    >
                      {ATTENDANCE_STATUSES.map(s => (
                        <option key={s} value={s}>
                          {t(`attendance.status.${s}`)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="table-cell">
                    <input
                      type="time"
                      disabled={!canManage || row.status !== 'present'}
                      className={`${inputCls()} w-28 py-1.5 text-xs disabled:opacity-40`}
                      value={row.checkIn}
                      onChange={e => patchRow(i, { checkIn: e.target.value })}
                      dir="ltr"
                    />
                  </td>
                  <td className="table-cell">
                    <input
                      type="time"
                      disabled={!canManage || row.status !== 'present'}
                      className={`${inputCls()} w-28 py-1.5 text-xs disabled:opacity-40`}
                      value={row.checkOut}
                      onChange={e => patchRow(i, { checkOut: e.target.value })}
                      dir="ltr"
                    />
                  </td>
                  <td className="table-cell">
                    <input
                      disabled={!canManage}
                      className={`${inputCls()} min-w-[8rem] py-1.5 text-xs`}
                      value={row.notes}
                      onChange={e => patchRow(i, { notes: e.target.value })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
