import { useMemo, useState } from 'react'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Pencil, PlusCircle, Trash2 } from 'lucide-react'
import type { ProductionPlanOrdersState } from '../../hooks/useProductionPlanOrders'
import { Field, inputCls } from '../FormField'
import { ConfirmDialog } from '../ConfirmDialog'
import { VehicleModelFamilyPicker, resolveFamilyIdForVariant } from '../VehicleModelFamilyPicker'
import { TableExportButtons } from '../TableExportButtons'
import type { TableExportColumn } from '../../Utils/tableExport'
import { buildOrdersExportRows } from '../../Utils/planningExport'
import { formatVehicleColorLabel } from '../../Utils/vehicleColorLabel'
import { ProductionOrderDetailCard } from './ProductionOrderDetailCard'
import { useNavigation } from '../../Context/NavigationContext'
import { dispatchOpenMissingPartsTab, productionNavigatePatch } from '../../Utils/openMissingPartsTab'
import type { ProductionOrder } from '../../Types/production'

const cell = 'table-cell text-center align-middle'

type Props = {
  h: ProductionPlanOrdersState
}

export function ProductionOrdersPanel({ h }: Props) {
  const { t, canManage } = h
  const nav = useNavigation()
  const [detailOrder, setDetailOrder] = useState<ProductionOrder | null>(null)

  const ordersExportColumns = useMemo<TableExportColumn<ReturnType<typeof buildOrdersExportRows>[number]>[]>(
    () => [
      { label: t('productionOrders.cols.orderNumber'), value: r => r.orderNumber },
      { label: t('productionOrders.cols.model'), value: r => r.model },
      { label: t('productionOrders.cols.openedAt'), value: r => r.openedAt },
      { label: t('productionOrders.cols.colors'), value: r => r.colors },
      { label: t('productionOrders.cols.chassisStart'), value: r => r.chassisStart },
      { label: t('productionOrders.cols.chassisEnd'), value: r => r.chassisEnd },
      { label: t('productionOrders.cols.carCount'), value: r => r.carCount },
      { label: t('productionOrders.cols.assemblyEntry'), value: r => r.assemblyEntry }
    ],
    [t]
  )

  return (
    <div className="card-industrial p-5 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-400">{t('productionOrders.ordersSectionHint')}</p>
          <p className="mt-1 text-xs text-slate-500">{t('productionOrders.ordersCarryoverHint')}</p>
        </div>
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
          <button
            type="button"
            onClick={() => h.setAssemblyEntrySort(h.assemblyEntrySort === 'desc' ? 'asc' : 'desc')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700"
            title={t('productionOrders.sortByAssemblyEntry')}
          >
            {h.assemblyEntrySort === 'desc' ? (
              <ArrowDownWideNarrow className="h-4 w-4" />
            ) : (
              <ArrowUpNarrowWide className="h-4 w-4" />
            )}
            {t('productionOrders.sortByAssemblyEntry')}
          </button>
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

            <Field label={t('productionOrders.cols.openedAt')} required>
              <input
                type="datetime-local"
                className={inputCls()}
                dir="ltr"
                value={h.openedAtLocal}
                onChange={e => h.setOpenedAtLocal(e.target.value)}
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

          <div className="space-y-3 rounded-xl border border-slate-700/80 bg-slate-950/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-black text-violet-200">{t('productionOrders.colorsTitle')}</p>
                <p className="text-xs text-slate-500">{t('productionOrders.colorsHint')}</p>
              </div>
              <button
                type="button"
                onClick={h.addColorDraft}
                className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-200 hover:bg-violet-500/20"
              >
                {t('productionOrders.addColor')}
              </button>
            </div>
            {h.colorDrafts.length === 0 ? (
              <p className="text-xs text-slate-500">{t('productionOrders.colorsEmpty')}</p>
            ) : (
              <div className="space-y-2">
                {h.colorDrafts.map((draft, index) => (
                  <div key={`color-${index}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_auto]">
                    <select
                      className={inputCls()}
                      value={draft.colorId}
                      onChange={e => h.patchColorDraft(index, { colorId: e.target.value })}
                    >
                      <option value="">{t('productionOrders.selectColor')}</option>
                      {h.vehicleColors.map(c => (
                        <option key={c.id} value={c.id}>
                          {formatVehicleColorLabel(c.name, c.code) ?? c.name}
                        </option>
                      ))}
                    </select>
                    <input
                      className={inputCls()}
                      type="number"
                      min={1}
                      dir="ltr"
                      placeholder={t('productionOrders.colorQty')}
                      value={draft.qty}
                      onChange={e => h.patchColorDraft(index, { qty: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => h.removeColorDraft(index)}
                      className="rounded-lg bg-red-500/15 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-500/25"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                ))}
                <p className="text-xs text-slate-400">
                  {t('productionOrders.colorQtySum', { n: h.colorQtyTotal, cars: h.carCount ?? 0 })}
                </p>
              </div>
            )}
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
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-slate-950/90">
            <tr>
              <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.cols.orderNumber')}</th>
              <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.cols.model')}</th>
              <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.cols.openedAt')}</th>
              <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.cols.colors')}</th>
              <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.cols.chassisStart')}</th>
              <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.cols.chassisEnd')}</th>
              <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.cols.carCount')}</th>
              <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.cols.assemblyEntry')}</th>
              {canManage && <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('common.actions')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {h.orders.map(row => (
              <tr key={row.id} className="cursor-pointer hover:bg-slate-800/30" onClick={() => setDetailOrder(row)}>
                <td className={`${cell} font-mono font-bold text-white`} dir="ltr">{row.orderNumber}</td>
                <td className={cell}>{h.modelLabel(row)}</td>
                <td className={`${cell} text-xs text-slate-300`} dir="ltr">
                  {h.formatOpenedAt(row)}
                </td>
                <td className={cell}>
                  {(row.colors ?? []).length === 0 ? (
                    <span className="text-slate-500">—</span>
                  ) : (
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      {(row.colors ?? []).map(c => (
                        <span
                          key={`${row.id}-${c.colorId}`}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold text-slate-200"
                          title={formatVehicleColorLabel(c.colorName, c.colorCode) ?? undefined}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full border border-white/20"
                            style={{ backgroundColor: c.hexCode || '#64748b' }}
                          />
                          {c.qty}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className={`${cell} font-mono`} dir="ltr">{row.chassisStart || '—'}</td>
                <td className={`${cell} font-mono`} dir="ltr">{row.chassisEnd || '—'}</td>
                <td className={`${cell} font-black text-cyan-300`}>{row.plannedQty}</td>
                <td className={`${cell} font-black text-emerald-300`}>{h.assemblyEntryByOrderId.get(row.id) ?? 0}</td>
                {canManage && (
                  <td className={cell} onClick={e => e.stopPropagation()}>
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

      <ProductionOrderDetailCard
        open={Boolean(detailOrder)}
        order={detailOrder}
        modelLabel={detailOrder ? h.modelLabel(detailOrder) : ''}
        openedAt={detailOrder ? h.formatOpenedAt(detailOrder) : '—'}
        assemblyEntry={detailOrder ? (h.assemblyEntryByOrderId.get(detailOrder.id) ?? 0) : 0}
        shortageVehicles={detailOrder ? (h.shortageVehiclesByOrderId.get(detailOrder.id) ?? []) : []}
        t={t}
        onClose={() => setDetailOrder(null)}
        onOpenShortages={vins => {
          setDetailOrder(null)
          nav.navigate(productionNavigatePatch('missing'))
          queueMicrotask(() => dispatchOpenMissingPartsTab('active', undefined, vins))
        }}
      />
    </div>
  )
}
