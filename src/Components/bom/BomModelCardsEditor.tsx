import { useMemo } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { Field, inputCls } from '../FormField'
import { formatStationReferenceCode } from '../../Utils/stationHierarchy'
import {
  displayBomStationCode,
  findMasterStationByCode,
  masterStationsForBom,
  normalizeBomStationCodeText
} from '../../Utils/bomStationCode'
import {
  familyOptions,
  syncModelCardsWithFamilies,
  type ModelCardDraft
} from '../../Utils/bomModelCards'
import { DEFAULT_PART_KIND, DEFAULT_SUPPLY_SOURCE } from '../../Utils/bomDefaults'
import { partKindPresetOptions, supplySourcePresetOptions } from '../../Utils/bomPresetOptions'
import { BomPresetSelect } from './BomPresetSelect'
import type { Station, VehicleModel } from '../../Types/settings'

type Props = {
  models: VehicleModel[]
  stations: Station[]
  familyIds: string[]
  cards: ModelCardDraft[]
  onFamilyIdsChange: (ids: string[]) => void
  onCardsChange: (cards: ModelCardDraft[]) => void
}

export function BomModelCardsEditor({
  models,
  stations,
  familyIds,
  cards,
  onFamilyIdsChange,
  onCardsChange
}: Props) {
  const { t } = useLang()
  const families = useMemo(() => familyOptions(models), [models])
  const masterStations = useMemo(() => masterStationsForBom(stations), [stations])

  function toggleFamily(id: string, on: boolean) {
    const nextFamilies = on ? [...familyIds, id] : familyIds.filter(x => x !== id)
    onFamilyIdsChange(nextFamilies)
    onCardsChange(syncModelCardsWithFamilies(models, nextFamilies, cards))
  }

  function patchCard(modelId: string, patch: Partial<ModelCardDraft>) {
    onCardsChange(cards.map(c => (c.modelId === modelId ? { ...c, ...patch } : c)))
  }

  function patchAllCards(patch: Partial<ModelCardDraft>) {
    onCardsChange(cards.map(c => ({ ...c, ...patch })))
  }

  function commitStationCode(modelId: string, raw: string) {
    const formatted = normalizeBomStationCodeText(raw)
    const matched = findMasterStationByCode(stations, formatted)
    patchCard(modelId, {
      station_code_text: formatted,
      station_id: matched?.id ?? ''
    })
  }

  const sharedPartNumber = cards[0]?.part_number ?? ''

  return (
    <div className="space-y-4">
      <div>
        <span className="mb-2 block text-sm font-bold text-slate-300">{t('bom.col.model_family')}</span>
        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
          {families.length === 0 ? (
            <p className="text-xs text-slate-500">{t('bom.noVariantsInFamily')}</p>
          ) : (
            families.map(f => (
              <label
                key={f.id}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-bold ${
                  familyIds.includes(f.id)
                    ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                    : 'border-slate-700 bg-slate-800 text-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={familyIds.includes(f.id)}
                  onChange={e => toggleFamily(f.id, e.target.checked)}
                />
                {f.name}
              </label>
            ))
          )}
        </div>
      </div>

      {cards.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <span className="block text-sm font-bold text-slate-300">{t('bom.modelCards')}</span>
            <p className="text-xs text-slate-500">{t('bom.modelCardsQtyHint')}</p>
          </div>

          <Field label={t('bom.col.part_number')} required>
            <input
              className={inputCls()}
              dir="ltr"
              value={sharedPartNumber}
              onChange={e => patchAllCards({ part_number: e.target.value })}
            />
          </Field>

          <div className="overflow-x-auto rounded-xl border border-violet-500/25">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-900/80">
                <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-500">
                  <th className="px-3 py-2 text-start">{t('bom.model')}</th>
                  <th className="px-3 py-2 text-center">{t('bom.qtyPerCar')}</th>
                  <th className="px-3 py-2 text-start">{t('bom.col.part_kind')}</th>
                  <th className="px-3 py-2 text-start">{t('bom.col.supply_source')}</th>
                  <th className="px-3 py-2 text-start">{t('bom.station')}</th>
                </tr>
              </thead>
              <tbody>
                {cards.map(card => {
                  const inactive = !Number(card.qty) || Number(card.qty) <= 0
                  return (
                    <tr
                      key={card.modelId}
                      className={`border-b border-slate-800/60 last:border-0 ${inactive ? 'bg-slate-950/40 opacity-70' : 'bg-slate-900/40'}`}
                    >
                      <td className="px-3 py-2 font-bold text-violet-200">{card.modelName}</td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          className={`${inputCls()} mx-auto w-20 py-1 text-center text-sm`}
                          value={card.qty}
                          onChange={e => patchCard(card.modelId, { qty: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <BomPresetSelect
                          value={card.part_kind || DEFAULT_PART_KIND}
                          presets={partKindPresetOptions(t)}
                          disabled={inactive}
                          onChange={v => patchCard(card.modelId, { part_kind: v })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <BomPresetSelect
                          value={card.supply_source || DEFAULT_SUPPLY_SOURCE}
                          presets={supplySourcePresetOptions(t)}
                          disabled={inactive}
                          onChange={v => patchCard(card.modelId, { supply_source: v })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className={`${inputCls()} py-1 text-sm`}
                          value={card.station_id}
                          disabled={inactive}
                          onChange={e => {
                            const st = masterStations.find(s => s.id === e.target.value)
                            patchCard(card.modelId, {
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
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {cards
              .filter(c => Number(c.qty) > 0)
              .slice(0, 1)
              .map(card => (
                <Field key={card.modelId} label={t('bom.col.station_code')}>
                  <input
                    className={inputCls()}
                    dir="ltr"
                    value={displayBomStationCode(card.station_code_text)}
                    onChange={e => patchAllCards({ station_code_text: e.target.value })}
                    onBlur={e => {
                      const formatted = normalizeBomStationCodeText(e.target.value)
                      const matched = findMasterStationByCode(stations, formatted)
                      patchAllCards({
                        station_code_text: formatted,
                        station_id: matched?.id ?? ''
                      })
                    }}
                  />
                </Field>
              ))}
          </div>
        </div>
      )}

      {familyIds.length > 0 && cards.length === 0 && (
        <p className="text-xs text-slate-500">{t('bom.noVariantsInFamily')}</p>
      )}
    </div>
  )
}
