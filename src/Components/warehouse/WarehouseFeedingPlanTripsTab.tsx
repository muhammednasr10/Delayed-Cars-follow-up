import { useEffect, useMemo, useState } from 'react'
import { Route, Truck } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { getWarehouseCarts } from '../../services/warehouseEquipmentService'
import type { WarehouseCart } from '../../Types/warehouse'
import type { IplPlanDraftRow } from './feedingShared'
import { loadPercent, planFeedingTrips } from '../../Utils/feedingTripPlanner'

type Props = {
  iplRows: IplPlanDraftRow[]
  variantId: string
  selectedModelName: string
}

export function WarehouseFeedingPlanTripsTab({ iplRows, variantId, selectedModelName }: Props) {
  const { t } = useLang()
  const [carts, setCarts] = useState<WarehouseCart[]>([])
  const [cartId, setCartId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getWarehouseCarts()
      .then(rows => {
        const active = rows.filter(c => c.status === 'active')
        setCarts(active)
        setCartId(prev => prev || active[0]?.id || '')
      })
      .catch(() => setCarts([]))
      .finally(() => setLoading(false))
  }, [])

  const selectedCart = useMemo(() => carts.find(c => c.id === cartId) ?? null, [carts, cartId])

  const plan = useMemo(() => planFeedingTrips(iplRows, selectedCart), [iplRows, selectedCart])

  const includedCount = useMemo(() => iplRows.filter(r => r.included).length, [iplRows])

  if (!variantId) {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center text-sm text-slate-500">
        {t('warehouses.feeding.trips.pickModelFirst')}
      </p>
    )
  }

  if (includedCount === 0) {
    return (
      <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center text-sm text-amber-200">
        {t('warehouses.feeding.trips.noPartsSelected')}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1">
          <label className="mb-1 block text-xs text-slate-500">{t('warehouses.feeding.trips.selectCart')}</label>
          <select className="input-dark" value={cartId} onChange={e => setCartId(e.target.value)} disabled={loading}>
            {carts.length === 0 && <option value="">{t('warehouses.feeding.cartsEmpty')}</option>}
            {carts.map(c => (
              <option key={c.id} value={c.id}>
                {c.code}
                {c.name ? ` — ${c.name}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-xs text-violet-200">
          {t('warehouses.feeding.trips.summary', {
            model: selectedModelName,
            parts: includedCount,
            trips: plan.trips.length
          })}
        </div>
      </div>

      {loading ? (
        <p className="py-8 text-center text-slate-400">{t('common.loading')}</p>
      ) : !selectedCart ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center text-sm text-amber-200">
          {t('warehouses.feeding.trips.addCartFirst')}
        </p>
      ) : (
        <>
          {plan.trips.length === 0 ? (
            <p className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center text-sm text-slate-500">
              {t('warehouses.feeding.trips.empty')}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {plan.trips.map(trip => {
                const pct = loadPercent(trip)
                const loadTone = pct >= 95 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                return (
                  <div key={trip.tripIndex} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-black text-white">
                        <Truck className="h-4 w-4 text-cyan-300" />
                        {t('warehouses.feeding.trips.trip', { n: trip.tripIndex })}
                      </span>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-cyan-200" dir="ltr">
                        {trip.cartCode}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {t('warehouses.feeding.trips.dollsUsed', {
                          used: trip.dollSlotsUsed,
                          total: trip.dollCount
                        })}
                      </span>
                    </div>

                    <div className="mb-3">
                      <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                        <span>{t('warehouses.feeding.trips.load')}</span>
                        <span dir="ltr">
                          {trip.totalWeightKg} / {trip.maxLoadKg} {t('bom.iplLogistics.unitKg')} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                        <div className={`h-full ${loadTone}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <ul className="max-h-48 space-y-1.5 overflow-y-auto">
                      {trip.parts.map(p => (
                        <li
                          key={p.partId}
                          className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-900/60 px-2 py-1.5 text-xs"
                        >
                          <span className="font-mono text-cyan-200/90" dir="ltr">
                            {p.partNumber}
                          </span>
                          <span className="truncate text-slate-400">{p.partName}</span>
                          <span className="ms-auto text-slate-500" dir="ltr">
                            × {p.quantity}
                          </span>
                          <span className="text-slate-500" dir="ltr">
                            {p.tripWeightKg} {t('bom.iplLogistics.unitKg')}
                          </span>
                          {p.stationCode && (
                            <span className="rounded bg-slate-800 px-1 font-mono text-[10px] text-slate-400" dir="ltr">
                              {p.stationCode}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}

          {plan.unassigned.length > 0 && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-black text-rose-200">
                <Route className="h-4 w-4" />
                {t('warehouses.feeding.trips.unassignedTitle')}
              </p>
              <ul className="space-y-1.5">
                {plan.unassigned.map(p => (
                  <li key={p.partId} className="flex flex-wrap gap-2 text-xs text-rose-100/90">
                    <span className="font-mono" dir="ltr">
                      {p.partNumber}
                    </span>
                    <span className="text-rose-200/70">{p.partName}</span>
                    <span className="ms-auto text-rose-200/60">
                      {t(`warehouses.feeding.trips.reason.${p.reasonKey}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
