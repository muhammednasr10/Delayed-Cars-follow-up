import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarClock, Save, Settings2 } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { inputCls } from './FormField'
import { JobRoleBadge } from './EmployeeBadges'
import { TodayAttendanceQuickEntry } from './TodayAttendanceQuickEntry'
import { TodayAttendanceDefaultsModal } from './TodayAttendanceDefaultsModal'
import {
  ATTENDANCE_STATUSES,
  DEFAULT_ATTENDANCE_CHECK_IN,
  DEFAULT_ATTENDANCE_CHECK_OUT,
  attendanceStatusHasTimes,
  type AttendanceDayStatus
} from '../Types/attendance'
import type { PlanDayType } from '../Types/productionPlanWorkDayDaily'
import {
  bulkUpsertAttendanceDays,
  dayEditToInput,
  getAttendanceDaysForDate,
  localTodayIso
} from '../services/attendanceService'
import { getProductionPlanDayType } from '../services/productionPlanWorkDayDailyService'
import { compareEmployees } from '../services/employeesService'
import {
  DEFAULT_ATTENDANCE_BULK,
  attendanceDefaultsFromPlanDay,
  isHolidayPlanDay,
  type AttendanceBulkDefaults
} from '../Utils/attendanceDefaults'
import { dayTypeBadgeClass } from '../Utils/productionPlanWorkDayDaily'
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

function buildDefaultRow(employee: Employee, defaults: AttendanceBulkDefaults): TodayRow {
  return {
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
    fullName: employee.fullName,
    jobRole: employee.jobRole,
    status: defaults.status,
    checkIn: defaults.checkIn,
    checkOut: defaults.checkOut,
    notes: ''
  }
}

