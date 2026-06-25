import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useAuth } from '../Context/AuthContext'
import { useLang } from '../i18n/LanguageContext'
import { inputCls } from '../Components/FormField'
import { PLAN_DAY_TYPES, type PlanDayType, type ProductionPlanWorkDayEdit, type ProductionPlanWorkDayRow } from '../Types/productionPlanWorkDayDaily'
import {
  availableDaysFromRows,
  buildMonthWorkDayRows,
  dayTypeBadgeClass,
  defaultPlannedHoursForDayType,
  mergeProductivityIntoRows,
  mergeStopsIntoRows
} from '../Utils/productionPlanWorkDayDaily'
import {
  bulkUpsertProductionPlanWorkDays,
  getMonthProductivityTotals,
  getProductionPlanWorkDaysMonth
} from '../services/productionPlanWorkDayDailyService'
import { getProductionLineStops, aggregateStopsByDate } from '../services/productionStopService'

const cell = 'table-cell text-center align-middle'
const stickyCell = `${cell} sticky start-0 z-10 bg-slate-900 text-start`

type Props = {
  onAvailableDaysChange?: (count: number) => void
}

function currentYm(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function formatDayLabel(workDate: string, lang: string): string {
  const d = new Date(workDate + 'T12:00:00')
  const weekday = d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short' })
  return `${weekday} ${d.getDate()}`
}

function formatCount(n: number): string {
  return n ? String(n) : '—'
}

export function ProductionPlanWorkDaysTab({ onAvailableDaysChange }: Props) {
  const { t, lang } = useLang()
  const { hasRole } = useAuth()
  const canManage = hasRole('admin', 'production')

  const init = currentYm()
  const [year, setYear] = useState(init.year)
  const [month, setMonth] = useState(init.month)
  const [rows, setRows] = useState<ProductionPlanWorkDayEdit[]>([])
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
      const [saved, productivity, stops] = await Promise.all([
        getProductionPlanWorkDaysMonth(year, month),
        getMonthProductivityTotals(year, month),
        getProductionLineStops(year, month).catch(() => [])
      ])
      const { minutesByDate, lostVehiclesByDate } = aggregateStopsByDate(stops)
      const base = buildMonthWorkDayRows(year, month, saved)
      const merged = mergeStopsIntoRows(
        mergeProductivityIntoRows(base, productivity.entryByDate, productivity.exitByDate),
        minutesByDate,
        lostVehiclesByDate
      )
      setRows(merged)
      onAvailableDaysChange?.(availableDaysFromRows(merged))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
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
      if (!canManage) return
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
            notes: row.notes
          }
        ])
        setSuccess(t('productionOrders.workDaysTab.saved'))
        window.setTimeout(() => setSuccess(''), 2000)
      } catch (e) {
        setError(e instanceof Error ? e.message : t('common.error'))
      } finally {
        setSaving(false)
      }
    },
    [canManage, t]
  )

  function scheduleSaveRow(row: ProductionPlanWorkDayEdit) {
    if (!canManage) return
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
    if (!canManage) return
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
        }
        return updated
      })
      const updatedRow = next[index]
      if (updatedRow) scheduleSaveRow(updatedRow)
      onAvailableDaysChange?.(availableDaysFromRows(next))
      return next
    })
  }

  const totals = useMemo(
    () => ({
      plannedHours: rows.reduce((sum, row) => sum + row.plannedHours, 0),
      actualHours: rows.reduce((sum, row) => sum + row.actualHours, 0),
      entryProductivity: rows.reduce((sum, row) => sum + row.entryProductivity, 0),
      stopMinutes: rows.reduce((sum, row) => sum + row.stopMinutes, 0),
      stopLostVehicles: rows.reduce((sum, row) => sum + row.stopLostVehicles, 0),
      exitProductivity: rows.reduce((sum, row) => sum + row.exitProductivity, 0)
    }),
    [rows]
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
              <h3 className="text-lg font-black text-white">{t('productivity.summary.title')}</h3>
              <p className="text-sm text-slate-400">{t('productivity.summary.subtitle')}</p>
              {saving && <p className="mt-1 text-xs font-bold text-cyan-300">{t('common.saving')}</p>}
            </div>
          </div>
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
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
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
          <SummaryPill
            label={t('productionOrders.workDaysTab.cols.entryProductivity')}
            value={formatCount(totals.entryProductivity)}
            tone="cyan"
          />
          <SummaryPill
            label={t('productionOrders.workDaysTab.cols.exitProductivity')}
            value={formatCount(totals.exitProductivity)}
            tone="emerald"
          />
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
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-slate-950/90">
            <tr>
              <th rowSpan={2} className={`${stickyCell} text-xs font-black uppercase text-slate-400`}>
                {t('productionOrders.workDaysTab.cols.date')}
              </th>
              <th rowSpan={2} className={`${cell} text-xs font-black uppercase text-slate-400`}>
                {t('productionOrders.workDaysTab.cols.plannedHours')}
              </th>
              <th rowSpan={2} className={`${cell} text-xs font-black uppercase text-slate-400`}>
                {t('productionOrders.workDaysTab.cols.actualHours')}
              </th>
              <th rowSpan={2} className={`${cell} text-xs font-black uppercase text-cyan-300`}>
                {t('productionOrders.workDaysTab.cols.entryProductivity')}
              </th>
              <th colSpan={2} className={`${cell} text-xs font-black uppercase text-amber-300`}>
                {t('productionOrders.workDaysTab.cols.totalStops')}
                <span className="mt-0.5 block text-[10px] font-normal normal-case text-amber-200/60">
                  {t('productionOrders.workDaysTab.stopsFromPage')}
                </span>
              </th>
              <th rowSpan={2} className={`${cell} text-xs font-black uppercase text-emerald-300`}>
                {t('productionOrders.workDaysTab.cols.exitProductivity')}
              </th>
            </tr>
            <tr>
              <th className={`${cell} text-[10px] font-black uppercase text-amber-200`}>
                {t('productionOrders.workDaysTab.cols.stopMinutes')}
              </th>
              <th className={`${cell} text-[10px] font-black uppercase text-amber-200`}>
                {t('productionOrders.workDaysTab.cols.stopCars')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((row, index) => (
              <tr key={row.workDate} className="bg-slate-900/30 hover:bg-slate-800/40">
                <td className={stickyCell}>
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                    <div className="whitespace-nowrap">
                      <span className="font-bold text-slate-200">{formatDayLabel(row.workDate, lang)}</span>
                      <span className="ms-2 font-mono text-xs text-slate-500" dir="ltr">
                        {row.workDate}
                      </span>
                    </div>
                    <select
                      disabled={!canManage}
                      className={`${inputCls()} min-w-[9rem] py-1.5 text-xs font-bold ${dayTypeBadgeClass(row.dayType)}`}
                      value={row.dayType}
                      onChange={e => patchRow(index, { dayType: e.target.value as PlanDayType })}
                    >
                      {PLAN_DAY_TYPES.map(type => (
                        <option key={type} value={type}>
                          {t(`productionOrders.workDaysTab.dayTypes.${type}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className={cell}>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    disabled={!canManage}
                    className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-center text-sm"
                    value={row.plannedHours || ''}
                    onChange={e => patchRow(index, { plannedHours: Number(e.target.value) || 0 })}
                    onBlur={e => flushSaveRow({ ...row, plannedHours: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className={cell}>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    disabled={!canManage}
                    className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-center text-sm"
                    value={row.actualHours || ''}
                    onChange={e => patchRow(index, { actualHours: Number(e.target.value) || 0 })}
                    onBlur={e => flushSaveRow({ ...row, actualHours: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className={`${cell} font-black text-cyan-300`}>{row.entryProductivity || '—'}</td>
                <td className={`${cell} font-black text-amber-300`}>{formatCount(row.stopMinutes)}</td>
                <td className={`${cell} font-black text-amber-300`}>{formatCount(row.stopLostVehicles)}</td>
                <td className={`${cell} font-black text-emerald-300`}>{row.exitProductivity || '—'}</td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr className="bg-slate-950/95 text-base font-black">
                <td className={`${stickyCell} text-white`}>{t('productionOrders.grandTotal')}</td>
                <td className={`${cell} text-cyan-200`}>{totals.plannedHours || '—'}</td>
                <td className={`${cell} text-slate-200`}>{totals.actualHours || '—'}</td>
                <td className={`${cell} text-cyan-300`}>{totals.entryProductivity || '—'}</td>
                <td className={`${cell} text-amber-300`}>{formatCount(totals.stopMinutes)}</td>
                <td className={`${cell} text-amber-300`}>{formatCount(totals.stopLostVehicles)}</td>
                <td className={`${cell} text-emerald-300`}>{totals.exitProductivity || '—'}</td>
              </tr>
            )}
          </tbody>
        </table>
        {loading && <p className="p-8 text-center text-slate-400">{t('common.loading')}</p>}
        {!loading && rows.length === 0 && (
          <p className="p-8 text-center text-slate-500">{t('common.noData')}</p>
        )}
      </div>
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
  value: string
  hint?: string
  tone?: 'violet' | 'cyan' | 'slate' | 'emerald' | 'amber'
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
            : 'text-white'

  return (
    <div className={`min-w-0 rounded-xl border px-3 py-2 ${borderCls}`}>
      <p className={`truncate text-xs font-bold ${labelCls}`}>{label}</p>
      <p className={`text-lg font-black ${valueCls}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-slate-500">{hint}</p>}
    </div>
  )
}
