import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CalendarDays } from 'lucide-react'
import { useAuth } from '../Context/AuthContext'
import { useLang } from '../i18n/LanguageContext'
import { inputCls } from '../Components/FormField'
import { PLAN_DAY_TYPES, type PlanDayType, type ProductionPlanWorkDayEdit, type ProductionPlanWorkDayRow } from '../Types/productionPlanWorkDayDaily'
import {
  availableDaysFromRows,
  buildMonthWorkDayRows,
  computeProductivityDeficit,
  dayTypeBadgeClass,
  defaultPlannedHoursForDayType,
  isVacationOrFactoryHoliday,
  isActualHoursLocked,
  resolveLaborAttendanceEfficiency,
  resolveWorkDespiteVacation,
  mergeProductivityIntoRows,
  mergeStopsIntoRows
} from '../Utils/productionPlanWorkDayDaily'
import {
  bulkUpsertProductionPlanWorkDays,
  getMonthProductivityDetail,
  getProductionPlanWorkDaysMonth
} from '../services/productionPlanWorkDayDailyService'
import { getProductionPlanWorkDays } from '../services/productionPlanWorkDaysService'
import { formatAuthApiError } from '../services/authService'
import { getProductionLineStops, aggregateStopsByDate } from '../services/productionStopService'
import { computeDailyAttendanceEfficiency, getAttendanceDaysForMonth } from '../services/attendanceService'
import { getEmployees } from '../services/employeesService'
import { ProductivityBreakdownHover } from './productivity/ProductivityBreakdownHover'
import { ProductivityDeficitCell } from './productivity/ProductivityDeficitCell'
import { ProductivityLossReasonsModal } from './productivity/ProductivityLossReasonsModal'
import { getProductivityDelayReasonsMonth } from '../services/productivityDelayReasonsService'
import type { ProductivityDelayKind } from '../Types/productivityDelayReason'
import { TableExportButtons } from './TableExportButtons'
import { buildModelProductivityBreakdown } from '../Utils/productivityBreakdown'
import { buildWorkDaysExportRows } from '../Utils/planningExport'
import type { TableExportColumn } from '../Utils/tableExport'
import type { EntryProductivityDay } from '../Types/entryProductivity'
import type { VehicleModel } from '../Types/settings'

const cell = 'table-cell text-center align-middle'
const dateStickyHeader = `${cell} sticky start-0 z-10 bg-slate-950/90`
const dateStickyBody = `${cell} sticky start-0 z-10 bg-slate-900`
const dayTypeSelectCls = 'mx-auto block w-[9.5rem] shrink-0 py-1.5 text-xs font-bold text-center'

type Props = {
  onAvailableDaysChange?: (count: number) => void
  variant?: 'workDays' | 'summary'
}

