import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarClock, Settings2 } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { inputCls } from './FormField'
import { JobRoleBadge } from './EmployeeBadges'
import { TodayAttendanceQuickEntry } from './TodayAttendanceQuickEntry'
import { TodayAttendanceSummary } from './TodayAttendanceSummary'
import { TodayAttendanceDefaultsModal } from './TodayAttendanceDefaultsModal'
import {
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
  localTodayIso,
  upsertAttendanceDay
} from '../services/attendanceService'
import { getProductionPlanDayType } from '../services/productionPlanWorkDayDailyService'
import { compareEmployees } from '../services/employeesService'
import {
  DEFAULT_ATTENDANCE_BULK,
  allowedAttendanceStatusesForPlanDay,
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
  onSaved?: () => void
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

export function TodayAttendanceTab({ employees, canManage, onSaved }: Props) {
  const { t, lang } = useLang()
  const todayIso = localTodayIso()
  const [workDate, setWorkDate] = useState(todayIso)
  const isSelectedToday = workDate === todayIso
  const [rows, setRows] = useState<TodayRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState('')
  const [quickEmployeeId, setQuickEmployeeId] = useState('')
  const [quickStatus, setQuickStatus] = useState<AttendanceDayStatus>('present')
  const [quickCheckIn, setQuickCheckIn] = useState(DEFAULT_ATTENDANCE_CHECK_IN)
  const [quickCheckOut, setQuickCheckOut] = useState(DEFAULT_ATTENDANCE_CHECK_OUT)
  const [defaultsOpen, setDefaultsOpen] = useState(false)
  const [bulkDefaults, setBulkDefaults] = useState<AttendanceBulkDefaults>(DEFAULT_ATTENDANCE_BULK)
  const [todayPlanDayType, setTodayPlanDayType] = useState<PlanDayType | null>(null)
  const [persistedIds, setPersistedIds] = useState<Set<string>>(new Set())
  const persistedIdsRef = useRef<Set<string>>(new Set())
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rowsRef = useRef<TodayRow[]>([])
  const savingIds = useRef<Set<string>>(new Set())
  const quickEmployeeIdRef = useRef('')
  const quickStatusRef = useRef<AttendanceDayStatus>('present')
  const quickCheckInRef = useRef(DEFAULT_ATTENDANCE_CHECK_IN)
  const quickCheckOutRef = useRef(DEFAULT_ATTENDANCE_CHECK_OUT)

  const activeEmployees = useMemo(
    () => [...employees].filter(e => e.isActive).sort(compareEmployees),
    [employees]
  )

  const allowedStatuses = useMemo(
    () => allowedAttendanceStatusesForPlanDay(todayPlanDayType),
    [todayPlanDayType]
  )

  useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  useEffect(() => {
    persistedIdsRef.current = persistedIds
  }, [persistedIds])

  const mergeRowsFromServer = useCallback(
    (existing: Awaited<ReturnType<typeof getAttendanceDaysForDate>>, planDayType: PlanDayType | null) => {
      setTodayPlanDayType(planDayType)
      const initialDefaults = attendanceDefaultsFromPlanDay(planDayType, bulkDefaults)
      const byEmployee = new Map(existing.map(d => [d.employeeId, d]))
      setPersistedIds(new Set(existing.map(d => d.employeeId)))
      setRows(prev => {
        const pending = new Set(saveTimers.current.keys())
        return activeEmployees.map(employee => {
          if (pending.has(employee.id) || savingIds.current.has(employee.id)) {
            return prev.find(r => r.employeeId === employee.id) ?? buildDefaultRow(employee, initialDefaults)
          }
          const saved = byEmployee.get(employee.id)
          if (!saved) {
            const local = prev.find(r => r.employeeId === employee.id)
            if (local && persistedIdsRef.current.has(employee.id)) return local
            return buildDefaultRow(employee, initialDefaults)
          }
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
      })
    },
    [activeEmployees, bulkDefaults]
  )

  const loadFromServer = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [existing, planDayType] = await Promise.all([
        getAttendanceDaysForDate(workDate),
        getProductionPlanDayType(workDate)
      ])
      mergeRowsFromServer(existing, planDayType)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [workDate, mergeRowsFromServer, t])

  useEffect(() => {
    void loadFromServer()
  }, [loadFromServer])

  useEffect(() => {
    for (const timer of saveTimers.current.values()) clearTimeout(timer)
    saveTimers.current.clear()
    savingIds.current.clear()
    quickEmployeeIdRef.current = ''
    setQuickEmployeeId('')
    setQuickStatus('present')
    setQuickCheckIn(DEFAULT_ATTENDANCE_CHECK_IN)
    setQuickCheckOut(DEFAULT_ATTENDANCE_CHECK_OUT)
    quickStatusRef.current = 'present'
    quickCheckInRef.current = DEFAULT_ATTENDANCE_CHECK_IN
    quickCheckOutRef.current = DEFAULT_ATTENDANCE_CHECK_OUT
  }, [workDate])

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!isSelectedToday || document.visibilityState === 'hidden') return
      void getAttendanceDaysForDate(workDate)
        .then(existing => mergeRowsFromServer(existing, todayPlanDayType))
        .catch(() => {})
    }, 30_000)
    return () => window.clearInterval(id)
  }, [workDate, isSelectedToday, mergeRowsFromServer, todayPlanDayType])

  const flashSaved = useCallback(() => {
    setSaveState('saved')
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSaveState('idle'), 2000)
  }, [])

  const persistRow = useCallback(
    async (row: TodayRow) => {
      if (!canManage) return
      savingIds.current.add(row.employeeId)
      setSaveState('saving')
      setError('')
      try {
        await upsertAttendanceDay(
          dayEditToInput(row.employeeId, {
            workDate,
            status: row.status,
            checkIn: row.checkIn,
            checkOut: row.checkOut,
            notes: row.notes
          })
        )
        setPersistedIds(prev => new Set(prev).add(row.employeeId))
        flashSaved()
        onSaved?.()
      } catch (e) {
        setSaveState('idle')
        setError(e instanceof Error ? e.message : t('common.error'))
      } finally {
        savingIds.current.delete(row.employeeId)
      }
    },
    [canManage, workDate, flashSaved, t, onSaved]
  )

  const scheduleSaveRow = useCallback(
    (row: TodayRow, immediate = false) => {
      if (!canManage) return
      const id = row.employeeId
      const prev = saveTimers.current.get(id)
      if (prev) clearTimeout(prev)
      if (immediate) {
        void persistRow(row)
        return
      }
      saveTimers.current.set(
        id,
        setTimeout(() => {
          saveTimers.current.delete(id)
          void persistRow(row)
        }, 500)
      )
    },
    [canManage, persistRow]
  )

  const persistAllRows = useCallback(
    async (nextRows: TodayRow[]) => {
      if (!canManage) return
      setSaveState('saving')
      setError('')
      try {
        const inputs = nextRows.map(row =>
          dayEditToInput(row.employeeId, {
            workDate,
            status: row.status,
            checkIn: row.checkIn,
            checkOut: row.checkOut,
            notes: row.notes
          })
        )
        await bulkUpsertAttendanceDays(inputs)
        setPersistedIds(prev => {
          const next = new Set(prev)
          for (const row of nextRows) next.add(row.employeeId)
          return next
        })
        flashSaved()
        onSaved?.()
      } catch (e) {
        setSaveState('idle')
        setError(e instanceof Error ? e.message : t('common.error'))
      }
    },
    [canManage, workDate, flashSaved, t, onSaved]
  )

  useEffect(() => {
    return () => {
      for (const timer of saveTimers.current.values()) clearTimeout(timer)
      if (savedTimer.current) clearTimeout(savedTimer.current)
    }
  }, [])

  const patchRow = useCallback(
    (index: number, patch: Partial<TodayRow>, saveImmediate = false) => {
      let updated: TodayRow | null = null
      const nextRows = rowsRef.current.map((row, i) => {
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
        updated = next
        return next
      })
      if (updated) {
        rowsRef.current = nextRows
        setRows(nextRows)
        scheduleSaveRow(updated, saveImmediate)
      }
    },
    [scheduleSaveRow]
  )

  const flushQuickEntryFor = useCallback(
    async (
      empId: string,
      quick: { status: AttendanceDayStatus; checkIn: string; checkOut: string }
    ) => {
      if (!canManage || !empId) return
      const index = rowsRef.current.findIndex(r => r.employeeId === empId)
      if (index === -1) return
      const row = rowsRef.current[index]
      let status = quick.status
      let checkIn = quick.checkIn
      let checkOut = quick.checkOut
      if (!attendanceStatusHasTimes(status)) {
        checkIn = ''
        checkOut = ''
      } else {
        checkIn = checkIn || DEFAULT_ATTENDANCE_CHECK_IN
        checkOut = checkOut || DEFAULT_ATTENDANCE_CHECK_OUT
      }
      if (
        row.status === status &&
        row.checkIn === checkIn &&
        row.checkOut === checkOut &&
        persistedIdsRef.current.has(empId)
      ) {
        return
      }
      const nextRow = { ...row, status, checkIn, checkOut }
      rowsRef.current = rowsRef.current.map((r, i) => (i === index ? nextRow : r))
      setRows(rowsRef.current)
      await persistRow(nextRow)
    },
    [canManage, persistRow]
  )

  const commitQuickEntry = useCallback(
    (patch?: Partial<Pick<TodayRow, 'status' | 'checkIn' | 'checkOut'>>) => {
      const empId = quickEmployeeIdRef.current
      if (!empId || !canManage) return
      const index = rowsRef.current.findIndex(r => r.employeeId === empId)
      if (index === -1) return
      const row = rowsRef.current[index]
      let status = patch?.status ?? quickStatusRef.current
      let checkIn = patch?.checkIn ?? quickCheckInRef.current
      let checkOut = patch?.checkOut ?? quickCheckOutRef.current
      if (!attendanceStatusHasTimes(status)) {
        checkIn = ''
        checkOut = ''
      } else {
        checkIn = checkIn || DEFAULT_ATTENDANCE_CHECK_IN
        checkOut = checkOut || DEFAULT_ATTENDANCE_CHECK_OUT
      }
      quickStatusRef.current = status
      quickCheckInRef.current = checkIn
      quickCheckOutRef.current = checkOut
      setQuickStatus(status)
      setQuickCheckIn(checkIn)
      setQuickCheckOut(checkOut)
      patchRow(index, { status, checkIn, checkOut, notes: row.notes }, true)
    },
    [canManage, patchRow]
  )

  const onQuickEmployeeChange = useCallback(
    (employeeId: string) => {
      const prevId = quickEmployeeIdRef.current
      if (prevId && prevId !== employeeId) {
        void flushQuickEntryFor(prevId, {
          status: quickStatusRef.current,
          checkIn: quickCheckInRef.current,
          checkOut: quickCheckOutRef.current
        })
      }
      quickEmployeeIdRef.current = employeeId
      setQuickEmployeeId(employeeId)
      if (!employeeId) return
      const row = rowsRef.current.find(r => r.employeeId === employeeId)
      if (!row) return
      const checkIn = row.checkIn || DEFAULT_ATTENDANCE_CHECK_IN
      const checkOut = row.checkOut || DEFAULT_ATTENDANCE_CHECK_OUT
      const hasTimes = attendanceStatusHasTimes(row.status)
      quickStatusRef.current = row.status
      quickCheckInRef.current = hasTimes ? checkIn : ''
      quickCheckOutRef.current = hasTimes ? checkOut : ''
      setQuickStatus(row.status)
      setQuickCheckIn(quickCheckInRef.current)
      setQuickCheckOut(quickCheckOutRef.current)
    },
    [flushQuickEntryFor]
  )

  const onQuickStatusChange = useCallback(
    (status: AttendanceDayStatus) => {
      quickStatusRef.current = status
      setQuickStatus(status)
      if (!attendanceStatusHasTimes(status)) {
        quickCheckInRef.current = ''
        quickCheckOutRef.current = ''
        setQuickCheckIn('')
        setQuickCheckOut('')
      } else if (!quickCheckInRef.current) {
        quickCheckInRef.current = DEFAULT_ATTENDANCE_CHECK_IN
        quickCheckOutRef.current = DEFAULT_ATTENDANCE_CHECK_OUT
        setQuickCheckIn(quickCheckInRef.current)
        setQuickCheckOut(quickCheckOutRef.current)
      }
      commitQuickEntry({ status })
    },
    [commitQuickEntry]
  )

  const onQuickCheckInChange = useCallback(
    (checkIn: string) => {
      quickCheckInRef.current = checkIn
      setQuickCheckIn(checkIn)
      commitQuickEntry({ checkIn })
    },
    [commitQuickEntry]
  )

  const onQuickCheckOutChange = useCallback(
    (checkOut: string) => {
      quickCheckOutRef.current = checkOut
      setQuickCheckOut(checkOut)
      commitQuickEntry({ checkOut })
    },
    [commitQuickEntry]
  )

  function applyBulkDefaults(defaults: AttendanceBulkDefaults) {
    const resolved = attendanceDefaultsFromPlanDay(todayPlanDayType, defaults)
    if (!isHolidayPlanDay(todayPlanDayType)) {
      setBulkDefaults(defaults)
    }
    const nextRows = rowsRef.current.map(row => ({
      ...row,
      status: resolved.status,
      checkIn: resolved.checkIn,
      checkOut: resolved.checkOut
    }))
    rowsRef.current = nextRows
    setRows(nextRows)
    void persistAllRows(nextRows)
  }

  function onWorkDateChange(next: string) {
    if (!next || next > todayIso) return
    setWorkDate(next)
  }

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{t('attendance.today.title')}</h3>
              <p className="text-sm text-slate-400">{formatTodayLabel(workDate, lang)}</p>
            </div>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-400">{t('attendance.today.selectDate')}</span>
            <input
              type="date"
              className={inputCls()}
              value={workDate}
              max={todayIso}
              onChange={e => onWorkDateChange(e.target.value)}
              dir="ltr"
            />
          </label>
          {!isSelectedToday && (
            <button
              type="button"
              onClick={() => setWorkDate(todayIso)}
              className="rounded-xl border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-200 hover:bg-violet-500/20"
            >
              {t('attendance.today.backToToday')}
            </button>
          )}
        </div>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDefaultsOpen(true)}
              className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
            >
              <Settings2 className="me-1 inline h-4 w-4" /> {t('attendance.today.defaultsBtn')}
            </button>
            {saveState === 'saving' && (
              <span className="text-xs font-bold text-violet-300">{t('common.saving')}</span>
            )}
            {saveState === 'saved' && (
              <span className="text-xs font-bold text-emerald-300">{t('attendance.today.autoSaved')}</span>
            )}
          </div>
        )}
      </div>

      {!canManage && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          {t('attendance.today.readOnlyHint')}
        </div>
      )}

      {!isSelectedToday && canManage && (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-100">
          {t('attendance.today.pastDayBanner')}
        </div>
      )}

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

      <TodayAttendanceSummary rows={rows} loading={loading} />

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
        allowedStatuses={allowedStatuses}
      />

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
                        patchRow(i, { status }, true)
                        if (row.employeeId === quickEmployeeId) {
                          setQuickStatus(status)
                          if (!attendanceStatusHasTimes(status)) {
                            setQuickCheckIn('')
                            setQuickCheckOut('')
                          }
                        }
                      }}
                    >
                      {allowedStatuses.map(s => (
                        <option key={s} value={s}>
                          {t(`attendance.status.${s}`)}
                        </option>
                      ))}
                      {!allowedStatuses.includes(row.status) && (
                        <option value={row.status}>{t(`attendance.status.${row.status}`)}</option>
                      )}
                    </select>
                  </td>
                  <td className="table-cell">
                    <input
                      type="time"
                      disabled={!canManage || !attendanceStatusHasTimes(row.status)}
                      className={`${inputCls()} w-28 py-1.5 text-xs disabled:opacity-40`}
                      value={row.checkIn}
                      onChange={e => {
                        patchRow(i, { checkIn: e.target.value }, true)
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
                        patchRow(i, { checkOut: e.target.value }, true)
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
                      onChange={e => patchRow(i, { notes: e.target.value }, true)}
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
