import { useEffect, useState } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { inputCls } from '../FormField'
import {
  DEFAULT_RACK_HEIGHT_CM,
  DEFAULT_RACK_LENGTH_CM,
  DEFAULT_RACK_WIDTH_CM,
  iplFeedingCardFromBomItem,
  PACKING_TYPES,
  type BomIplFeedingCard,
  type PackingType,
  withComputedVolumes
} from '../../Utils/iplBomLogistics'
import type { BomDisplayGroup } from '../../Utils/bomRowGroups'
import { BomStopperExclusionsModal } from './BomStopperExclusionsModal'
import { StopperChip } from '../StatusChips'
import type { StopperType } from '../../Types/enums'
import { getWarehouseRacks } from '../../services/warehouseEquipmentService'
import type { WarehouseRack } from '../../Types/warehouse'

type Props = {
  group: BomDisplayGroup
  canUpdate: boolean
  saving?: boolean
  onSave: (itemIds: string[], card: BomIplFeedingCard) => Promise<void>
}

const DIRECTION_OPTIONS = [
  { value: 'ي', labelKey: 'bom.iplLogistics.directionRight' },
  { value: 'ش', labelKey: 'bom.iplLogistics.directionLeft' }
] as const

const PACKING_OPTION_KEYS: Record<PackingType, string> = {
  carton: 'bom.iplLogistics.packingCarton',
  bin: 'bom.iplLogistics.packingBin',
  bag: 'bom.iplLogistics.packingBag',
  part: 'bom.iplLogistics.packingPart'
}

const STOPPER_OPTIONS = [
  { value: 'non_stopper', labelKey: 'bom.stopperNone' },
  { value: 'line_stopper', labelKey: 'bom.stopperLine' },
  { value: 'car_stopper', labelKey: 'bom.stopperCar' }
] as const

function fieldLabel(t: (k: string) => string, key: string, unit?: string): string {
  const base = t(`bom.iplLogistics.${key}`)
  return unit ? `${base} (${unit})` : base
}

