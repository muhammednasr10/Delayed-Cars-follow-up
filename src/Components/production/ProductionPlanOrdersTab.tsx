import { useMemo } from 'react'
import { ChevronRight, ClipboardList, Pencil, PlusCircle, Target, Trash2 } from 'lucide-react'
import { useProductionPlanOrders } from '../../hooks/useProductionPlanOrders'
import { Field, inputCls } from '../FormField'
import { ConfirmDialog } from '../ConfirmDialog'
import { VehicleModelFamilyPicker, resolveFamilyIdForVariant } from '../VehicleModelFamilyPicker'
import { formatTaktMinutes } from '../../Utils/productionLineRate'
import { sumPlanSectionsAchieved } from '../../Utils/productionPlanSummary'
import type { PlanEntryMode } from './ProductionPlanEntryModal'
import { TableExportButtons } from '../TableExportButtons'
import { ProductionPlanEntryModal } from './ProductionPlanEntryModal'
import { PlanFamilyCard } from './PlanFamilyCard'
import { PlanStatCard, MetricPill } from './PlanStatCards'
import type { TableExportColumn } from '../../Utils/tableExport'
import { buildOrdersExportRows, buildPlanSummaryExportRows } from '../../Utils/planningExport'

const cell = 'table-cell text-center align-middle'

type Props = {
  view: 'plan' | 'orders'
  planScope?: 'monthly' | 'annual' | 'both'
  onBack?: () => void
}