function currentYm(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function formatDayLabel(workDate: string, lang: string): string {
  const d = new Date(workDate + 'T12:00:00')
  const weekday = d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long' })
  return `${weekday} ${d.getDate()}`
}

function formatCount(n: number): string {
  return n ? String(n) : '—'
}

function formatEfficiency(value: number | null): string {
  return value == null ? '—' : `${value}%`
}

function formatDeficit(actualHours: number, lineJph: number, productivity: number): string {
  if (lineJph <= 0 && actualHours <= 0 && productivity <= 0) return '—'
  return String(computeProductivityDeficit(actualHours, lineJph, productivity))
}

function delayReasonKey(workDate: string, kind: ProductivityDelayKind): string {
  return `${workDate}|${kind}`
}

export function ProductionPlanWorkDaysTab({ onAvailableDaysChange, variant = 'summary' }: Props) {
  const isWorkDaysOnly = variant === 'workDays'
  const { t, lang } = useLang()
  const { hasRole } = useAuth()
  const canManage = hasRole('admin', 'production')
  const canEditRows = canManage && isWorkDaysOnly

  const init = currentYm()
  const [year, setYear] = useState(init.year)
  const [month, setMonth] = useState(init.month)
  const [rows, setRows] = useState<ProductionPlanWorkDayEdit[]>([])
  const [entryRecords, setEntryRecords] = useState<EntryProductivityDay[]>([])
  const [exitRecords, setExitRecords] = useState<EntryProductivityDay[]>([])
  const [repairRecords, setRepairRecords] = useState<EntryProductivityDay[]>([])
  const [delayReasonsByKey, setDelayReasonsByKey] = useState<Map<string, string>>(new Map())
  const [lossReasonsModal, setLossReasonsModal] = useState<{
    workDate: string
    kind: ProductivityDelayKind
    deficit: number
  } | null>(null)
  const [productivityModels, setProductivityModels] = useState<VehicleModel[]>([])
  const [lineJph, setLineJph] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const saveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const monthValue = `${year}-${String(month).padStart(2, '0')}`
  const availableDays = useMemo(() => availableDaysFromRows(rows), [rows])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const [saved, productivity, stops, employees, attendanceDays, workConfig] = await Promise.all([
        getProductionPlanWorkDaysMonth(year, month),
        getMonthProductivityDetail(year, month),
        getProductionLineStops(year, month).catch(() => []),
        getEmployees().catch(() => []),
        getAttendanceDaysForMonth(year, month).catch(() => []),
        getProductionPlanWorkDays(year, month).catch(() => null)
      ])
      const activeEmployeeIds = employees.filter(e => e.isActive).map(e => e.id)
      const attendanceEfficiencyByDate = computeDailyAttendanceEfficiency(
        activeEmployeeIds,
        year,
        month,
        attendanceDays.map(d => ({ employeeId: d.employeeId, workDate: d.workDate, status: d.status })),
        undefined,
        new Map(saved.map(r => [r.workDate, r.dayType]))
      )
      const { minutesByDate, lostVehiclesByDate } = aggregateStopsByDate(stops)
      const base = buildMonthWorkDayRows(year, month, saved)
      const merged = mergeStopsIntoRows(
        mergeProductivityIntoRows(base, productivity.entryByDate, productivity.exitByDate, productivity.repairByDate),
        minutesByDate,
        lostVehiclesByDate,
        attendanceEfficiencyByDate
      )
      setEntryRecords(productivity.entryRecords)
      setExitRecords(productivity.exitRecords)
      setRepairRecords(productivity.repairRecords)
      const [entryReasons, exitReasons, repairReasons] = await Promise.all([
        getProductivityDelayReasonsMonth(year, month, 'entry').catch(() => []),
        getProductivityDelayReasonsMonth(year, month, 'exit').catch(() => []),
        getProductivityDelayReasonsMonth(year, month, 'repair').catch(() => [])
      ])
      const reasonsMap = new Map<string, string>()
      for (const record of [...entryReasons, ...exitReasons, ...repairReasons]) {
        reasonsMap.set(delayReasonKey(record.workDate, record.kind), record.reasons)
      }
      setDelayReasonsByKey(reasonsMap)
      setProductivityModels(productivity.models)
      setLineJph(workConfig?.lineJph ?? 0)
      setRows(merged)
      onAvailableDaysChange?.(availableDaysFromRows(merged))
    } catch (e) {
      setError(formatAuthApiError(e instanceof Error ? e.message : t('common.error')))
    } finally {
      setLoading(false)
    }
  }, [year, month, t, onAvailableDaysChange])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    return () => {
      for (const timer of saveTimersRef.current.values()) clearTimeout(timer)
      saveTimersRef.current.clear()
    }
  }, [])

  const persistRow = useCallback(
    async (row: ProductionPlanWorkDayRow) => {
      if (!canEditRows) return
      setSaving(true)
      setError('')
      try {
        await bulkUpsertProductionPlanWorkDays([
          {
            workDate: row.workDate,
            dayType: row.dayType,
            plannedHours: row.plannedHours,
            actualHours: row.actualHours,
            totalStops: row.totalStops,
            workDespiteVacation: row.workDespiteVacation,
            notes: row.notes
          }
        ])
        setSuccess(t('productionOrders.workDaysTab.saved'))
        window.setTimeout(() => setSuccess(''), 2000)
      } catch (e) {
        setError(formatAuthApiError(e instanceof Error ? e.message : t('common.error')))
      } finally {
        setSaving(false)
      }
    },
    [canEditRows, t]
  )

  function scheduleSaveRow(row: ProductionPlanWorkDayEdit) {
    if (!canEditRows) return
    const existing = saveTimersRef.current.get(row.workDate)
    if (existing) clearTimeout(existing)
    saveTimersRef.current.set(
      row.workDate,
      setTimeout(() => {
        saveTimersRef.current.delete(row.workDate)
        void persistRow(row)
      }, 600)
    )
  }

  function flushSaveRow(row: ProductionPlanWorkDayEdit) {
    if (!canEditRows) return
    const existing = saveTimersRef.current.get(row.workDate)
    if (existing) {
      clearTimeout(existing)
      saveTimersRef.current.delete(row.workDate)
    }
    void persistRow(row)
  }

  function patchRow(index: number, patch: Partial<ProductionPlanWorkDayEdit>) {
    setRows(prev => {
      const next = prev.map((row, i) => {
        if (i !== index) return row
        const updated = { ...row, ...patch }
        if (patch.dayType && patch.plannedHours === undefined) {
          updated.plannedHours = defaultPlannedHoursForDayType(patch.dayType)
          if (isVacationOrFactoryHoliday(patch.dayType)) {
            updated.workDespiteVacation = false
            updated.actualHours = 0
          } else {
            updated.workDespiteVacation = false
          }
        }
        if (patch.workDespiteVacation === false) {
          updated.actualHours = 0
        }
        return updated
      })
      const updatedRow = next[index]
      if (updatedRow) scheduleSaveRow(updatedRow)
      onAvailableDaysChange?.(availableDaysFromRows(next))
      return next
    })
  }

  const monthBreakdown = useMemo(
    () => buildModelProductivityBreakdown(entryRecords, exitRecords, productivityModels, undefined, repairRecords),
    [entryRecords, exitRecords, repairRecords, productivityModels]
  )

  function dayBreakdown(workDate: string) {
    return buildModelProductivityBreakdown(entryRecords, exitRecords, productivityModels, workDate, repairRecords)
  }

  const displayRows = useMemo(
    () =>
      rows.map(row => ({
        ...row,
        entryDeficit: computeProductivityDeficit(row.actualHours, lineJph, row.entryProductivity),
        exitDeficit: computeProductivityDeficit(row.actualHours, lineJph, row.exitProductivity),
        repairDeficit: computeProductivityDeficit(row.actualHours, lineJph, row.repairProductivity)
      })),
    [rows, lineJph]
  )

  const totals = useMemo(() => {
    const efficiencyValues = displayRows
      .map(r => resolveLaborAttendanceEfficiency(r))
      .filter((v): v is number => v != null)
    const laborAttendanceEfficiency =
      efficiencyValues.length > 0
        ? Math.round(efficiencyValues.reduce((sum, v) => sum + v, 0) / efficiencyValues.length)
        : null
    return {
      plannedHours: displayRows.reduce((sum, row) => sum + row.plannedHours, 0),
      actualHours: displayRows.reduce((sum, row) => sum + row.actualHours, 0),
      laborAttendanceEfficiency,
      entryProductivity: displayRows.reduce((sum, row) => sum + row.entryProductivity, 0),
      entryDeficit: displayRows.reduce((sum, row) => sum + row.entryDeficit, 0),
      stopMinutes: displayRows.reduce((sum, row) => sum + row.stopMinutes, 0),
      stopLostVehicles: displayRows.reduce((sum, row) => sum + row.stopLostVehicles, 0),
      exitProductivity: displayRows.reduce((sum, row) => sum + row.exitProductivity, 0),
      exitDeficit: displayRows.reduce((sum, row) => sum + row.exitDeficit, 0),
      repairProductivity: displayRows.reduce((sum, row) => sum + row.repairProductivity, 0),
      repairDeficit: displayRows.reduce((sum, row) => sum + row.repairDeficit, 0)
    }
  }, [displayRows])

  const workDaysExportColumns = useMemo<TableExportColumn<ReturnType<typeof buildWorkDaysExportRows>[number]>[]>(
    () => [
      { label: t('productionOrders.workDaysTab.cols.date'), value: r => r.date },
      { label: t('productionOrders.workDaysTab.cols.dayType'), value: r => r.dayType },
      { label: t('productionOrders.workDaysTab.cols.laborAttendance'), value: r => r.laborAttendance },
      { label: t('productionOrders.workDaysTab.cols.plannedHours'), value: r => r.plannedHours },
      { label: t('productionOrders.workDaysTab.cols.actualHours'), value: r => r.actualHours }
    ],
    [t]
  )

  const workDaysExportRows = useMemo(
    () =>
      buildWorkDaysExportRows(
        rows,
        d => formatDayLabel(d, lang),
        dayType => t(`productionOrders.workDaysTab.dayTypes.${dayType}`),
        formatEfficiency
      ),
    [rows, lang, t]
  )

  return (
    <div className="card-industrial p-5 sm:p-6">
      <div className="mb-4 flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                {isWorkDaysOnly ? t('productionOrders.workDaysTab.title') : t('productivity.summary.title')}
              </h3>
              <p className="text-sm text-slate-400">
                {isWorkDaysOnly ? t('productionOrders.workDaysTab.subtitle') : t('productivity.summary.subtitle')}
              </p>
              {canEditRows && saving && <p className="mt-1 text-xs font-bold text-cyan-300">{t('common.saving')}</p>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="month"
              className={`${inputCls()} w-full py-2 text-sm sm:w-auto`}
              value={monthValue}
              onChange={e => {
                const [y, m] = e.target.value.split('-').map(Number)
                if (y && m) {
                  setYear(y)
                  setMonth(m)
                }
              }}
            />
            {isWorkDaysOnly && !loading && workDaysExportRows.length > 0 && (
              <TableExportButtons
                filename={`planning-work-days-${monthValue}`}
                title={t('planning.export.workDaysTitle', { month: monthValue })}
                columns={workDaysExportColumns}
                rows={workDaysExportRows}
              />
            )}
          </div>
        </div>

        <div className={`mt-4 grid grid-cols-1 gap-2 ${isWorkDaysOnly ? 'sm:grid-cols-3' : 'sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8'}`}>
          <SummaryPill
            label={t('productionOrders.workDays.available')}
            value={String(availableDays)}
            tone="violet"
          />
          <SummaryPill
            label={t('productionOrders.workDaysTab.summary.plannedHours')}
            value={totals.plannedHours ? String(totals.plannedHours) : '—'}
            tone="cyan"
          />
          <SummaryPill
            label={t('productionOrders.workDaysTab.summary.actualHours')}
            value={totals.actualHours ? String(totals.actualHours) : '—'}
            tone="slate"
          />
          {!isWorkDaysOnly && (
            <>
          <SummaryPill
            label={t('productionOrders.workDaysTab.summary.totalStops')}
            value={formatCount(totals.stopMinutes)}
            tone="amber"
          />
          <SummaryPill
            label={t('productionOrders.workDaysTab.summary.totalStopsCars')}
            value={formatCount(totals.stopLostVehicles)}
            tone="amber"
          />
          <SummaryPill
            label={t('productionOrders.workDaysTab.cols.entryProductivity')}
            value={
              totals.entryProductivity ? (
                <ProductivityBreakdownHover breakdown={monthBreakdown} kind="entry" className="text-cyan-300">
                  {formatCount(totals.entryProductivity)}
                </ProductivityBreakdownHover>
              ) : (
                '—'
              )
            }
            tone="cyan"
          />
          <SummaryPill
            label={t('productionOrders.workDaysTab.cols.exitProductivity')}
            value={
              totals.exitProductivity ? (
                <ProductivityBreakdownHover breakdown={monthBreakdown} kind="exit" className="text-emerald-300">
                  {formatCount(totals.exitProductivity)}
                </ProductivityBreakdownHover>
              ) : (
                '—'
              )
            }
            tone="emerald"
          />
          <SummaryPill
            label={t('productionOrders.workDaysTab.cols.repairProductivity')}
            value={
              totals.repairProductivity ? (
                <ProductivityBreakdownHover breakdown={monthBreakdown} kind="repair" className="text-orange-300">
                  {formatCount(totals.repairProductivity)}
                </ProductivityBreakdownHover>
              ) : (
                '—'
              )
            }
            tone="orange"
          />
            </>
          )}
        </div>
      </div>

      {success && (
        <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className={`w-full text-sm ${isWorkDaysOnly ? 'min-w-[640px]' : 'min-w-[920px]'}`}>
          <thead className="bg-slate-950/90">
            {isWorkDaysOnly ? (
              <tr>
                <th className={`${dateStickyHeader} text-xs font-black uppercase text-slate-400`}>
                  {t('productionOrders.workDaysTab.cols.date')}
                </th>
                <th className={`${cell} text-xs font-black uppercase text-slate-400`}>
                  {t('productionOrders.workDaysTab.cols.dayType')}
                </th>
                <th className={`${cell} text-xs font-black uppercase text-violet-300`}>
                  {t('productionOrders.workDaysTab.cols.laborAttendance')}
                </th>
                <th className={`${cell} text-xs font-black uppercase text-slate-400`}>
                  {t('productionOrders.workDaysTab.cols.plannedHours')}
                </th>
                <th className={`${cell} text-xs font-black uppercase text-slate-400`}>
                  {t('productionOrders.workDaysTab.cols.actualHours')}
                </th>
              </tr>
            ) : (
              <>
            <tr>
              <th rowSpan={2} className={`${dateStickyHeader} text-xs font-black uppercase text-slate-400`}>
                {t('productionOrders.workDaysTab.cols.date')}
              </th>
              <th colSpan={2} className={`${cell} text-xs font-black uppercase text-amber-300`}>
                {t('productionOrders.workDaysTab.cols.totalStops')}
                <span className="mt-0.5 block text-[10px] font-normal normal-case text-amber-200/60">
                  {t('productionOrders.workDaysTab.stopsFromPage')}
                </span>
              </th>
              <th colSpan={2} className={`${cell} text-xs font-black uppercase text-cyan-300`}>
                {t('productionOrders.workDaysTab.cols.entryProductivity')}
              </th>
              <th colSpan={2} className={`${cell} text-xs font-black uppercase text-emerald-300`}>
                {t('productionOrders.workDaysTab.cols.exitProductivity')}
              </th>
              <th colSpan={2} className={`${cell} text-xs font-black uppercase text-orange-300`}>
                {t('productionOrders.workDaysTab.cols.repairProductivity')}
              </th>
            </tr>
            <tr>
              <th className={`${cell} text-[10px] font-black uppercase text-amber-200`}>
                {t('productionOrders.workDaysTab.cols.stopMinutes')}
              </th>
              <th className={`${cell} border-e border-slate-700 text-[10px] font-black uppercase text-amber-200`}>
                {t('productionOrders.workDaysTab.cols.stopCars')}
              </th>
              <th className={`${cell} text-[10px] font-black uppercase text-cyan-200`}>
                {t('productionOrders.workDaysTab.cols.productivityQty')}
              </th>
              <th className={`${cell} border-e border-slate-700 text-[10px] font-black uppercase text-rose-300`}>
                {t('productionOrders.workDaysTab.cols.deficitShort')}
              </th>
              <th className={`${cell} text-[10px] font-black uppercase text-emerald-200`}>
                {t('productionOrders.workDaysTab.cols.productivityQty')}
              </th>
              <th className={`${cell} border-e border-slate-700 text-[10px] font-black uppercase text-rose-300`}>
                {t('productionOrders.workDaysTab.cols.deficitShort')}
              </th>
              <th className={`${cell} text-[10px] font-black uppercase text-orange-200`}>
                {t('productionOrders.workDaysTab.cols.productivityQty')}
              </th>
              <th className={`${cell} text-[10px] font-black uppercase text-rose-300`}>
                {t('productionOrders.workDaysTab.cols.deficitShort')}
              </th>
            </tr>
              </>
            )}
          </thead>
          <tbody className="divide-y divide-slate-800">
            {displayRows.map((row, index) => {
              const plannedHoursLocked = isVacationOrFactoryHoliday(row.dayType)
              const actualHoursLocked = isActualHoursLocked(row)
              const attendanceEfficiency = resolveLaborAttendanceEfficiency(row)
              const vacationWorkEnabled = resolveWorkDespiteVacation(row)
              return (
              <tr key={row.workDate} className="bg-slate-900/30 hover:bg-slate-800/40">
                <td className={dateStickyBody}>
                  <span className="whitespace-nowrap font-bold text-slate-200">
                    {formatDayLabel(row.workDate, lang)}
                  </span>
                </td>
                {isWorkDaysOnly && (
                  <>
                <td className={cell}>
                  <select
                    disabled={!canEditRows}
                    className={`${inputCls()} ${dayTypeSelectCls} ${dayTypeBadgeClass(row.dayType)}`}
                    value={row.dayType}
                    onChange={e => patchRow(index, { dayType: e.target.value as PlanDayType })}
                  >
                    {PLAN_DAY_TYPES.map(type => (
                      <option key={type} value={type}>
                        {t(`productionOrders.workDaysTab.dayTypes.${type}`)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={`${cell} font-black text-violet-300`}>{formatEfficiency(attendanceEfficiency)}</td>
                <td className={cell}>
                  {plannedHoursLocked ? (
                    <span className="text-slate-500">—</span>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      disabled={!canEditRows}
                      className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-center text-sm"
                      value={row.plannedHours || ''}
                      onChange={e => patchRow(index, { plannedHours: Number(e.target.value) || 0 })}
                      onBlur={e => flushSaveRow({ ...row, plannedHours: Number(e.target.value) || 0 })}
                    />
                  )}
                </td>
                <td className={cell}>
                  <div className="mx-auto flex max-w-[8.5rem] items-center justify-center gap-1.5">
                    {plannedHoursLocked && canEditRows && (
                      <label
                        className="inline-flex shrink-0 cursor-pointer items-center"
                        title={t('productionOrders.workDaysTab.vacationWorkHint')}
                      >
                        <input
                          type="checkbox"
                          checked={vacationWorkEnabled}
                          onChange={e =>
                            patchRow(index, {
                              workDespiteVacation: e.target.checked,
                              ...(e.target.checked ? {} : { actualHours: 0 })
                            })
                          }
                          className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-violet-500 focus:ring-violet-500/40"
                        />
                      </label>
                    )}
                    {actualHoursLocked ? (
                      <span className="text-slate-500">—</span>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        disabled={!canEditRows}
                        className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-center text-sm"
                        value={row.actualHours || ''}
                        onChange={e => patchRow(index, { actualHours: Number(e.target.value) || 0 })}
                        onBlur={e => flushSaveRow({ ...row, actualHours: Number(e.target.value) || 0 })}
                      />
                    )}
                  </div>
                </td>
                  </>
                )}
                {!isWorkDaysOnly && (
                  <>
                <td className={`${cell} font-black text-amber-300`}>{formatCount(row.stopMinutes)}</td>
                <td className={`${cell} border-e border-slate-800 font-black text-amber-300`}>{formatCount(row.stopLostVehicles)}</td>
                <td className={`${cell} font-black text-cyan-300`}>
                  {row.entryProductivity ? (
                    <ProductivityBreakdownHover breakdown={dayBreakdown(row.workDate)} kind="entry" className="text-cyan-300">
                      {row.entryProductivity}
                    </ProductivityBreakdownHover>
                  ) : (
                    '—'
                  )}
                </td>
                <td className={`${cell} border-e border-slate-800 font-black text-rose-300`}>
                  <ProductivityDeficitCell
                    deficit={row.entryDeficit}
                    display={formatDeficit(row.actualHours, lineJph, row.entryProductivity)}
                    workDate={row.workDate}
                    kind="entry"
                    onShowReasons={(date, kind, deficit) => setLossReasonsModal({ workDate: date, kind, deficit })}
                  />
                </td>
                <td className={`${cell} font-black text-emerald-300`}>
                  {row.exitProductivity ? (
                    <ProductivityBreakdownHover breakdown={dayBreakdown(row.workDate)} kind="exit" className="text-emerald-300">
                      {row.exitProductivity}
                    </ProductivityBreakdownHover>
                  ) : (
                    '—'
                  )}
                </td>
                <td className={`${cell} border-e border-slate-800 font-black text-rose-300`}>
                  <ProductivityDeficitCell
                    deficit={row.exitDeficit}
                    display={formatDeficit(row.actualHours, lineJph, row.exitProductivity)}
                    workDate={row.workDate}
                    kind="exit"
                    onShowReasons={(date, kind, deficit) => setLossReasonsModal({ workDate: date, kind, deficit })}
                  />
                </td>
                <td className={`${cell} font-black text-orange-300`}>
                  {row.repairProductivity ? (
                    <ProductivityBreakdownHover breakdown={dayBreakdown(row.workDate)} kind="repair" className="text-orange-300">
                      {row.repairProductivity}
                    </ProductivityBreakdownHover>
                  ) : (
                    '—'
                  )}
                </td>
                <td className={`${cell} font-black text-rose-300`}>
                  <ProductivityDeficitCell
                    deficit={row.repairDeficit}
                    display={formatDeficit(row.actualHours, lineJph, row.repairProductivity)}
                    workDate={row.workDate}
                    kind="repair"
                    onShowReasons={(date, kind, deficit) => setLossReasonsModal({ workDate: date, kind, deficit })}
                  />
                </td>
                  </>
                )}
              </tr>
              )
            })}
            {rows.length > 0 && (
              <tr className="bg-slate-950/95 text-base font-black">
                <td className={`${dateStickyBody} bg-slate-950/95 text-white`}>
                  {t('productionOrders.grandTotal')}
                </td>
                {isWorkDaysOnly && (
                  <>
                <td className={cell} />
                <td className={`${cell} text-violet-300`}>{formatEfficiency(totals.laborAttendanceEfficiency)}</td>
                <td className={`${cell} text-cyan-200`}>{totals.plannedHours || '—'}</td>
                <td className={`${cell} text-slate-200`}>{totals.actualHours || '—'}</td>
                  </>
                )}
                {!isWorkDaysOnly && (
                  <>
                <td className={`${cell} text-amber-300`}>{formatCount(totals.stopMinutes)}</td>
                <td className={`${cell} border-e border-slate-800 text-amber-300`}>{formatCount(totals.stopLostVehicles)}</td>
                <td className={`${cell} text-cyan-300`}>
                  {totals.entryProductivity ? (
                    <ProductivityBreakdownHover breakdown={monthBreakdown} kind="entry" className="text-cyan-300">
                      {totals.entryProductivity}
                    </ProductivityBreakdownHover>
                  ) : (
                    '—'
                  )}
                </td>
                <td className={`${cell} border-e border-slate-800 text-rose-300`}>
                  {lineJph > 0 || totals.actualHours || totals.entryProductivity ? (
                    totals.entryDeficit > 0 ? (
                      <span className="font-black text-red-400">{totals.entryDeficit}</span>
                    ) : (
                      totals.entryDeficit
                    )
                  ) : (
                    '—'
                  )}
                </td>
                <td className={`${cell} text-emerald-300`}>
                  {totals.exitProductivity ? (
                    <ProductivityBreakdownHover breakdown={monthBreakdown} kind="exit" className="text-emerald-300">
                      {totals.exitProductivity}
                    </ProductivityBreakdownHover>
                  ) : (
                    '—'
                  )}
                </td>
                <td className={`${cell} border-e border-slate-800 text-rose-300`}>
                  {lineJph > 0 || totals.actualHours || totals.exitProductivity ? (
                    totals.exitDeficit > 0 ? (
                      <span className="font-black text-red-400">{totals.exitDeficit}</span>
                    ) : (
                      totals.exitDeficit
                    )
                  ) : (
                    '—'
                  )}
                </td>
                <td className={`${cell} text-orange-300`}>
                  {totals.repairProductivity ? (
                    <ProductivityBreakdownHover breakdown={monthBreakdown} kind="repair" className="text-orange-300">
                      {totals.repairProductivity}
                    </ProductivityBreakdownHover>
                  ) : (
                    '—'
                  )}
                </td>
                <td className={`${cell} text-rose-300`}>
                  {lineJph > 0 || totals.actualHours || totals.repairProductivity ? (
                    totals.repairDeficit > 0 ? (
                      <span className="font-black text-red-400">{totals.repairDeficit}</span>
                    ) : (
                      totals.repairDeficit
                    )
                  ) : (
                    '—'
                  )}
                </td>
                  </>
                )}
              </tr>
            )}
          </tbody>
        </table>
        {loading && <p className="p-8 text-center text-slate-400">{t('common.loading')}</p>}
        {!loading && rows.length === 0 && (
          <p className="p-8 text-center text-slate-500">{t('common.noData')}</p>
        )}
      </div>

      {lossReasonsModal && (
        <ProductivityLossReasonsModal
          open
          workDate={lossReasonsModal.workDate}
          kind={lossReasonsModal.kind}
          deficit={lossReasonsModal.deficit}
          reasons={delayReasonsByKey.get(delayReasonKey(lossReasonsModal.workDate, lossReasonsModal.kind)) ?? ''}
          onClose={() => setLossReasonsModal(null)}
        />
      )}
    </div>
  )
}

function SummaryPill({
  label,
  value,
  hint,
  tone = 'violet'
}: {
  label: string
  value: ReactNode
  hint?: string
  tone?: 'violet' | 'cyan' | 'slate' | 'emerald' | 'amber' | 'orange'
}) {
  const borderCls =
    tone === 'cyan'
      ? 'border-cyan-500/30 bg-cyan-500/10'
      : tone === 'slate'
        ? 'border-slate-600 bg-slate-800/50'
        : tone === 'emerald'
          ? 'border-emerald-500/30 bg-emerald-500/10'
          : tone === 'amber'
            ? 'border-amber-500/30 bg-amber-500/10'
            : tone === 'orange'
              ? 'border-orange-500/30 bg-orange-500/10'
              : 'border-violet-500/30 bg-violet-500/10'
  const labelCls =
    tone === 'cyan'
      ? 'text-cyan-200'
      : tone === 'slate'
        ? 'text-slate-300'
        : tone === 'emerald'
          ? 'text-emerald-200'
          : tone === 'amber'
            ? 'text-amber-200'
            : tone === 'orange'
              ? 'text-orange-200'
              : 'text-violet-200'
  const valueCls =
    tone === 'cyan'
      ? 'text-cyan-300'
      : tone === 'slate'
        ? 'text-white'
        : tone === 'emerald'
          ? 'text-emerald-300'
          : tone === 'amber'
            ? 'text-amber-300'
            : tone === 'orange'
              ? 'text-orange-300'
              : 'text-white'

  return (
    <div className={`min-w-0 rounded-xl border px-3 py-2 ${borderCls}`}>
      <p className={`truncate text-xs font-bold ${labelCls}`}>{label}</p>
      <p className={`text-lg font-black ${valueCls}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-slate-500">{hint}</p>}
    </div>
  )
}