export function BomIplLogisticsPanel({ group, canUpdate, saving, onSave }: Props) {
  const { t } = useLang()
  const [draft, setDraft] = useState<BomIplFeedingCard>(() => iplFeedingCardFromBomItem(group.primary))
  const [error, setError] = useState('')
  const [exclusionsOpen, setExclusionsOpen] = useState(false)
  const [racks, setRacks] = useState<WarehouseRack[]>([])

  const itemIds = [
    group.primary.id,
    ...group.variants.map(v => v.id).filter((id): id is string => Boolean(id))
  ].filter((id, i, arr) => arr.indexOf(id) === i)

  useEffect(() => {
    setDraft(iplFeedingCardFromBomItem(group.primary))
    setError('')
  }, [group.key, group.primary])

  useEffect(() => {
    void getWarehouseRacks()
      .then(setRacks)
      .catch(() => setRacks([]))
  }, [])

  function patch(partial: Partial<BomIplFeedingCard>) {
    setDraft(prev => ({ ...withComputedVolumes({ ...prev, ...partial }), stopper_type: partial.stopper_type ?? prev.stopper_type }))
  }

  const showPartDims = Boolean(draft.packing)

  async function save() {
    setError('')
    try {
      const payload: BomIplFeedingCard = {
        ...withComputedVolumes(draft),
        stopper_type: draft.stopper_type
      }
      await onSave(itemIds, payload)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    }
  }

  return (
    <div className="mb-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
      <p className="mb-2 text-[9px] font-black uppercase tracking-wide text-cyan-300/90">
        {t('bom.iplLogistics.title')}
      </p>
      {error && (
        <div className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      <div className="mb-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
        <span className="mb-2 block text-[10px] font-bold text-slate-500">{t('bom.stopperType')}</span>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className={`${inputCls()} min-w-[10rem] py-1 text-xs`}
            value={draft.stopper_type}
            disabled={!canUpdate}
            onChange={e =>
              patch({
                stopper_type: e.target.value as BomIplFeedingCard['stopper_type']
              })
            }
          >
            {STOPPER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
          {draft.stopper_type !== 'non_stopper' && (
            <>
              <StopperChip type={draft.stopper_type as StopperType} />
              <button
                type="button"
                className="text-xs font-bold text-cyan-300 hover:text-cyan-200"
                onClick={() => setExclusionsOpen(true)}
              >
                {t('bom.stopperExclusionsClick')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div>
          <label className="mb-0.5 block text-[10px] font-bold text-slate-500">
            {fieldLabel(t, 'part_direction')}
          </label>
          <select
            className={`${inputCls()} w-full py-1 text-xs`}
            value={draft.part_direction}
            disabled={!canUpdate}
            onChange={e => patch({ part_direction: e.target.value })}
          >
            <option value="">{t('bom.iplLogistics.directionAny')}</option>
            {DIRECTION_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-0.5 block text-[10px] font-bold text-slate-500">{fieldLabel(t, 'packing')}</label>
          <select
            className={`${inputCls()} w-full py-1 text-xs`}
            value={draft.packing}
            disabled={!canUpdate}
            onChange={e => patch({ packing: e.target.value })}
          >
            <option value="">{t('bom.iplLogistics.packingSelect')}</option>
            {PACKING_TYPES.map(p => (
              <option key={p} value={p}>
                {t(PACKING_OPTION_KEYS[p])}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
        <div>
          <label className="mb-0.5 block text-[10px] font-bold text-slate-500">{fieldLabel(t, 'carton_qty')}</label>
          <input
            className={`${inputCls()} w-full py-1 text-xs`}
            value={draft.carton_qty}
            disabled={!canUpdate}
            dir="ltr"
            inputMode="decimal"
            onChange={e => patch({ carton_qty: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-bold text-slate-500">
            {fieldLabel(t, 'part_weight', t('bom.iplLogistics.unitKg'))}
          </label>
          <input
            className={`${inputCls()} w-full py-1 text-xs`}
            value={draft.part_weight}
            disabled={!canUpdate}
            dir="ltr"
            inputMode="decimal"
            onChange={e => patch({ part_weight: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-bold text-slate-500">
            {fieldLabel(t, 'carton_weight', t('bom.iplLogistics.unitKg'))}
          </label>
          <input
            className={`${inputCls()} w-full py-1 text-xs`}
            value={draft.carton_weight}
            disabled={!canUpdate}
            dir="ltr"
            inputMode="decimal"
            onChange={e => patch({ carton_weight: e.target.value })}
          />
        </div>
      </div>

      {showPartDims && (
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-0.5 block text-[10px] font-bold text-slate-500">
              {fieldLabel(t, 'part_length', t('bom.iplLogistics.unitCm'))}
            </label>
            <input
              className={`${inputCls()} w-full py-1 text-xs`}
              value={draft.part_length}
              disabled={!canUpdate}
              dir="ltr"
              inputMode="decimal"
              onChange={e => patch({ part_length: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] font-bold text-slate-500">
              {fieldLabel(t, 'part_width', t('bom.iplLogistics.unitCm'))}
            </label>
            <input
              className={`${inputCls()} w-full py-1 text-xs`}
              value={draft.part_width}
              disabled={!canUpdate}
              dir="ltr"
              inputMode="decimal"
              onChange={e => patch({ part_width: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] font-bold text-slate-500">
              {fieldLabel(t, 'part_height', t('bom.iplLogistics.unitCm'))}
            </label>
            <input
              className={`${inputCls()} w-full py-1 text-xs`}
              value={draft.part_height}
              disabled={!canUpdate}
              dir="ltr"
              inputMode="decimal"
              onChange={e => patch({ part_height: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] font-bold text-slate-500">
              {fieldLabel(t, 'part_volume', t('bom.iplLogistics.unitM3'))}
            </label>
            <input
              className={`${inputCls()} w-full py-1 text-xs text-cyan-200`}
              value={draft.part_volume}
              readOnly
              dir="ltr"
            />
          </div>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-0.5 block text-[10px] font-bold text-slate-500">{fieldLabel(t, 'feeding_method')}</label>
          <input
            className={`${inputCls()} w-full py-1 text-xs`}
            value={draft.feeding_method}
            disabled={!canUpdate}
            onChange={e => patch({ feeding_method: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-bold text-slate-500">{fieldLabel(t, 'rack_code')}</label>
          <select
            className={`${inputCls()} w-full py-1 text-xs`}
            value={draft.rack_code}
            disabled={!canUpdate}
            onChange={e => {
              const code = e.target.value
              const rack = racks.find(r => r.code === code)
              if (rack?.lengthMm && rack?.widthMm && rack?.heightMm) {
                patch({
                  rack_code: code,
                  rack_length: String(Math.round(rack.lengthMm / 10)),
                  rack_width: String(Math.round(rack.widthMm / 10)),
                  rack_height: String(Math.round(rack.heightMm / 10))
                })
              } else {
                patch({ rack_code: code })
              }
            }}
          >
            <option value="">{t('bom.iplLogistics.rackSelect')}</option>
            {draft.rack_code && !racks.some(r => r.code === draft.rack_code) && (
              <option value={draft.rack_code}>{draft.rack_code}</option>
            )}
            {racks.map(r => (
              <option key={r.id} value={r.code}>
                {r.code}
                {r.name ? ` — ${r.name}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mb-2 mt-4 text-[10px] font-bold text-slate-500">{t('bom.iplLogistics.rackDimsTitle')}</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div>
          <label className="mb-0.5 block text-[10px] font-bold text-slate-500">
            {fieldLabel(t, 'rack_length', t('bom.iplLogistics.unitCm'))}
          </label>
          <input
            className={`${inputCls()} w-full py-1 text-xs`}
            value={draft.rack_length || DEFAULT_RACK_LENGTH_CM}
            disabled={!canUpdate}
            dir="ltr"
            inputMode="decimal"
            onChange={e => patch({ rack_length: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-bold text-slate-500">
            {fieldLabel(t, 'rack_width', t('bom.iplLogistics.unitCm'))}
          </label>
          <input
            className={`${inputCls()} w-full py-1 text-xs`}
            value={draft.rack_width || DEFAULT_RACK_WIDTH_CM}
            disabled={!canUpdate}
            dir="ltr"
            inputMode="decimal"
            onChange={e => patch({ rack_width: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-bold text-slate-500">
            {fieldLabel(t, 'rack_height', t('bom.iplLogistics.unitCm'))}
          </label>
          <input
            className={`${inputCls()} w-full py-1 text-xs`}
            value={draft.rack_height || DEFAULT_RACK_HEIGHT_CM}
            disabled={!canUpdate}
            dir="ltr"
            inputMode="decimal"
            onChange={e => patch({ rack_height: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-bold text-slate-500">
            {fieldLabel(t, 'rack_size', t('bom.iplLogistics.unitM3'))}
          </label>
          <input
            className={`${inputCls()} w-full py-1 text-xs text-cyan-200`}
            value={draft.rack_size}
            readOnly
            dir="ltr"
          />
        </div>
      </div>

      {canUpdate && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="rounded-lg bg-cyan-500/20 px-4 py-1.5 text-xs font-bold text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-50"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      )}

      <BomStopperExclusionsModal item={group.primary} open={exclusionsOpen} onClose={() => setExclusionsOpen(false)} />
    </div>
  )
}
