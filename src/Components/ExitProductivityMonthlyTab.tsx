import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useAuth } from '../Context/AuthContext'
import { useVehicles } from '../Context/VehiclesContext'
import { useLang } from '../i18n/LanguageContext'
import { inputCls } from '../Components/FormField'
import {
  buildExitMonthGrid,
  buildModelColumns,
  bulkUpsertExitProductivity,
  exitGridToInputs,
  getExitProductivityMonth,
  listDatesInMonth,
  productivityModelRows,
  sumVariantForMonth,
  tallyDeliveredByFamilyDay,
  type ModelColumn
} from '../services/exitProductivityService'
import { getVehicleModels } from '../services/settingsService'
import { ProductivityDelayReasonCell } from './productivity/ProductivityDelayReasonCell'
import { useProductivityDelayReasons } from '../hooks/useProductivityDelayReasons'

const cell = 'table-cell text-center align-middle'
const stickyCell = `${cell} sticky start-0 z-10 bg-slate-900`
const stickyHead = `${cell} sticky start-0 z-20 bg-slate-950`

function currentYm(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function columnKey(col: ModelColumn): string {
  return `family:${col.familyId}`
}

export function ExitProductivityMonthlyTab() {
  const { t } = useLang()
  const { hasRole } = useAuth()
  const { vehicles } = useVehicles()
  const canManage = hasRole('admin', 'production')

  const init = currentYm()
  const [year, setYear] = useState(init.year)
  const [month, setMonth] = useState(init.month)
  const [models, setModels] = useState<Awaited<ReturnType<typeof getVehicleModels>>>([])
  const [grid, setGrid] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const monthValue = `${year}-${String(month).padStart(2, '0')}`
  const dates = useMemo(() => listDatesInMonth(year, month), [year, month])
  const modelRows = useMemo(() => productivityModelRows(models), [models])
  const columns = useMemo(() => buildModelColumns(models), [models])
  const { reasonsByDate, setReason, flushSave } = useProductivityDelayReasons('exit', year, month, canManage)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const [modelList, records] = await Promise.all([getVehicleModels(), getExitProductivityMonth(year, month)])
      setModels(modelList)
      setGrid(buildExitMonthGrid(modelList, year, month, records))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [year, month, t])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const persistGrid = useCallback(
    async (gridToSave: Map<string, number>) => {
      if (!canManage) return
      setSaving(true)
      setError('')
      try {
        await bulkUpsertExitProductivity(exitGridToInputs(models, year, month, gridToSave))
        setSuccess(t('common.saved'))
        window.setTimeout(() => setSuccess(''), 2000)
      } catch (e) {
        setError(e instanceof Error ? e.message : t('common.error'))
      } finally {
        setSaving(false)
      }
    },
    [canManage, models, year, month, t]
  )

  function scheduleSave(nextGrid: Map<string, number>) {
    if (!canManage) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      void persistGrid(nextGrid)
    }, 600)
  }

  function setCell(modelId: string, workDate: string, quantity: number) {
    setGrid(prev => {
      const next = new Map(prev)
      next.set(`${modelId}|${workDate}`, Math.max(0, quantity))
      scheduleSave(next)
      return next
    })
  }

  function syncFromDaily() {
    const tallies = tallyDeliveredByFamilyDay(vehicles, models, year, month)
    setGrid(prev => {
      const next = new Map(prev)
      for (const model of modelRows) {
        for (const workDate of dates) {
          const key = `${model.id}|${workDate}`
          const count = tallies.get(key)
          if (count !== undefined) next.set(key, count)
        }
      }
      scheduleSave(next)
      return next
    })
    setSuccess(t('productivity.exitMonthly.syncedFromDaily'))
  }

  function dayRowTotal(workDate: string): number {
    return modelRows.reduce((sum, model) => sum + (grid.get(`${model.id}|${workDate}`) ?? 0), 0)
  }

  function columnMonthTotal(col: ModelColumn): number {
    return sumVariantForMonth(grid, col.familyId, dates)
  }

  const monthGrandTotal = useMemo(() => {
    return dates.reduce((sum, workDate) => sum + dayRowTotal(workDate), 0)
  }, [dates, grid, modelRows])

  function renderColumnValue(col: ModelColumn, workDate: string) {
    const value = grid.get(`${col.familyId}|${workDate}`) ?? 0
    if (canManage) {
      return (
        <input
          type="number"
          min={0}
          className="w-12 rounded-lg border border-slate-700 bg-slate-950 px-1 py-1 text-center text-sm font-bold text-white"
          value={value || ''}
          onChange={e => setCell(col.familyId, workDate, Number(e.target.value) || 0)}
        />
      )
    }
    return <span className="font-bold text-slate-200">{value || '—'}</span>
  }

  return (
    <section className="space-y-4">
      <div className="card-industrial p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-500/15 p-3 text-emerald-300">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">{t('productivity.exitMonthly.title')}</h2>
              <p className="text-sm text-slate-400">{t('productivity.exitMonthly.subtitle')}</p>
              {saving && <p className="mt-1 text-xs font-bold text-emerald-300">{t('common.saving')}</p>}
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-400">{t('productivity.exitMonthly.month')}</span>
              <input
                type="month"
                className={inputCls()}
                value={monthValue}
                onChange={e => {
                  const [y, m] = e.target.value.split('-').map(Number)
                  if (y && m) {
                    setYear(y)
                    setMonth(m)
                  }
                }}
              />
            </label>
            {canManage && (
              <button
                type="button"
                onClick={syncFromDaily}
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-200 hover:bg-emerald-500/20"
              >
                {t('productivity.exitMonthly.syncFromDaily')}
              </button>
            )}
          </div>
        </div>

        {success && <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>}
        {error && <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
        <p className="text-xs text-slate-500">{t('productivity.exitMonthly.hint')}</p>
      </div>

      <div className="card-industrial overflow-x-auto">
        <table className="w-full min-w-[1080px] text-sm">
          <thead className="bg-slate-950/90">
            <tr>
              <th className={`${stickyHead} min-w-[72px] text-xs font-black uppercase text-emerald-300`}>
                {t('productivity.exitMonthly.total')}
              </th>
              <th className={`${stickyHead} start-[72px] min-w-[72px] border-s border-slate-800 text-xs font-black uppercase text-slate-400`}>
                {t('productivity.exitMonthly.date')}
              </th>
              {columns.map(col => (
                <th key={columnKey(col)} className={`${cell} min-w-[56px] text-xs font-black text-emerald-200`}>
                  {col.label}
                </th>
              ))}
              <th className={`${cell} min-w-[11rem] text-xs font-black uppercase text-amber-200`}>
                {t('productivity.monthly.delayReasons')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {dates.map(workDate => {
              const rowTotal = dayRowTotal(workDate)
              return (
                <tr key={workDate} className="bg-slate-900/30 hover:bg-slate-800/40">
                  <td className={`${stickyCell} font-black text-emerald-300`}>{rowTotal || '—'}</td>
                  <td className={`${stickyCell} start-[72px] border-s border-slate-800 font-mono font-bold text-slate-200`}>
                    {workDate.slice(8)}
                  </td>
                  {columns.map(col => (
                    <td key={`${workDate}-${columnKey(col)}`} className={cell}>
                      {renderColumnValue(col, workDate)}
                    </td>
                  ))}
                  <td className={`${cell} align-top`}>
                    <ProductivityDelayReasonCell
                      value={reasonsByDate.get(workDate) ?? ''}
                      canManage={canManage}
                      placeholder={t('productivity.monthly.delayReasonsPlaceholder')}
                      onChange={value => setReason(workDate, value)}
                      onBlur={() => flushSave(workDate)}
                    />
                  </td>
                </tr>
              )
            })}
            <tr className="bg-slate-950/80 font-black">
              <td className={`${stickyCell} text-emerald-300`}>{monthGrandTotal || '—'}</td>
              <td className={`${stickyCell} start-[72px] border-s border-slate-800 text-slate-300`}>
                {t('productivity.exitMonthly.total')}
              </td>
              {columns.map(col => (
                <td key={`total-${columnKey(col)}`} className={`${cell} text-emerald-300`}>
                  {columnMonthTotal(col) || '—'}
                </td>
              ))}
              <td className={cell} />
            </tr>
          </tbody>
        </table>

        {loading && <p className="p-8 text-center text-slate-400">{t('common.loading')}</p>}
        {!loading && modelRows.length === 0 && (
          <p className="p-8 text-center text-slate-500">{t('productivity.exitMonthly.noModels')}</p>
        )}
      </div>
    </section>
  )
}
