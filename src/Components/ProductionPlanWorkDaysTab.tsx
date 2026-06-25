import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, RefreshCcw, Save } from 'lucide-react'
import { useAuth } from '../Context/AuthContext'
import { useLang } from '../i18n/LanguageContext'
import { inputCls } from '../Components/FormField'
import { PLAN_DAY_TYPES, type PlanDayType, type ProductionPlanWorkDayEdit } from '../Types/productionPlanWorkDayDaily'
import {
  availableDaysFromRows,
  buildMonthWorkDayRows,
  dayTypeBadgeClass,
  mergeProductivityIntoRows
} from '../Utils/productionPlanWorkDayDaily'
import {
  bulkUpsertProductionPlanWorkDays,
  getMonthProductivityTotals,
  getProductionPlanWorkDaysMonth
} from '../services/productionPlanWorkDayDailyService'

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

  const monthValue = `${year}-${String(month).padStart(2, '0')}`
  const availableDays = useMemo(() => availableDaysFromRows(rows), [rows])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const [saved, productivity] = await Promise.all([
        getProductionPlanWorkDaysMonth(year, month),
        getMonthProductivityTotals(year, month)
      ])
      const base = buildMonthWorkDayRows(year, month, saved)
      const merged = mergeProductivityIntoRows(base, productivity.entryByDate, productivity.exitByDate)
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

  function patchRow(index: number, patch: Partial<ProductionPlanWorkDayEdit>) {
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
    setSuccess('')
  }

  async function save() {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const payload = rows.map(({ workDate, dayType, plannedHours, actualHours, totalStops, notes }) => ({
        workDate,
        dayType,
        plannedHours,
        actualHours,
        totalStops,
        notes
      }))
      await bulkUpsertProductionPlanWorkDays(payload)
      onAvailableDaysChange?.(availableDaysFromRows(rows))
      setSuccess(t('productionOrders.workDaysTab.saved'))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const totals = useMemo(
    () => ({
      plannedHours: rows.reduce((sum, row) => sum + row.plannedHours, 0),
      actualHours: rows.reduce((sum, row) => sum + row.actualHours, 0),
      entryProductivity: rows.reduce((sum, row) => sum + row.entryProductivity, 0),
      totalStops: rows.reduce((sum, row) => sum + row.totalStops, 0),
      exitProductivity: rows.reduce((sum, row) => sum + row.exitProductivity, 0)
    }),
    [rows]
  )

  return (
    <div className="card-industrial p-5 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{t('productionOrders.workDaysTab.title')}</h3>
            <p className="text-sm text-slate-400">{t('productionOrders.workDaysTab.subtitle')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2">
            <span className="text-xs font-bold text-violet-200">{t('productionOrders.workDays.available')}:</span>
            <span className="text-lg font-black text-white">{availableDays}</span>
          </div>
          <input
            type="month"
            className={`${inputCls()} w-auto py-2 text-sm`}
            value={monthValue}
            onChange={e => {
              const [y, m] = e.target.value.split('-').map(Number)
              if (y && m) {
                setYear(y)
                setMonth(m)
              }
            }}
          />
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
          >
            <RefreshCcw className="mr-1 inline h-4 w-4" /> {t('common.refresh')}
          </button>
          {canManage && (
            <button
              type="button"
              disabled={saving || loading}
              onClick={() => void save()}
              className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
            >
              <Save className="mr-1 inline h-4 w-4" /> {saving ? t('common.saving') : t('common.save')}
            </button>
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
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-slate-950/90">
            <tr>
              <th className={`${stickyCell} text-xs font-black uppercase text-slate-400`}>
                {t('productionOrders.workDaysTab.cols.date')}
              </th>
              <th className={`${cell} text-xs font-black uppercase text-slate-400`}>
                {t('productionOrders.workDaysTab.cols.plannedHours')}
              </th>
              <th className={`${cell} text-xs font-black uppercase text-slate-400`}>
                {t('productionOrders.workDaysTab.cols.actualHours')}
              </th>
              <th className={`${cell} text-xs font-black uppercase text-cyan-300`}>
                {t('productionOrders.workDaysTab.cols.entryProductivity')}
              </th>
              <th className={`${cell} text-xs font-black uppercase text-amber-300`}>
                {t('productionOrders.workDaysTab.cols.totalStops')}
              </th>
              <th className={`${cell} text-xs font-black uppercase text-emerald-300`}>
                {t('productionOrders.workDaysTab.cols.exitProductivity')}
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
                  />
                </td>
                <td className={`${cell} font-black text-cyan-300`}>{row.entryProductivity || '—'}</td>
                <td className={cell}>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    disabled={!canManage}
                    className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-center text-sm text-amber-200"
                    value={row.totalStops || ''}
                    onChange={e => patchRow(index, { totalStops: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className={`${cell} font-black text-emerald-300`}>{row.exitProductivity || '—'}</td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr className="bg-slate-950/95 text-base font-black">
                <td className={`${stickyCell} text-white`}>{t('productionOrders.grandTotal')}</td>
                <td className={`${cell} text-cyan-200`}>{totals.plannedHours || '—'}</td>
                <td className={`${cell} text-slate-200`}>{totals.actualHours || '—'}</td>
                <td className={`${cell} text-cyan-300`}>{totals.entryProductivity || '—'}</td>
                <td className={`${cell} text-amber-300`}>{totals.totalStops || '—'}</td>
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
