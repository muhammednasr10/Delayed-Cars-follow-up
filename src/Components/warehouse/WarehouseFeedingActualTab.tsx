import { useCallback, useEffect, useState } from 'react'
import { Truck } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { EmptyState } from '../EmptyState'
import { FeedingFormFields, useFeedingFormState } from './FeedingFormFields'
import { draftLineFromPart, parseFeedingLines } from './feedingShared'
import { getModelPartInventory, getWarehouseFeedings, recordWarehouseFeeding } from '../../services/warehouseService'
import type { Warehouse, WarehouseFeeding } from '../../Types/warehouse'
import type { Station, VehicleModel } from '../../Types/settings'

type Props = {
  warehouses: Warehouse[]
  models: VehicleModel[]
  stations: Station[]
  canManage: boolean
  notify: (msg: string, isError?: boolean) => void
}

export function WarehouseFeedingActualTab({ warehouses, models, stations, canManage, notify }: Props) {
  const { t } = useLang()
  const [feedings, setFeedings] = useState<WarehouseFeeding[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const form = useFeedingFormState(warehouses)

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

  useEffect(() => {
    loadFeedings()
  }, [loadFeedings])

  useEffect(() => {
    if (!form.modelId) {
      form.setModelParts([])
      return
    }
    getModelPartInventory({ vehicleModelId: form.modelId, warehouseId: form.warehouseId || undefined })
      .then(form.setModelParts)
      .catch(() => form.setModelParts([]))
  }, [form.modelId, form.warehouseId, form.setModelParts])

  async function submit() {
    if (!canManage || !form.warehouseId || !form.modelId || form.lines.length === 0) return
    const payload = parseFeedingLines(form.lines)
    if (!payload) {
      notify(t('warehouses.feeding.invalidQty'), true)
      return
    }
    setBusy(true)
    try {
      await recordWarehouseFeeding({
        vehicleModelId: form.modelId,
        warehouseId: form.warehouseId,
        stationId: form.stationId || null,
        notes: form.notes.trim() || null,
        lines: payload
      })
      notify(t('settings.added'))
      form.setLines([])
      form.setNotes('')
      await loadFeedings()
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="card-industrial p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-white">
            <Truck className="h-4 w-4 text-amber-300" />
            {t('warehouses.feeding.newTitle')}
          </h3>
          <FeedingFormFields
            warehouses={warehouses}
            models={models}
            stations={stations}
            warehouseId={form.warehouseId}
            modelId={form.modelId}
            stationId={form.stationId}
            notes={form.notes}
            lines={form.lines}
            modelParts={form.modelParts}
            onWarehouseId={form.setWarehouseId}
            onModelId={v => {
              form.setModelId(v)
              form.setLines([])
            }}
            onStationId={form.setStationId}
            onNotes={form.setNotes}
            onLines={form.setLines}
            onAddPart={p => {
              if (!form.lines.some(l => l.partId === p.partId)) {
                form.setLines(prev => [...prev, draftLineFromPart(p)])
              }
            }}
          />
          <button
            type="button"
            disabled={busy || form.lines.length === 0 || !form.modelId}
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