function rowTimesFromStatus(
  status: AttendanceDayStatus,
  checkIn: string | null | undefined,
  checkOut: string | null | undefined
): { checkIn: string; checkOut: string } {
  if (!attendanceStatusHasTimes(status)) return { checkIn: '', checkOut: '' }
  return {
    checkIn: checkIn?.slice(0, 5) ?? DEFAULT_ATTENDANCE_CHECK_IN,
    checkOut: checkOut?.slice(0, 5) ?? DEFAULT_ATTENDANCE_CHECK_OUT
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
  const [quickEmployeeId, setQuickEmployeeId] = useState('')
  const [quickStatus, setQuickStatus] = useState<AttendanceDayStatus>('present')
  const [quickCheckIn, setQuickCheckIn] = useState(DEFAULT_ATTENDANCE_CHECK_IN)
  const [quickCheckOut, setQuickCheckOut] = useState(DEFAULT_ATTENDANCE_CHECK_OUT)
  const [defaultsOpen, setDefaultsOpen] = useState(false)
  const [bulkDefaults, setBulkDefaults] = useState<AttendanceBulkDefaults>(DEFAULT_ATTENDANCE_BULK)
  const [todayPlanDayType, setTodayPlanDayType] = useState<PlanDayType | null>(null)
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map())

  const activeEmployees = useMemo(
    () => [...employees].filter(e => e.isActive).sort(compareEmployees),
    [employees]
  )

  useEffect(() => {
    setLoading(true)
    setError('')
    Promise.all([getAttendanceDaysForDate(workDate), getProductionPlanDayType(workDate)])
      .then(([existing, planDayType]) => {
        setTodayPlanDayType(planDayType)
        const initialDefaults = attendanceDefaultsFromPlanDay(planDayType, bulkDefaults)
        const byEmployee = new Map(existing.map(d => [d.employeeId, d]))
        setRows(
          activeEmployees.map(employee => {
            const saved = byEmployee.get(employee.id)
            if (!saved) return buildDefaultRow(employee, initialDefaults)
            const times = rowTimesFromStatus(saved.status, saved.checkIn, saved.checkOut)
            return {
              employeeId: employee.id,
              employeeCode: employee.employeeCode,
              fullName: employee.fullName,
              jobRole: employee.jobRole,
              status: saved.status,
              checkIn: times.checkIn,
              checkOut: times.checkOut,
              notes: saved.notes ?? ''
            }
          })
        )
      })
      .catch(e => setError(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false))
  }, [workDate, activeEmployees, t])

  const patchRow = useCallback((index: number, patch: Partial<TodayRow>) => {
    setRows(prev =>
      prev.map((row, i) => {
        if (i !== index) return row
        const next = { ...row, ...patch }
        const status = patch.status ?? row.status
        if (!attendanceStatusHasTimes(status)) {
          next.checkIn = ''
          next.checkOut = ''
        } else if (!attendanceStatusHasTimes(row.status) || !next.checkIn) {
          next.checkIn = patch.checkIn ?? DEFAULT_ATTENDANCE_CHECK_IN
          next.checkOut = patch.checkOut ?? DEFAULT_ATTENDANCE_CHECK_OUT
        }
        return next
      })
    )
    setSuccess('')
  }, [])

  const applyQuickPatch = useCallback(
    (patch: Partial<TodayRow>) => {
      if (!quickEmployeeId) return
      const index = rows.findIndex(r => r.employeeId === quickEmployeeId)
      if (index === -1) return
      patchRow(index, patch)
    },
    [quickEmployeeId, rows, patchRow]
  )

  const onQuickEmployeeChange = useCallback(
    (employeeId: string) => {
      setQuickEmployeeId(employeeId)
      if (!employeeId) return
      const row = rows.find(r => r.employeeId === employeeId)
      if (!row) return
      setQuickStatus(row.status)
      setQuickCheckIn(row.checkIn || DEFAULT_ATTENDANCE_CHECK_IN)
      setQuickCheckOut(row.checkOut || DEFAULT_ATTENDANCE_CHECK_OUT)
      rowRefs.current.get(employeeId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    },
    [rows]
  )

  const onQuickStatusChange = useCallback(
    (status: AttendanceDayStatus) => {
      setQuickStatus(status)
      if (!attendanceStatusHasTimes(status)) {
        setQuickCheckIn('')
        setQuickCheckOut('')
        applyQuickPatch({ status, checkIn: '', checkOut: '' })
        return
      }
      const checkIn = quickCheckIn || DEFAULT_ATTENDANCE_CHECK_IN
      const checkOut = quickCheckOut || DEFAULT_ATTENDANCE_CHECK_OUT
      setQuickCheckIn(checkIn)
      setQuickCheckOut(checkOut)
      applyQuickPatch({ status, checkIn, checkOut })
    },
    [applyQuickPatch, quickCheckIn, quickCheckOut]
  )

  const onQuickCheckInChange = useCallback(
    (checkIn: string) => {
      setQuickCheckIn(checkIn)
      applyQuickPatch({ checkIn })
    },
    [applyQuickPatch]
  )

  const onQuickCheckOutChange = useCallback(
    (checkOut: string) => {
      setQuickCheckOut(checkOut)
      applyQuickPatch({ checkOut })
    },
    [applyQuickPatch]
  )

  function applyBulkDefaults(defaults: AttendanceBulkDefaults) {
    if (!isHolidayPlanDay(todayPlanDayType)) {
      setBulkDefaults(defaults)
    }
    setRows(prev =>
      prev.map(row => ({
        ...row,
        status: defaults.status,
        checkIn: defaults.checkIn,
        checkOut: defaults.checkOut
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
              onClick={() => setDefaultsOpen(true)}
              className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
            >
              <Settings2 className="me-1 inline h-4 w-4" /> {t('attendance.today.defaultsBtn')}
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

      {todayPlanDayType && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm">
          <span className="text-slate-400">{t('attendance.today.planDayLabel')}:</span>
          <span className={`rounded-lg px-2 py-0.5 text-xs font-black ${dayTypeBadgeClass(todayPlanDayType)}`}>
            {t(`productionOrders.workDaysTab.dayTypes.${todayPlanDayType}`)}
          </span>
          {isHolidayPlanDay(todayPlanDayType) && (
            <span className="text-xs text-amber-200/90">{t('attendance.today.holidayBanner')}</span>
          )}
        </div>
      )}

      <TodayAttendanceDefaultsModal
        open={defaultsOpen}
        planDayType={todayPlanDayType}
        savedDefaults={bulkDefaults}
        onClose={() => setDefaultsOpen(false)}
        onApply={applyBulkDefaults}
      />

      <TodayAttendanceQuickEntry
        employees={activeEmployees}
        canManage={canManage}
        employeeId={quickEmployeeId}
        onEmployeeIdChange={onQuickEmployeeChange}
        status={quickStatus}
        onStatusChange={onQuickStatusChange}
        checkIn={quickCheckIn}
        checkOut={quickCheckOut}
        onCheckInChange={onQuickCheckInChange}
        onCheckOutChange={onQuickCheckOutChange}
      />

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
                <tr
                  key={row.employeeId}
                  ref={el => {
                    if (el) rowRefs.current.set(row.employeeId, el)
                    else rowRefs.current.delete(row.employeeId)
                  }}
                  className={`bg-slate-900/30 hover:bg-slate-800/40 ${
                    row.employeeId === quickEmployeeId ? 'bg-violet-500/10 ring-1 ring-inset ring-violet-500/30' : ''
                  }`}
                >
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
                      onChange={e => {
                        const status = e.target.value as AttendanceDayStatus
                        patchRow(i, { status })
                        if (row.employeeId === quickEmployeeId) {
                          setQuickStatus(status)
                          if (!attendanceStatusHasTimes(status)) {
                            setQuickCheckIn('')
                            setQuickCheckOut('')
                          }
                        }
                      }}
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
                      disabled={!canManage || !attendanceStatusHasTimes(row.status)}
                      className={`${inputCls()} w-28 py-1.5 text-xs disabled:opacity-40`}
                      value={row.checkIn}
                      onChange={e => {
                        patchRow(i, { checkIn: e.target.value })
                        if (row.employeeId === quickEmployeeId) setQuickCheckIn(e.target.value)
                      }}
                      dir="ltr"
                    />
                  </td>
                  <td className="table-cell">
                    <input
                      type="time"
                      disabled={!canManage || !attendanceStatusHasTimes(row.status)}
                      className={`${inputCls()} w-28 py-1.5 text-xs disabled:opacity-40`}
                      value={row.checkOut}
                      onChange={e => {
                        patchRow(i, { checkOut: e.target.value })
                        if (row.employeeId === quickEmployeeId) setQuickCheckOut(e.target.value)
                      }}
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