export function ProductionPlanOrdersTab({ view, planScope = 'both', onBack }: Props) {
  const h = useProductionPlanOrders(view)
  const { t, canManage } = h

  const showMonthly = planScope === 'both' || planScope === 'monthly'
  const showAnnual = planScope === 'both' || planScope === 'annual'

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

  const ordersExportColumns = useMemo<TableExportColumn<ReturnType<typeof buildOrdersExportRows>[number]>[]>(
    () => [
      { label: t('productionOrders.cols.orderNumber'), value: r => r.orderNumber },
      { label: t('productionOrders.cols.model'), value: r => r.model },
      { label: t('productionOrders.cols.chassisStart'), value: r => r.chassisStart },
      { label: t('productionOrders.cols.chassisEnd'), value: r => r.chassisEnd },
      { label: t('productionOrders.cols.carCount'), value: r => r.carCount },
      { label: t('productionOrders.cols.assemblyEntry'), value: r => r.assemblyEntry }
    ],
    [t]
  )

  return (
    <section className="space-y-6">
      {view === 'plan' && (
        <div className="card-industrial p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="mt-1 rounded-xl border border-slate-700 bg-slate-800/80 p-2 text-slate-300 hover:bg-slate-700"
                  title={t('productionOrders.planHub.backToHub')}
                >
                  <ChevronRight className="h-5 w-5 rtl:rotate-180" />
                </button>
              )}
              <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  {planScope === 'monthly'
                    ? t('productionOrders.monthlyPlanSection')
                    : planScope === 'annual'
                      ? t('productionOrders.annualPlanSection')
                      : t('productionOrders.planSummary')}
                </h3>
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

          <div className={`grid grid-cols-1 gap-6 ${showMonthly && showAnnual ? 'xl:grid-cols-2 xl:items-start' : ''}`}>
            {showMonthly && (
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
                  <PlanStatCard label={t('productionOrders.wipCarryoverShort')} value={String(h.planTotals.wip || '—')} tone="rose" />
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
            )}

            {showAnnual && (
              <div className="space-y-4 rounded-2xl border border-cyan-500/20 bg-slate-950/20 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-base font-black text-cyan-200">{t('productionOrders.annualPlanSection')}</h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-black text-cyan-200" dir="ltr">
                      {h.planYear}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-cyan-200/80">{t('productionOrders.planHub.annualFromMonthlyHint')}</p>

                <PlanStatCard label={t('productionOrders.annualPlan')} value={String(h.planTotals.annual || '—')} tone="cyan" wide />
                <PlanStatCard label={t('productionOrders.achievedQty')} value={String(sumPlanSectionsAchieved(h.annualSections) || '—')} tone="emerald" wide />
                <PlanStatCard label={t('productionOrders.progress')} value={`${h.annualProgress}%`} tone="violet" wide />

                <div className="space-y-3">
                  {h.annualSections.map(section => (
                    <PlanFamilyCard
                      key={section.group.key}
                      group={section.group}
                      scope="annual"
                      isExpanded={h.expandedAnnualFamilies.has(section.group.key)}
                      onToggle={() => h.toggleAnnualFamily(section.group.key)}
                      t={t}
                    />
                  ))}
                  {h.loading && <p className="py-8 text-center text-slate-400">{t('common.loading')}</p>}
                  {!h.loading && h.annualSections.length === 0 && (
                    <p className="py-6 text-center text-sm text-slate-500">{t('productivity.monthly.noModels')}</p>
                  )}
                </div>
              </div>
            )}
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
      )}

      {view === 'orders' && (
        <div className="card-industrial p-5 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">{t('productionOrders.ordersSectionHint')}</p>
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
              {!h.loading && h.ordersExportRows.length > 0 && (
                <TableExportButtons
                  filename={`production-orders-${h.planMonthValue}`}
                  title={t('planning.export.ordersTitle', { month: h.planMonthValue })}
                  columns={ordersExportColumns}
                  rows={h.ordersExportRows}
                />
              )}
            </div>
          </div>

          {h.error && !h.formOpen && (
            <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {h.error}
            </div>
          )}

          {canManage && !h.formOpen && (
            <button
              type="button"
              onClick={h.openCreateOrder}
              className="mb-5 flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-violet-500/50 bg-gradient-to-br from-violet-500/20 via-violet-500/10 to-slate-900/40 px-6 py-8 text-center transition hover:border-violet-400 hover:from-violet-500/30"
            >
              <div className="rounded-2xl bg-violet-500 p-3 text-slate-950">
                <PlusCircle className="h-8 w-8" />
              </div>
              <div className="text-start">
                <p className="text-lg font-black text-white">{t('productionOrders.addCta')}</p>
                <p className="mt-1 text-sm text-violet-100/80">{t('productionOrders.addCtaHint')}</p>
              </div>
            </button>
          )}

          {canManage && h.formOpen && (
            <div className="mb-5 space-y-4 rounded-2xl border border-violet-500/40 bg-slate-900/50 p-5">
              <h4 className="text-sm font-black text-violet-200">
                {h.editingOrder ? t('productionOrders.editTitle') : t('productionOrders.formTitle')}
              </h4>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Field label={t('productionOrders.cols.orderNumber')} required>
                  <input
                    className={inputCls()}
                    dir="ltr"
                    value={h.orderNumber}
                    onChange={e => h.setOrderNumber(e.target.value)}
                    placeholder="PO-2026-001"
                  />
                </Field>

                <Field label={t('productionOrders.cols.carCount')}>
                  <input className={`${inputCls()} font-black text-cyan-300`} readOnly value={h.carCount ?? '—'} />
                </Field>
              </div>

              <VehicleModelFamilyPicker
                models={h.models}
                familyId={h.familyId}
                variantId={h.modelId}
                loading={h.listsLoading}
                onFamilyChange={h.setFamilyId}
                onVariantChange={id => {
                  h.setModelId(id)
                  const fam = resolveFamilyIdForVariant(h.models, id)
                  if (fam) h.setFamilyId(fam)
                }}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t('productionOrders.cols.chassisStart')} required>
                  <input
                    className={`${inputCls()} font-mono`}
                    dir="ltr"
                    value={h.chassisStart}
                    onChange={e => h.setChassisStart(e.target.value)}
                  />
                </Field>
                <Field label={t('productionOrders.cols.chassisEnd')} required>
                  <input
                    className={`${inputCls()} font-mono`}
                    dir="ltr"
                    value={h.chassisEnd}
                    onChange={e => h.setChassisEnd(e.target.value)}
                  />
                </Field>
              </div>

              {h.error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {h.error}
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    h.setFormOpen(false)
                    h.resetForm()
                  }}
                  className="rounded-xl bg-slate-800 px-5 py-3 font-bold text-slate-200"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  disabled={h.submitting}
                  onClick={() => void h.submit()}
                  className="rounded-xl bg-violet-500 px-8 py-3 font-black text-slate-950 disabled:opacity-50"
                >
                  {h.submitting ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-950/90">
                <tr>
                  <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.cols.orderNumber')}</th>
                  <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.cols.model')}</th>
                  <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.cols.chassisStart')}</th>
                  <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.cols.chassisEnd')}</th>
                  <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.cols.carCount')}</th>
                  <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.cols.assemblyEntry')}</th>
                  {canManage && <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('common.actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {h.orders.map(row => (
                  <tr key={row.id} className="hover:bg-slate-800/30">
                    <td className={`${cell} font-mono font-bold text-white`} dir="ltr">{row.orderNumber}</td>
                    <td className={cell}>{h.modelLabel(row)}</td>
                    <td className={`${cell} font-mono`} dir="ltr">{row.chassisStart || '—'}</td>
                    <td className={`${cell} font-mono`} dir="ltr">{row.chassisEnd || '—'}</td>
                    <td className={`${cell} font-black text-cyan-300`}>{row.plannedQty}</td>
                    <td className={`${cell} font-black text-emerald-300`}>{h.assemblyEntryByOrderId.get(row.id) ?? 0}</td>
                    {canManage && (
                      <td className={cell}>
                        <div className="flex justify-center gap-1">
                          <button type="button" title={t('common.edit')} onClick={() => h.openEditOrder(row)} className="rounded-lg bg-orange-500/15 p-2 text-orange-200 hover:bg-orange-500/25">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" title={t('common.delete')} onClick={() => h.setDeleteTarget(row)} className="rounded-lg bg-red-500/15 p-2 text-red-200 hover:bg-red-500/25">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {h.loading && <p className="p-8 text-center text-slate-400">{t('common.loading')}</p>}
            {!h.loading && h.orders.length === 0 && <p className="p-8 text-center text-slate-500">{t('common.noData')}</p>}
            {!h.loading && h.error && h.orders.length === 0 && (
              <p className="p-4 text-center text-sm text-red-300">{h.error}</p>
            )}
          </div>

          <ConfirmDialog
            open={Boolean(h.deleteTarget)}
            title={t('common.delete')}
            message={h.deleteTarget ? t('productionOrders.deleteConfirm', { n: h.deleteTarget.orderNumber }) : ''}
            confirmLabel={t('common.delete')}
            cancelLabel={t('common.cancel')}
            busy={h.submitting}
            onCancel={() => h.setDeleteTarget(null)}
            onConfirm={() => void h.confirmDeleteOrder()}
          />
        </div>
      )}
    </section>
  )
}
