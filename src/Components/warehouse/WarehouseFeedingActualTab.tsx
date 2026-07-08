import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCcw, Truck } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { EmptyState } from '../EmptyState'
import { iplRowsForCarCount, parseIplPlanLines, type IplPlanDraftRow } from './feedingShared'
import { getIplFeedingParts, getWarehouseFeedings, recordWarehouseFeeding } from '../../services/warehouseService'
import { getProductionOrders } from '../../services/productionOrdersService'
import type { Warehouse, WarehouseFeeding } from '../../Types/warehouse'
import type { ProductionOrder } from '../../Types/production'
import type { Station } from '../../Types/settings'

type Props = {
  warehouses: Warehouse[]
  stations: Station[]
  canManage: boolean
  notify: (msg: string, isError?: boolean) => void
}

const ACTIVE_ORDER_STATUSES = new Set<ProductionOrder['status']>(['planned', 'in_progress', 'on_hold'])

function orderLabel(order: ProductionOrder) {
  const model = order.modelName ?? '—'
  const chassis =
    order.chassisStart && order.chassisEnd ? ` · ${order.chassisStart}–${order.chassisEnd}` : ''
  return `${order.orderNumber} — ${model} (${order.plannedQty})${chassis}`
}

export function WarehouseFeedingActualTab({ warehouses, stations, canManage, notify }: Props) {
  const { t } = useLang()
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [feedings, setFeedings] = useState<WarehouseFeeding[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [ordersLoading, setOrdersLoading] = useState(true)

  const [warehouseId, setWarehouseId] = useState('')
  const [stationId, setStationId] = useState('')
  const [orderId, setOrderId] = useState('')
  const [notes, setNotes] = useState('')
  const [iplRows, setIplRows] = useState<IplPlanDraftRow[]>([])
  const [iplLoading, setIplLoading] = useState(false)

  const fedOrderIds = useMemo(
    () => new Set(feedings.map(f => f.productionOrderId).filter((id): id is string => Boolean(id))),
    [feedings]
  )

  const availableOrders = useMemo(
    () =>
      orders
        .filter(
          o =>
            o.modelId &&
            o.plannedQty > 0 &&
            ACTIVE_ORDER_STATUSES.has(o.status) &&
            !fedOrderIds.has(o.id)
        )
        .sort((a, b) => b.createdAt?.localeCompare(a.createdAt ?? '') ?? 0),
    [orders, fedOrderIds]
  )

  const selectedOrder = useMemo(
    () => availableOrders.find(o => o.id === orderId) ?? orders.find(o => o.id === orderId) ?? null,
    [availableOrders, orders, orderId]
  )

  const masterStations = useMemo(
    () =>
      stations
        .filter(s => s.is_active && !s.parent_station_id)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.station_number.localeCompare(b.station_number)),
    [stations]
  )

  const includedCount = useMemo(() => iplRows.filter(r => r.included).length, [iplRows])

  const loadFeedings = useCallback(async () => {
    setLoading(true)
    try {
      setFeedings(await getWarehouseFeedings())
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setLoading(false)
    }
  }, [notify, t])

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true)
    try {
      setOrders(await getProductionOrders())
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
      setOrders([])
    } finally {
      setOrdersLoading(false)
    }
  }, [notify, t])

  useEffect(() => {
    loadFeedings()
    loadOrders()
  }, [loadFeedings, loadOrders])

  useEffect(() => {
    if (!warehouseId && warehouses.length > 0) setWarehouseId(warehouses[0].id)
  }, [warehouses, warehouseId])

  useEffect(() => {
    if (!orderId && availableOrders.length > 0) setOrderId(availableOrders[0].id)
  }, [orderId, availableOrders])

  const loadIplForOrder = useCallback(
    async (order: ProductionOrder | null) => {
      if (!order?.modelId) {
        setIplRows([])
        return
      }
      setIplLoading(true)
      try {
        const rows = await getIplFeedingParts(order.modelId, warehouseId || undefined, t)
        setIplRows(iplRowsForCarCount(rows, order.plannedQty))
      } catch {
        setIplRows([])
      } finally {
        setIplLoading(false)
      }
    },
    [warehouseId, t]
  )

  useEffect(() => {
    loadIplForOrder(selectedOrder)
  }, [selectedOrder, loadIplForOrder])

  function updateRow(bomItemId: string, patch: Partial<IplPlanDraftRow>) {
    setIplRows(prev => prev.map(r => (r.bomItemId === bomItemId ? { ...r, ...patch } : r)))
  }

  function setAllIncluded(included: boolean) {
    setIplRows(prev => prev.map(r => ({ ...r, included })))
  }

  async function submit() {
    if (!canManage || !selectedOrder?.modelId || !warehouseId) return
    const payload = parseIplPlanLines(iplRows)
    if (!payload) {
      notify(t('warehouses.feeding.invalidQty'), true)
      return
    }
    setBusy(true)
    try {
      await recordWarehouseFeeding({
        vehicleModelId: selectedOrder.modelId,
        warehouseId,
        stationId: stationId || null,
        reference: selectedOrder.orderNumber,
        productionOrderId: selectedOrder.id,
        notes: notes.trim() || null,
        lines: payload
      })
      notify(t('settings.added'))
      setNotes('')
      setOrderId('')
      setIplRows([])
      await Promise.all([loadFeedings(), loadOrders()])
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  const canSubmit =
    Boolean(selectedOrder?.modelId) && iplRows.some(r => r.included) && !iplLoading && !ordersLoading

  const th = 'whitespace-nowrap px-2 py-2 text-center align-middle text-[10px] font-bold text-slate-400'
  const td = 'whitespace-nowrap px-2 py-1.5 text-center align-middle text-xs text-slate-300'

  return (
    <div className="space-y-4">
      <div className="card-industrial p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-500/15 p-3 text-amber-300">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{t('warehouses.feeding.subTabs.actual')}</h3>
            <p className="text-sm text-slate-400">{t('warehouses.feeding.actualFromPlanning')}</p>
          </div>
        </div>
      </div>

      {canManage && (
        <div className="card-industrial p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-white">
            <Truck className="h-4 w-4 text-amber-300" />
            {t('warehouses.feeding.newTitle')}
          </h3>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">{t('warehouses.feeding.productionOrder')}</label>
              {ordersLoading ? (
                <p className="text-sm text-slate-400">{t('common.loading')}</p>
              ) : availableOrders.length === 0 ? (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                  {t('warehouses.feeding.noOrdersForFeeding')}
                </p>
              ) : (
                <select className="input-dark" value={orderId} onChange={e => setOrderId(e.target.value)} dir="ltr">
                  {availableOrders.map(o => (
                    <option key={o.id} value={o.id}>
                      {orderLabel(o)}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">{t('warehouses.stock.warehouse')}</label>
              <select className="input-dark" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedOrder && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-violet-500/15 px-2 py-1 font-bold text-violet-200" dir="ltr">
                {selectedOrder.modelName}
              </span>
              <span className="rounded-full bg-cyan-500/15 px-2 py-1 font-bold text-cyan-200">
                {t('warehouses.feeding.orderCarCount', { n: selectedOrder.plannedQty })}
              </span>
              {selectedOrder.chassisStart && selectedOrder.chassisEnd && (
                <span className="rounded-full bg-slate-800 px-2 py-1 font-mono text-slate-300" dir="ltr">
                  {selectedOrder.chassisStart} – {selectedOrder.chassisEnd}
                </span>
              )}
            </div>
          )}

          <div className="mt-3">
            <label className="mb-1 block text-xs text-slate-500">{t('warehouses.feeding.station')}</label>
            <select className="input-dark" value={stationId} onChange={e => setStationId(e.target.value)}>
              <option value="">{t('warehouses.feeding.optional')}</option>
              {masterStations.map(s => (
                <option key={s.id} value={s.id}>
                  {s.station_number} — {s.station_name}
                </option>
              ))}
            </select>
          </div>

          {selectedOrder && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-black text-white">{t('warehouses.feeding.actualPartsTitle')}</h4>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                  {t('warehouses.feeding.iplRowCount', { n: iplRows.length })}
                </span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                  {t('warehouses.feeding.iplSelectedCount', { n: includedCount })}
                </span>
                <button
                  type="button"
                  onClick={() => loadIplForOrder(selectedOrder)}
                  disabled={iplLoading}
                  className="ms-auto flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-xs font-bold text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                >
                  <RefreshCcw className={`h-3 w-3 ${iplLoading ? 'animate-spin' : ''}`} />
                  {t('common.refresh')}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAllIncluded(true)}
                  className="rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/25"
                >
                  {t('warehouses.feeding.iplSelectAll')}
                </button>
                <button
                  type="button"
                  onClick={() => setAllIncluded(false)}
                  className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-400 hover:bg-slate-700"
                >
                  {t('warehouses.feeding.iplSelectNone')}
                </button>
              </div>

              {iplLoading ? (
                <p className="py-6 text-center text-sm text-slate-400">{t('common.loading')}</p>
              ) : iplRows.length === 0 ? (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                  {t('warehouses.feeding.iplEmpty')}
                </p>
              ) : (
                <div className="max-h-[28rem] overflow-auto rounded-xl border border-slate-800">
                  <table className="w-full min-w-[48rem] text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-950/95">
                      <tr className="border-b border-slate-800">
                        <th className={`${th} w-10`} />
                        <th className={th}>{t('warehouses.feeding.cols.partNo')}</th>
                        <th className={th}>{t('warehouses.feeding.cols.partName')}</th>
                        <th className={th}>{t('warehouses.feeding.cols.qv')}</th>
                        <th className={th}>{t('warehouses.feeding.cols.station')}</th>
                        <th className={th}>{t('warehouses.stock.cols.available')}</th>
                        <th className={th}>{t('warehouses.feeding.qty')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {iplRows.map(r => (
                        <tr key={r.bomItemId} className="border-t border-slate-800/80 hover:bg-slate-900/40">
                          <td className={td}>
                            <input
                              type="checkbox"
                              checked={r.included}
                              onChange={e => updateRow(r.bomItemId, { included: e.target.checked })}
                              className="mx-auto block h-4 w-4 rounded border-slate-600"
                            />
                          </td>
                          <td className={`${td} font-mono text-cyan-200/90`} dir="ltr">
                            {r.partNumber}
                          </td>
                          <td className={`${td} max-w-[12rem] truncate text-slate-400`} title={r.partName}>
                            {r.partName}
                          </td>
                          <td className={`${td} text-slate-400`} dir="ltr">
                            {r.qtyPerVehicle}
                          </td>
                          <td className={`${td} font-mono text-cyan-200/70`} dir="ltr">
                            {r.stationCode || '—'}
                          </td>
                          <td className={`${td} text-slate-400`} dir="ltr">
                            {r.available}
                          </td>
                          <td className={td}>
                            <input
                              className="input-dark mx-auto w-20 text-center text-xs"
                              type="number"
                              min={0.001}
                              step="any"
                              disabled={!r.included}
                              value={r.quantity}
                              onChange={e => updateRow(r.bomItemId, { quantity: e.target.value })}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="mt-3">
            <label className="mb-1 block text-xs text-slate-500">{t('common.notes')}</label>
            <input className="input-dark" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <button
            type="button"
            disabled={busy || !canSubmit || availableOrders.length === 0}
            onClick={submit}
            className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {t('warehouses.feeding.submit')}
          </button>
        </div>
      )}

      <div className="card-industrial overflow-hidden">
        <div className="border-b border-slate-800 px-4 py-3">
          <h3 className="text-sm font-black text-white">{t('warehouses.feeding.history')}</h3>
        </div>
        {loading ? (
          <p className="p-8 text-center text-slate-400">{t('common.loading')}</p>
        ) : feedings.length === 0 ? (
          <EmptyState title={t('warehouses.feeding.empty')} />
        ) : (
          <div className="divide-y divide-slate-800">
            {feedings.map(f => (
              <div key={f.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-black text-amber-200" dir="ltr">
                    {f.feedingDate}
                  </span>
                  <span className="text-slate-300">{f.modelName}</span>
                  {f.reference && (
                    <span className="rounded bg-violet-500/15 px-2 py-0.5 text-xs font-bold text-violet-200" dir="ltr">
                      {f.reference}
                    </span>
                  )}
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">{f.warehouseCode}</span>
                  {f.stationNumber && (
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300" dir="ltr">
                      {f.stationNumber}
                    </span>
                  )}
                </div>
                {f.notes && <p className="mt-1 text-xs text-slate-500">{f.notes}</p>}
                <ul className="mt-2 space-y-1">
                  {f.lines.map(l => (
                    <li key={l.id} className="flex flex-wrap gap-2 text-xs text-slate-400">
                      <span className="font-mono text-cyan-200/80" dir="ltr">
                        {l.partNumber}
                      </span>
                      <span>× {l.quantity}</span>
                      {!l.itemId && <span className="text-amber-400">({t('warehouses.feeding.noStockMove')})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
