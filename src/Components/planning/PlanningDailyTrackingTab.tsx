import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, CalendarRange } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { inputCls } from '../FormField'
import { CompletionBar } from '../VehicleBadges'
import { TableExportButtons } from '../TableExportButtons'
import { getModelPlanTargets } from '../../services/modelProductionPlanService'
import {
  getMonthProductivityDetail,
  getProductionPlanWorkDaysMonth
} from '../../services/productionPlanWorkDayDailyService'
import { getVehicleModels } from '../../services/settingsService'
import { buildMonthWorkDayRows, dayTypeBadgeClass } from '../../Utils/productionPlanWorkDayDaily'
import { buildPlanSections, sumPlanSectionsPlanned } from '../../Utils/productionPlanSummary'
import {
  buildDailyTrackingRows,
  localTodayIso,
  sumThrough,
  weekDatesContaining,
  type DailyTrackingRow
} from '../../Utils/planningDailyTracking'
import { buildDailyTrackingExportRows, formatExportSigned } from '../../Utils/planningExport'
import type { TableExportColumn } from '../../Utils/tableExport'

const cell = 'table-cell text-center align-middle'

type RangeMode = 'week' | 'month'

function currentYm(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function formatDayLabel(workDate: string, lang: string): string {
  const d = new Date(workDate + 'T12:00:00')
  const weekday = d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short' })
  return `${weekday} ${d.getDate()}`
}

function formatSigned(n: number): string {
  if (n === 0) return '0'
  return n > 0 ? `+${n}` : String(n)
}

function deficitTone(n: number): string {
  if (n > 0) return 'text-red-300'
  if (n < 0) return 'text-emerald-300'
  return 'text-slate-300'
}

export function PlanningDailyTrackingTab() {
  const { t, lang } = useLang()
  const init = currentYm()
  const today = localTodayIso()

  const [year, setYear] = useState(init.year)
  const [month, setMonth] = useState(init.month)
  const [rangeMode, setRangeMode] = useState<RangeMode>('week')
  const [monthlyPlan, setMonthlyPlan] = useState(0)
  const [rows, setRows] = useState<DailyTrackingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const monthValue = `${year}-${String(month).padStart(2, '0')}`

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [models, targets, savedDays, productivity] = await Promise.all([
        getVehicleModels(),
        getModelPlanTargets(year, month).catch(() => []),
        getProductionPlanWorkDaysMonth(year, month),
        getMonthProductivityDetail(year, month)
      ])

      const planMap = new Map(targets.map(r => [r.modelId, r.targetQty]))
      const sections = buildPlanSections(models, planMap, new Map())
      const planTotal = sumPlanSectionsPlanned(sections)
      setMonthlyPlan(planTotal)

      const base = buildMonthWorkDayRows(year, month, savedDays)
      const tracking = buildDailyTrackingRows(
        base,
        planTotal,
        productivity.entryByDate,
        productivity.exitByDate,
        today
      )
      setRows(tracking)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
      setRows([])
      setMonthlyPlan(0)
    } finally {
      setLoading(false)
    }
  }, [year, month, t, today])

  useEffect(() => {
    void load()
  }, [load])

  const mtd = useMemo(() => sumThrough(rows, today), [rows, today])

  const todayRow = useMemo(() => rows.find(r => r.workDate === today) ?? null, [rows, today])

  const displayRows = useMemo(() => {
    if (rangeMode === 'month') return rows
    const weekSet = new Set(weekDatesContaining(today))
    return rows.filter(r => weekSet.has(r.workDate))
  }, [rangeMode, rows, today])

  const todayProgress =
    todayRow && todayRow.planned > 0
      ? Math.min(100, Math.round((todayRow.exit / todayRow.planned) * 100))
      : todayRow && todayRow.exit > 0
        ? 100
        : 0

  const trackingExportColumns = useMemo<TableExportColumn<ReturnType<typeof buildDailyTrackingExportRows>[number]>[]>(
    () => [
      { label: t('planning.tracking.cols.date'), value: r => r.date },
      { label: t('planning.tracking.cols.dayType'), value: r => r.dayType },
      { label: t('planning.tracking.cols.plan'), value: r => r.plan },
      { label: t('planning.tracking.cols.entry'), value: r => r.entry },
      { label: t('planning.tracking.cols.exit'), value: r => r.exit },
      { label: t('planning.tracking.cols.dayDeficit'), value: r => r.dayDeficit },
      { label: t('planning.tracking.cols.cumulative'), value: r => r.cumulative }
    ],
    [t]
  )

  const trackingExportRows = useMemo(() => {
    const base = buildDailyTrackingExportRows(
      displayRows,
      today,
      d => formatDayLabel(d, lang),
      dayType => t(`productionOrders.workDaysTab.dayTypes.${dayType}`)
    )
    if (base.length === 0) return base
    return [
      ...base,
      {
        date: t('planning.tracking.mtdTotal'),
        dayType: '',
        plan: mtd.planned ? String(mtd.planned) : '',
        entry: mtd.entry ? String(mtd.entry) : '',
        exit: mtd.exit ? String(mtd.exit) : '',
        dayDeficit: formatExportSigned(mtd.deficit),
        cumulative: formatExportSigned(mtd.deficit)
      }
    ]
  }, [displayRows, today, lang, t, mtd])

  return (
    <div className="space-y-4">
      <div className="card-industrial p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{t('planning.tracking.title')}</h3>
              <p className="text-sm text-slate-400">{t('planning.tracking.subtitle')}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-slate-700 bg-slate-950/60 p-1">
              <button
                type="button"
                onClick={() => setRangeMode('week')}
                className={`rounded-lg px-3 py-1.5 text-xs font-black ${
                  rangeMode === 'week' ? 'bg-violet-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('planning.tracking.week')}
              </button>
              <button
                type="button"
                onClick={() => setRangeMode('month')}
                className={`rounded-lg px-3 py-1.5 text-xs font-black ${
                  rangeMode === 'month' ? 'bg-violet-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('planning.tracking.month')}
              </button>
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
            {!loading && trackingExportRows.length > 0 && (
              <TableExportButtons
                filename={`planning-tracking-${monthValue}`}
                title={t('planning.export.trackingTitle', { month: monthValue })}
                columns={trackingExportColumns}
                rows={trackingExportRows}
              />
            )}
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard
            label={t('planning.tracking.monthlyPlan')}
            value={loading ? '…' : String(monthlyPlan || '—')}
            tone="violet"
          />
          <StatCard
            label={t('planning.tracking.todayPlan')}
            value={loading ? '…' : todayRow ? String(todayRow.planned || '—') : '—'}
            tone="cyan"
          />
          <StatCard
            label={t('planning.tracking.todayEntry')}
            value={loading ? '…' : todayRow ? String(todayRow.entry || '—') : '—'}
            tone="emerald"
          />
          <StatCard
            label={t('planning.tracking.todayExit')}
            value={loading ? '…' : todayRow ? String(todayRow.exit || '—') : '—'}
            tone="emerald"
          />
          <StatCard
            label={t('planning.tracking.mtdDeficit')}
            value={loading ? '…' : formatSigned(mtd.deficit)}
            tone={mtd.deficit > 0 ? 'red' : mtd.deficit < 0 ? 'emerald' : 'slate'}
            hint={t('planning.tracking.deficitHint')}
          />
        </div>

        {todayRow && (
          <div className="mb-4 rounded-xl border border-violet-500/25 bg-violet-500/10 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-black text-violet-100">
                {t('planning.tracking.todayProgress')} · {formatDayLabel(today, lang)}
              </p>
              <p className="text-sm font-black text-violet-200">{todayProgress}%</p>
            </div>
            <CompletionBar percent={todayProgress} />
            <p className="mt-2 text-xs text-slate-400">
              {t('planning.tracking.todayLine', {
                plan: todayRow.planned,
                entry: todayRow.entry,
                exit: todayRow.exit,
                deficit: formatSigned(todayRow.dayDeficit)
              })}
            </p>
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-950/90">
              <tr>
                <th className={`${cell} text-xs font-black uppercase text-slate-400`}>
                  {t('planning.tracking.cols.date')}
                </th>
                <th className={`${cell} text-xs font-black uppercase text-slate-400`}>
                  {t('planning.tracking.cols.dayType')}
                </th>
                <th className={`${cell} text-xs font-black uppercase text-cyan-300`}>
                  {t('planning.tracking.cols.plan')}
                </th>
                <th className={`${cell} text-xs font-black uppercase text-emerald-300`}>
                  {t('planning.tracking.cols.entry')}
                </th>
                <th className={`${cell} text-xs font-black uppercase text-emerald-300`}>
                  {t('planning.tracking.cols.exit')}
                </th>
                <th className={`${cell} text-xs font-black uppercase text-amber-300`}>
                  {t('planning.tracking.cols.dayDeficit')}
                </th>
                <th className={`${cell} text-xs font-black uppercase text-red-300`}>
                  {t('planning.tracking.cols.cumulative')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {displayRows.map(row => {
                const isToday = row.workDate === today
                const isFuture = row.workDate > today
                return (
                  <tr
                    key={row.workDate}
                    className={
                      isToday
                        ? 'bg-violet-500/15'
                        : isFuture
                          ? 'bg-slate-950/40 text-slate-500'
                          : 'hover:bg-slate-800/30'
                    }
                  >
                    <td className={`${cell} font-bold text-white`}>
                      <span className="inline-flex items-center gap-1.5">
                        {isToday && <CalendarRange className="h-3.5 w-3.5 text-violet-300" />}
                        {formatDayLabel(row.workDate, lang)}
                      </span>
                    </td>
                    <td className={cell}>
                      <span
                        className={`inline-block rounded-lg px-2 py-0.5 text-[11px] font-bold ${dayTypeBadgeClass(row.dayType)}`}
                      >
                        {t(`productionOrders.workDaysTab.dayTypes.${row.dayType}`)}
                      </span>
                    </td>
                    <td className={`${cell} font-black text-cyan-300`}>
                      {row.isWorkingDay ? row.planned || '—' : '—'}
                    </td>
                    <td className={`${cell} font-black text-emerald-300`}>
                      {row.entry || '—'}
                    </td>
                    <td className={`${cell} font-black text-emerald-300`}>
                      {row.exit || '—'}
                    </td>
                    <td className={`${cell} font-black ${isFuture ? 'text-slate-600' : deficitTone(row.dayDeficit)}`}>
                      {row.isWorkingDay && !isFuture ? formatSigned(row.dayDeficit) : '—'}
                    </td>
                    <td className={`${cell} font-black ${isFuture ? 'text-slate-600' : deficitTone(row.cumulativeDeficit)}`}>
                      {!isFuture && row.workDate <= today ? formatSigned(row.cumulativeDeficit) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {!loading && displayRows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-950/95 text-base font-black">
                  <td className={`${cell} text-white`} colSpan={2}>
                    {t('planning.tracking.mtdTotal')}
                  </td>
                  <td className={`${cell} text-cyan-300`}>{mtd.planned || '—'}</td>
                  <td className={`${cell} text-emerald-300`}>{mtd.entry || '—'}</td>
                  <td className={`${cell} text-emerald-300`}>{mtd.exit || '—'}</td>
                  <td className={`${cell} ${deficitTone(mtd.deficit)}`}>{formatSigned(mtd.deficit)}</td>
                  <td className={`${cell} ${deficitTone(mtd.deficit)}`}>{formatSigned(mtd.deficit)}</td>
                </tr>
              </tfoot>
            )}
          </table>
          {loading && <p className="p-8 text-center text-slate-400">{t('common.loading')}</p>}
          {!loading && displayRows.length === 0 && (
            <p className="p-8 text-center text-slate-500">{t('common.noData')}</p>
          )}
        </div>

        <p className="mt-3 text-xs text-slate-500">{t('planning.tracking.footerHint')}</p>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  tone,
  hint
}: {
  label: string
  value: string
  tone: 'violet' | 'cyan' | 'emerald' | 'red' | 'slate'
  hint?: string
}) {
  const border =
    tone === 'violet'
      ? 'border-violet-500/30 bg-violet-500/10'
      : tone === 'cyan'
        ? 'border-cyan-500/30 bg-cyan-500/10'
        : tone === 'emerald'
          ? 'border-emerald-500/30 bg-emerald-500/10'
          : tone === 'red'
            ? 'border-red-500/30 bg-red-500/10'
            : 'border-slate-600/40 bg-slate-800/40'
  const valueCls =
    tone === 'violet'
      ? 'text-violet-200'
      : tone === 'cyan'
        ? 'text-cyan-300'
        : tone === 'emerald'
          ? 'text-emerald-300'
          : tone === 'red'
            ? 'text-red-300'
            : 'text-slate-200'

  return (
    <div className={`rounded-xl border px-3 py-3 ${border}`} title={hint}>
      <p className="text-[11px] font-bold text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-black tabular-nums ${valueCls}`}>{value}</p>
    </div>
  )
}
