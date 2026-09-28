import { AlertTriangle } from 'lucide-react'
import { Modal } from '../Modal'
import { formatVehicleColorLabel } from '../../Utils/vehicleColorLabel'
import type { ProductionOrder } from '../../Types/production'
import type { VehicleOverview } from '../../Types/vehicle'

type Props = {
  open: boolean
  order: ProductionOrder | null
  modelLabel: string
  openedAt: string
  assemblyEntry: number
  shortageVehicles: VehicleOverview[]
  t: (key: string, vars?: Record<string, string | number>) => string
  onClose: () => void
  onOpenShortages: (vins: string[]) => void
}

export function ProductionOrderDetailCard({
  open,
  order,
  modelLabel,
  openedAt,
  assemblyEntry,
  shortageVehicles,
  t,
  onClose,
  onOpenShortages
}: Props) {
  if (!order) return null
  const shortageCount = shortageVehicles.length

  return (
    <Modal
      open={open}
      title={order.orderNumber}
      subtitle={modelLabel}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2">
            <dt className="text-[10px] font-bold uppercase text-slate-500">{t('productionOrders.cols.openedAt')}</dt>
            <dd className="mt-1 font-bold text-white" dir="ltr">
              {openedAt}
            </dd>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2">
            <dt className="text-[10px] font-bold uppercase text-slate-500">{t('productionOrders.cols.carCount')}</dt>
            <dd className="mt-1 font-black text-cyan-300">{order.plannedQty}</dd>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2">
            <dt className="text-[10px] font-bold uppercase text-slate-500">{t('productionOrders.cols.chassisStart')}</dt>
            <dd className="mt-1 font-mono text-white" dir="ltr">
              {order.chassisStart || '—'}
            </dd>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2">
            <dt className="text-[10px] font-bold uppercase text-slate-500">{t('productionOrders.cols.chassisEnd')}</dt>
            <dd className="mt-1 font-mono text-white" dir="ltr">
              {order.chassisEnd || '—'}
            </dd>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2">
            <dt className="text-[10px] font-bold uppercase text-slate-500">{t('productionOrders.cols.assemblyEntry')}</dt>
            <dd className="mt-1 font-black text-emerald-300">{assemblyEntry}</dd>
          </div>
          <button
            type="button"
            disabled={shortageCount === 0}
            onClick={() => onOpenShortages(shortageVehicles.map(v => v.vin))}
            className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-start disabled:cursor-default disabled:opacity-70"
          >
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-rose-300">
              <AlertTriangle className="h-3 w-3" />
              {t('productionOrders.shortageVehicles')}
            </span>
            <span className="mt-1 block font-black text-2xl text-rose-100">{shortageCount}</span>
            {shortageCount > 0 && (
              <span className="mt-1 block text-[11px] font-bold text-rose-200/80">{t('productionOrders.openShortagePage')}</span>
            )}
          </button>
        </dl>

        {(order.colors ?? []).length > 0 && (
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase text-slate-500">{t('productionOrders.cols.colors')}</p>
            <div className="flex flex-wrap gap-2">
              {(order.colors ?? []).map(c => (
                <span
                  key={c.colorId}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-bold text-slate-200"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.hexCode || '#64748b' }} />
                  {formatVehicleColorLabel(c.colorName, c.colorCode) ?? c.colorName} · {c.qty}
                </span>
              ))}
            </div>
          </div>
        )}

        {shortageCount > 0 && (
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase text-slate-500">{t('productionOrders.shortageVinList')}</p>
            <ul className="max-h-40 space-y-1 overflow-y-auto text-xs" dir="ltr">
              {shortageVehicles.map(v => (
                <li key={v.id} className="flex items-center justify-between rounded-lg bg-slate-900/70 px-2 py-1">
                  <span className="font-mono text-slate-200">{v.vin}</span>
                  <span className="text-rose-300">{v.openMissingCount}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  )
}
