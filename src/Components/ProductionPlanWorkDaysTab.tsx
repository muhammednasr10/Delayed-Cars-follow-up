import { useMemo } from 'react'
import { CalendarDays } from 'lucide-react'
import { useWorkDaysData } from '../hooks/useWorkDaysData'
import { inputCls } from './FormField'
import { ProductivitySummaryCards } from './productivity/ProductivitySummaryCards'
import { TableExportButtons } from './TableExportButtons'
import { SummaryPill } from './production/PlanStatCards'
import { WorkDaysMonthTable } from './production/WorkDaysMonthTable'
import { buildWorkDaysExportRows } from '../Utils/planningExport'
import type { TableExportColumn } from '../Utils/tableExport'

type Props = {
  onAvailableDaysChange?: (count: number) => void
  variant?: 'workDays' | 'summary'
}

export function ProductionPlanWorkDaysTab({ onAvailableDaysChange, variant = 'summary' }: Props) {
  const h = useWorkDaysData(onAvailableDaysChange, variant)
  const { t, isWorkDaysOnly, canEditRows } = h

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
              {canEditRows && h.saving && <p className="mt-1 text-xs font-bold text-cyan-300">{t('common.saving')}</p>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="month"
              className={`${inputCls()} w-full py-2 text-sm sm:w-auto`}
              value={h.monthValue}
              onChange={e => {
                const [y, m] = e.target.value.split('-').map(Number)
                if (y && m) {
                  h.setYear(y)
                  h.setMonth(m)
                }
              }}
            />
            {isWorkDaysOnly && !h.loading && h.workDaysExportRows.length > 0 && (
              <TableExportButtons
                filename={`planning-work-days-${h.monthValue}`}
                title={t('planning.export.workDaysTitle', { month: h.monthValue })}
                columns={workDaysExportColumns}
                rows={h.workDaysExportRows}
              />
            )}
          </div>
        </div>

        {isWorkDaysOnly ? (
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <SummaryPill label={t('productionOrders.workDays.available')} value={String(h.availableDays)} tone="violet" />
          <SummaryPill label={t('productionOrders.workDaysTab.summary.plannedHours')} value={h.totals.plannedHours ? String(h.totals.plannedHours) : '—'} tone="cyan" />
          <SummaryPill label={t('productionOrders.workDaysTab.summary.actualHours')} value={h.totals.actualHours ? String(h.totals.actualHours) : '—'} tone="slate" />
          </div>
        ) : (
          <ProductivitySummaryCards
            availableDays={h.availableDays}
            actualDays={h.totals.elapsedDays}
            plannedHours={h.totals.plannedHours}
            actualHours={h.totals.elapsedHours}
            stopLostVehicles={h.totals.stopLostVehicles}
            stopMinutes={h.totals.stopMinutes}
            entryProductivity={h.totals.entryProductivity}
            exitProductivity={h.totals.exitProductivity}
            assemblyDeficit={h.totals.assemblyDeficit}
            repairProductivity={h.totals.repairProductivity}
            monthBreakdown={h.monthBreakdown}
          />
        )}
      </div>

      {h.success && (
        <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {h.success}
        </div>
      )}
      {h.error && (
        <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{h.error}</div>
      )}

      <WorkDaysMonthTable data={h} />
    </div>
  )
}
