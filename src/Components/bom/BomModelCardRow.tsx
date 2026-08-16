import { Package } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { inputCls } from '../FormField'
import { formatStationReferenceCode } from '../../Utils/stationHierarchy'
import { modelCardFitUi, patchForFitUi, type ModelCardDraft } from '../../Utils/bomModelCards'
import { DEFAULT_PART_KIND, DEFAULT_SUPPLY_SOURCE } from '../../Utils/bomDefaults'
import { partKindPresetOptions, supplySourcePresetOptions } from '../../Utils/bomPresetOptions'
import { iplFeedingHasContent } from '../../Utils/iplBomLogistics'
import { BomPresetSelect } from './BomPresetSelect'
import type { Station } from '../../Types/settings'

type Props = {
  card: ModelCardDraft
  masterStations: Station[]
  partKindOptions: ReturnType<typeof partKindPresetOptions>
  supplyOptions: ReturnType<typeof supplySourcePresetOptions>
  showFeedingAction?: boolean
  onPatch: (modelId: string, patch: Partial<ModelCardDraft>) => void
  onOpenFeeding?: (modelId: string) => void
}

export function BomModelCardRow({
  card,
  masterStations,
  partKindOptions,
  supplyOptions,
  showFeedingAction,
  onPatch,
  onOpenFeeding
}: Props) {
  const { t } = useLang()
  const fitStatus = modelCardFitUi(card)
  const notFitted = fitStatus === 'notFitted'
  const inactive = fitStatus !== 'fitted'
  const feedingFilled = iplFeedingHasContent(card.feeding)

  return (
    <tr
      className={`border-b border-slate-800/60 last:border-0 ${
        notFitted ? 'bg-rose-950/30' : inactive ? 'bg-slate-950/40 opacity-70' : 'bg-slate-900/40'
      }`}
    >
      <td className="px-3 py-2 font-bold text-violet-200">{card.modelName}</td>
      <td className="px-3 py-2">
        <select
          className={`${inputCls()} min-w-[7.5rem] py-1 text-xs`}
          value={fitStatus}
          onChange={e => onPatch(card.modelId, patchForFitUi(card, e.target.value as typeof fitStatus))}
        >
          <option value="unset">{t('bom.iplFitUnset')}</option>
          <option value="fitted">{t('bom.iplFitYes')}</option>
          <option value="notFitted">{t('bom.iplFitNo')}</option>
        </select>
      </td>
      <td className="px-3 py-2">
        <input
          className={`${inputCls()} min-w-[7rem] py-1 font-mono text-sm`}
          dir="ltr"
          value={card.part_number}
          disabled={inactive}
          placeholder={notFitted ? t('bom.iplFitNo') : inactive ? '—' : t('bom.partNumberPh')}
          onChange={e => onPatch(card.modelId, { part_number: e.target.value })}
        />
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="number"
          min={0}
          step="any"
          className={`${inputCls()} mx-auto w-20 py-1 text-center text-sm`}
          value={notFitted ? '' : card.qty}
          disabled={notFitted}
          placeholder={notFitted ? '—' : '0'}
          onChange={e => onPatch(card.modelId, { qty: e.target.value, notFitted: false })}
        />
      </td>
      <td className="px-3 py-2">
        <BomPresetSelect
          value={card.part_kind || DEFAULT_PART_KIND}
          presets={partKindOptions}
          disabled={inactive}
          onChange={v => onPatch(card.modelId, { part_kind: v })}
        />
      </td>
      <td className="px-3 py-2">
        <BomPresetSelect
          value={card.supply_source || DEFAULT_SUPPLY_SOURCE}
          presets={supplyOptions}
          disabled={inactive}
          onChange={v => onPatch(card.modelId, { supply_source: v })}
        />
      </td>
      <td className="px-3 py-2">
        <select
          className={`${inputCls()} py-1 text-sm`}
          value={card.station_id}
          disabled={inactive}
          onChange={e => {
            const st = masterStations.find(s => s.id === e.target.value)
            onPatch(card.modelId, {
              station_id: e.target.value,
              station_code_text: st ? formatStationReferenceCode(st.station_number) : card.station_code_text
            })
          }}
        >
          <option value="">{t('bom.noStation')}</option>
          {masterStations.map(s => (
            <option key={s.id} value={s.id}>
              {formatStationReferenceCode(s.station_number)} — {s.station_name}
            </option>
          ))}
        </select>
      </td>
      {showFeedingAction && (
        <td className="px-2 py-2 text-center">
          <button
            type="button"
            disabled={inactive}
            title={t('bom.iplLogistics.openFeeding')}
            onClick={() => onOpenFeeding?.(card.modelId)}
            className={`rounded-lg p-1.5 disabled:cursor-not-allowed disabled:opacity-40 ${
              feedingFilled ? 'text-cyan-300 hover:bg-cyan-500/15' : 'text-slate-400 hover:bg-slate-800 hover:text-cyan-200'
            }`}
          >
            <Package className="h-4 w-4" />
          </button>
        </td>
      )}
    </tr>
  )
}
