import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import type { ModelPartInventory, Warehouse } from '../../Types/warehouse'
import type { Station, VehicleModel } from '../../Types/settings'
import type { FeedingDraftLine } from './feedingShared'

type Props = {
  warehouses: Warehouse[]
  models: VehicleModel[]
  stations: Station[]
  warehouseId: string
  modelId: string
  stationId: string
  plannedDate?: string
  notes: string
  lines: FeedingDraftLine[]
  modelParts: ModelPartInventory[]
  onWarehouseId: (v: string) => void
  onModelId: (v: string) => void
  onStationId: (v: string) => void
  onPlannedDate?: (v: string) => void
  onNotes: (v: string) => void
  onLines: (v: FeedingDraftLine[]) => void
  onAddPart: (part: ModelPartInventory) => void
}

export function FeedingFormFields({
  warehouses,
  models,
  stations,
  warehouseId,
  modelId,
  stationId,
  plannedDate,
  notes,
  lines,
  modelParts,
  onWarehouseId,
  onModelId,
  onStationId,
  onPlannedDate,
  onNotes,
  onLines,
  onAddPart
}: Props) {
  const { t } = useLang()

  const variantModels = useMemo(
    () => models.filter(m => m.is_active && m.model_kind === 'variant').sort((a, b) => a.name.localeCompare(b.name)),
    [models]
  )

  const masterStations = useMemo(
    () =>
      stations
        .filter(s => s.is_active && !s.parent_station_id)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.station_number.localeCompare(b.station_number)),
    [stations]
  )

  return (
    <>
      <div className={`grid grid-cols-1 gap-3 ${onPlannedDate ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
        <div>
          <label className="mb-1 block text-xs text-slate-500">{t('warehouses.stock.warehouse')}</label>
          <select className="input-dark" value={warehouseId} onChange={e => onWarehouseId(e.target.value)}>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">{t('warehouses.stock.model')}</label>
          <select className="input-dark" value={modelId} onChange={e => onModelId(e.target.value)}>
            <option value="">{t('warehouses.feeding.pickModel')}</option>
            {variantModels.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">{t('warehouses.feeding.station')}</label>
          <select className="input-dark" value={stationId} onChange={e => onStationId(e.target.value)}>
            <option value="">{t('warehouses.feeding.optional')}</option>
            {masterStations.map(s => (
              <option key={s.id} value={s.id}>
                {s.station_number} — {s.station_name}
              </option>
            ))}
          </select>
        </div>
        {onPlannedDate && (
          <div>
            <label className="mb-1 block text-xs text-slate-500">{t('warehouses.feeding.plannedDate')}</label>
            <input className="input-dark" type="date" value={plannedDate} onChange={e => onPlannedDate(e.target.value)} />
          </div>
        )}
      </div>

      {modelId && (
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
          <p className="mb-2 text-xs font-bold text-slate-400">{t('warehouses.feeding.addParts')}</p>
          <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
            {modelParts.map(p => (
              <button
                key={p.partId}
                type="button"
                disabled={lines.some(l => l.partId === p.partId)}
                onClick={() => onAddPart(p)}
                className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-bold text-slate-300 hover:bg-amber-500/20 hover:text-amber-200 disabled:opacity-40"
                dir="ltr"
              >
                <Plus className="me-1 inline h-3 w-3" />
                {p.partNumber}
              </button>
            ))}
          </div>
        </div>
      )}

      {lines.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-950/80">
              <tr>
                <th className="px-3 py-2 text-start text-xs text-slate-400">{t('warehouses.stock.cols.part')}</th>
                <th className="px-3 py-2 text-center text-xs text-slate-400">{t('warehouses.feeding.qty')}</th>
                <th className="px-3 py-2 text-center text-xs text-slate-400">{t('warehouses.stock.cols.available')}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.map(l => (
                <tr key={l.partId} className="border-t border-slate-800">
                  <td className="px-3 py-2">
                    <span className="font-mono text-xs text-cyan-200" dir="ltr">
                      {l.partNumber}
                    </span>
                    <span className="block text-xs text-slate-500">{l.partName}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      className="input-dark mx-auto w-24 text-center"
                      type="number"
                      min={0.001}
                      step="any"
                      value={l.quantity}
                      onChange={e =>
                        onLines(lines.map(x => (x.partId === l.partId ? { ...x, quantity: e.target.value } : x)))
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-center text-slate-400" dir="ltr">
                    {l.available}
                  </td>
                  <td className="px-3 py-2 text-end">
                    <button
                      type="button"
                      onClick={() => onLines(lines.filter(x => x.partId !== l.partId))}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      {t('common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3">
        <label className="mb-1 block text-xs text-slate-500">{t('common.notes')}</label>
        <input className="input-dark" value={notes} onChange={e => onNotes(e.target.value)} />
      </div>
    </>
  )
}

export function useFeedingFormState(warehouses: Warehouse[]) {
  const [warehouseId, setWarehouseId] = useState('')
  const [modelId, setModelId] = useState('')
  const [stationId, setStationId] = useState('')
  const [plannedDate, setPlannedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<FeedingDraftLine[]>([])
  const [modelParts, setModelParts] = useState<ModelPartInventory[]>([])

  useEffect(() => {
    if (!warehouseId && warehouses.length > 0) setWarehouseId(warehouses[0].id)
  }, [warehouses, warehouseId])

  return {
    warehouseId,
    setWarehouseId,
    modelId,
    setModelId,
    stationId,
    setStationId,
    plannedDate,
    setPlannedDate,
    notes,
    setNotes,
    lines,
    setLines,
    modelParts,
    setModelParts
  }
}
