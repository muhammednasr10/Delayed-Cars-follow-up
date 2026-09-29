import { useMemo } from 'react'
import { ClipboardList, Target } from 'lucide-react'
import type { ProductionPlanOrdersState } from '../../hooks/useProductionPlanOrders'
import { inputCls } from '../FormField'
import { formatTaktMinutes } from '../../Utils/productionLineRate'
import { TableExportButtons } from '../TableExportButtons'
import { ProductionPlanEntryModal } from './ProductionPlanEntryModal'
import { PlanFamilyCard } from './PlanFamilyCard'
import { PlanStatCard, MetricPill } from './PlanStatCards'
import type { TableExportColumn } from '../../Utils/tableExport'
import { buildPlanSummaryExportRows } from '../../Utils/planningExport'

type Props = {
  h: ProductionPlanOrdersState
}

export function ProductionPlanView({ h }: Props) {
  const { t, canManage } = h

  const planExportColumns = useMemo<TableExportColumn<ReturnType<typeof buildPlanSummaryExportRows>[number]>[]>(
    () => [
      { label: t('productionOrders.cols.model'), value: r => r.model },
      { label: t('productionOrders.plannedQty'), value: r => r.planned },
      { label: t('productionOrders.ordersQty'), value: r => r.ordersQty },
      { label: t('productionOrders.ordersGap'), value: r => r.gap },
      { label: t('productionOrders.achievedQty'), value: r => r.achieved },
      { label: t('productionOrders.progress'), value: r => r.progress }
    ],
    [t]
  )

  return (
    <div className="card-industrial p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{t('productionOrders.monthlyPlanSection')}</h3>
          </div>
        </div>
        {!h.loading && h.planExportRows.length > 0 && (
          <TableExportButtons
            filename={`plan-summary-${h.planMonthValue}`}
            title={t('planning.export.planTitle', { month: h.planMonthValue })}
            columns={planExportColumns}
            rows={h.planExportRows}
          />
        )}
      </div>

      {h.planSuccess && (
        <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {h.planSuccess}
        </div>
      )}
      {h.error && !h.formOpen && (
        <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {h.error}
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-violet-500/20 bg-slate-950/20 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h4 className="text-base font-black text-violet-200">{t('productionOrders.monthlyPlanSection')}</h4>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="month"
                  className={`${inputCls()} w-full py-2 text-sm sm:w-auto`}
                  value={h.planMonthValue}
                  onChange={e => {
                    const [y, m] = e.target.value.split('-').map(Number)
                    if (y && m) {
                      h.setPlanYear(y)
                      h.setPlanMonth(m)
                    }
                  }}
                  title={t('productionOrders.planMonth')}
                />
                {canManage && (
                  <button
                    type="button"
                    onClick={() => h.openPlanModal('monthly')}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 px-4 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-violet-500/20 hover:from-violet-400 hover:to-violet-500"
                  >
                    <ClipboardList className="h-4 w-4" />
                    {t('productionOrders.planEntry.openButton')}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <PlanStatCard label={t('productionOrders.plannedQty')} value={String(h.planTotals.planned || '—')} tone="cyan" />
              <PlanStatCard label={t('productionOrders.achievedQty')} value={String(h.planTotals.achieved || '—')} tone="emerald" />
              <PlanStatCard label={t('productionOrders.progress')} value={`${h.planProgress}%`} tone="violet" />
              {h.planTotals.wip > 0 && (
                <PlanStatCard label={t('productionOrders.wipCarryoverShort')} value={String(h.planTotals.wip)} tone="rose" />
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <MetricPill label={t('productionOrders.workDays.available')} value={h.availableDays > 0 ? String(h.availableDays) : '—'} tone="violet" />
              <MetricPill label={t('productionOrders.workDays.availableHours')} value={h.availableHours > 0 ? String(h.availableHours) : '—'} tone="cyan" />
              <MetricPill label={t('productionOrders.jph')} value={h.lineJph > 0 ? String(h.lineJph) : '—'} tone="cyan" />
              <MetricPill label={t('productionOrders.taktTime')} value={h.lineTaktMinutes != null ? formatTaktMinutes(h.lineTaktMinutes) : '—'} tone="amber" />
            </div>

            <div className="space-y-3">
              {h.planSections.map(section => (
                <PlanFamilyCard
                  key={section.group.key}
                  group={section.group}
                  scope="monthly"
                  isExpanded={h.expandedMonthlyFamilies.has(section.group.key)}
                  onToggle={() => h.toggleMonthlyFamily(section.group.key)}
                  t={t}
                />
              ))}
              {h.loading && <p className="py-8 text-center text-slate-400">{t('common.loading')}</p>}
              {!h.loading && h.planSections.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-500">{t('productivity.monthly.noModels')}</p>
              )}
            </div>
          </div>

      <ProductionPlanEntryModal
        open={h.planModalOpen}
        onClose={() => h.setPlanModalOpen(false)}
        entryMode={h.planEntryMode}
        monthLabel={h.planMonthValue}
        planYear={h.planYear}
        planMonth={h.planMonth}
        models={h.models}
        planTargets={h.planTargets}
        wipCarryover={h.wipCarryover}
        achievedByModelId={h.achievedByModelId}
        availableDays={h.availableDays}
        availableHours={h.availableHours}
        lineJph={h.lineJph}
        canManage={canManage}
        onSaved={() => void h.handlePlanSaved()}
      />
    </div>
  )
}
