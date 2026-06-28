import { useCallback, useEffect, useMemo, useState } from 'react'
import { Package, Search } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { EmptyState } from '../EmptyState'
import { ExportableTable } from '../ExportableTable'
import { getModelPartInventory } from '../../services/warehouseService'
import type { ModelPartInventory, Warehouse } from '../../Types/warehouse'
import type { VehicleModel } from '../../Types/settings'

type Props = {
  warehouses: Warehouse[]
  models: VehicleModel[]
}

function fmtQty(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

export function WarehouseCurrentStockTab({ warehouses, models }: Props) {
  const { t } = useLang()
  const [warehouseId, setWarehouseId] = useState('')
  const [modelId, setModelId] = useState('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<ModelPartInventory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const variantModels = useMemo(
    () => models.filter(m => m.is_active && m.model_kind === 'variant').sort((a, b) => a.name.localeCompare(b.name)),
    [models]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getModelPartInventory({
        vehicleModelId: modelId || undefined,
        warehouseId: warehouseId || undefined,
        search: search.trim() || undefined
      })
      setRows(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [modelId, warehouseId, search, t])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!warehouseId && warehouses.length > 0) setWarehouseId(warehouses[0].id)
  }, [warehouses, warehouseId])

  const summary = useMemo(() => {
    let inStock = 0
    let low = 0
    let noLink = 0
    let minCars = Infinity
    for (const r of rows) {
      if (!r.itemId) noLink++
      else if (r.qtyAvailable > 0) inStock++
      if (r.qtyAvailable <= 0 && r.itemId) low++
      if (r.vehiclesCoverable != null && r.vehiclesCoverable < minCars) minCars = r.vehiclesCoverable
    }
    return {
      parts: rows.length,
      inStock,
      low,
      noLink,
      minCars: minCars === Infinity ? null : minCars
    }
  }, [rows])

  return (
    <div className="space-y-4">
      <div className="card-industrial p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">{t('warehouses.stock.warehouse')}</label>
            <select className="input-dark" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
              <option value="">{t('warehouses.stock.allWarehouses')}</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>
                  {w.code} — {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">{t('warehouses.stock.model')}</label>
            <select className="input-dark" value={modelId} onChange={e => setModelId(e.target.value)}>
              <option value="">{t('warehouses.stock.allModels')}</option>
              {variantModels.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-slate-500">{t('warehouses.stock.search')}</label>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                className="input-dark ps-9"
                placeholder={t('warehouses.stock.searchPh')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
          {[
            { label: t('warehouses.stock.summaryParts'), value: summary.parts, tone: 'text-cyan-300' },
            { label: t('warehouses.stock.summaryInStock'), value: summary.inStock, tone: 'text-emerald-300' },
            { label: t('warehouses.stock.summaryLow'), value: summary.low, tone: 'text-amber-300' },
            { label: t('warehouses.stock.summaryNoItem'), value: summary.noLink, tone: 'text-slate-400' },
            {
              label: t('warehouses.stock.summaryMinCars'),
              value: summary.minCars ?? '—',
              tone: 'text-violet-300'
            }
          ].map(card => (
            <div key={card.label} className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2">
              <p className="text-[11px] text-slate-500">{card.label}</p>
              <p className={`text-xl font-black ${card.tone}`}>{card.value}</p>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      <div className="card-industrial overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-slate-400">{t('common.loading')}</p>
        ) : rows.length === 0 ? (
          <EmptyState title={t('warehouses.stock.empty')} hint={t('warehouses.stock.emptyHint')} />
        ) : (
          <ExportableTable filename="warehouse-stock" title={t('warehouses.tabs.currentStock')} rowCount={rows.length}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-start text-sm">
              <thead className="bg-slate-950/90">
                <tr>
                  {['model', 'part', 'name', 'perCar', 'onHand', 'reserved', 'available', 'cars'].map(col => (
                    <th key={col} className="table-cell text-xs font-black uppercase text-slate-400">
                      {t(`warehouses.stock.cols.${col}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map(r => (
                  <tr key={`${r.vehicleModelId}:${r.partId}`} className="hover:bg-slate-800/30">
                    <td className="table-cell font-bold text-slate-200">{r.modelName}</td>
                    <td className="table-cell font-mono text-xs text-cyan-200" dir="ltr">
                      {r.partNumber}
                    </td>
                    <td className="table-cell text-slate-300">{r.partName}</td>
                    <td className="table-cell text-center text-slate-400" dir="ltr">
                      {fmtQty(r.qtyPerVehicle)}
                    </td>
                    <td className="table-cell text-center" dir="ltr">
                      {r.itemId ? (
                        <span className={r.qtyOnHand > 0 ? 'text-emerald-300' : 'text-red-300'}>{fmtQty(r.qtyOnHand)}</span>
                      ) : (
                        <span className="text-xs text-amber-400">{t('warehouses.stock.noItemLink')}</span>
                      )}
                    </td>
                    <td className="table-cell text-center text-slate-400" dir="ltr">
                      {fmtQty(r.qtyReserved)}
                    </td>
                    <td className="table-cell text-center font-bold" dir="ltr">
                      <span className={r.qtyAvailable > 0 ? 'text-emerald-200' : 'text-red-300'}>
                        {fmtQty(r.qtyAvailable)}
                      </span>
                    </td>
                    <td className="table-cell text-center text-violet-300" dir="ltr">
                      {r.vehiclesCoverable ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </ExportableTable>
        )}
      </div>
    </div>
  )
}
