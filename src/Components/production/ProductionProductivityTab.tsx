import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, LogIn, LogOut, Wrench } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useCanViewPage } from '../../hooks/useCanViewPage'
import { inputCls } from '../FormField'
import { ProductionPlanWorkDaysTab } from '../ProductionPlanWorkDaysTab'
import { ProductivityDailyEntryModal } from '../productivity/ProductivityDailyEntryModal'
import { ProductivityDailyStopsSummary } from '../productivity/ProductivityDailyStopsSummary'
import { getProductionLineStops } from '../../services/productionStopService'
import type { ProductionLineStop } from '../../Types/productionStop'
import type { ProductivityDelayKind } from '../../Types/productivityDelayReason'

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseYm(workDate: string): { year: number; month: number } {
  const [y, m] = workDate.split('-').map(Number)
  return { year: y, month: m }
}

export function ProductionProductivityTab() {
  const { t } = useLang()
  const { canViewTab, loading: permsLoading } = useCanViewPage()

  const [workDate, setWorkDate] = useState(todayIso)
  const [stops, setStops] = useState<ProductionLineStop[]>([])
  const [stopsLoading, setStopsLoading] = useState(false)
  const [modalKind, setModalKind] = useState<ProductivityDelayKind | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const { year, month } = useMemo(() => parseYm(workDate), [workDate])
  const canRegisterEntry = permsLoading || canViewTab('production_productivity', 'entry')
  const canRegisterExit = permsLoading || canViewTab('production_productivity', 'exit')
  const canRegisterRepair = permsLoading || canViewTab('production_productivity', 'repair')

  const loadStops = useCallback(async () => {
    setStopsLoading(true)
    try {
      setStops(await getProductionLineStops(year, month))
    } catch {
      setStops([])
    } finally {
      setStopsLoading(false)
    }
  }, [year, month, refreshKey])

  useEffect(() => {
    void loadStops()
  }, [loadStops])

  return (
    <div className="space-y-6">
      <div className="card-industrial flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <label className="flex min-w-[10rem] flex-col gap-1.5">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
            <CalendarDays className="h-4 w-4 text-cyan-400" />
            {t('productivity.selectDate')}
          </span>
          <input type="date" className={inputCls()} value={workDate} onChange={e => setWorkDate(e.target.value)} />
        </label>

        {(canRegisterEntry || canRegisterExit || canRegisterRepair) && (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {canRegisterEntry && (
              <button
                type="button"
                onClick={() => setModalKind('entry')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-emerald-900/25 transition hover:bg-emerald-400 active:scale-[0.98] sm:min-w-[12rem]"
              >
                <LogIn className="h-5 w-5 shrink-0" />
                {t('productivity.registerEntry')}
              </button>
            )}
            {canRegisterExit && (
              <button
                type="button"
                onClick={() => setModalKind('exit')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-violet-900/25 transition hover:bg-violet-400 active:scale-[0.98] sm:min-w-[12rem]"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                {t('productivity.registerExit')}
              </button>
            )}
            {canRegisterRepair && (
              <button
                type="button"
                onClick={() => setModalKind('repair')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-orange-900/25 transition hover:bg-orange-400 active:scale-[0.98] sm:min-w-[12rem]"
              >
                <Wrench className="h-5 w-5 shrink-0" />
                {t('productivity.registerRepair')}
              </button>
            )}
          </div>
        )}
      </div>

      {stopsLoading ? (
        <p className="text-sm text-slate-400">{t('common.loading')}</p>
      ) : (
        <ProductivityDailyStopsSummary workDate={workDate} stops={stops} />
      )}

      <ProductionPlanWorkDaysTab key={refreshKey} variant="summary" />

      {modalKind && (
        <ProductivityDailyEntryModal
          open
          kind={modalKind}
          workDate={workDate}
          onClose={() => setModalKind(null)}
          onSaved={() => setRefreshKey(k => k + 1)}
        />
      )}
    </div>
  )
}
