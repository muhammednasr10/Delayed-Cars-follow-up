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
  emptyCard,
  familyOptions,
  variantsForFamilies,
  type ModelCardDraft
} from '../../Utils/bomModelCards'
import { DEFAULT_PART_KIND, DEFAULT_SUPPLY_SOURCE } from '../../Utils/bomDefaults'
import type { Station, VehicleModel } from '../../Types/settings'

type Props = {
  models: VehicleModel[]
  stations: Station[]
  familyIds: string[]
  selectedModelIds: string[]
  cards: ModelCardDraft[]
  onFamilyIdsChange: (ids: string[]) => void
  onSelectedModelIdsChange: (ids: string[]) => void
  onCardsChange: (cards: ModelCardDraft[]) => void
}

export function BomModelCardsEditor({
  models,
  stations,
  familyIds,
  selectedModelIds,
  cards,
  onFamilyIdsChange,
  onSelectedModelIdsChange,
  onCardsChange
}: Props) {
  const { t } = useLang()
  const families = useMemo(() => familyOptions(models), [models])
  const variants = useMemo(() => variantsForFamilies(models, familyIds), [models, familyIds])
  const masterStations = useMemo(() => masterStationsForBom(stations), [stations])

  function toggleFamily(id: string, on: boolean) {
    const next = on ? [...familyIds, id] : familyIds.filter(x => x !== id)
    onFamilyIdsChange(next)
    if (!on) {
      const allowed = new Set(variantsForFamilies(models, next).map(m => m.id))
      onSelectedModelIdsChange(selectedModelIds.filter(mid => allowed.has(mid)))
      onCardsChange(cards.filter(c => allowed.has(c.modelId)))
    }
  }

  function toggleModel(model: VehicleModel, on: boolean) {
    if (on) {
      if (selectedModelIds.includes(model.id)) return
      onSelectedModelIdsChange([...selectedModelIds, model.id])
      const seed = cards[0]
      onCardsChange([
        ...cards,
        emptyCard(model, seed
          ? {
              part_number: seed.part_number,
              part_number_new: seed.part_number_new,
              alternative_part_no: seed.alternative_part_no,
              part_kind: seed.part_kind,
              supply_source: seed.supply_source,
              station_id: seed.station_id,
              station_code_text: seed.station_code_text,
              bom_classification: seed.bom_classification,
              station_category: seed.station_category
            }
          : undefined)
      ])
    } else {
      onSelectedModelIdsChange(selectedModelIds.filter(id => id !== model.id))
      onCardsChange(cards.filter(c => c.modelId !== model.id))
    }
  }

  function patchCard(modelId: string, patch: Partial<ModelCardDraft>) {
    onCardsChange(cards.map(c => (c.modelId === modelId ? { ...c, ...patch } : c)))
  }

  function commitStationCode(modelId: string, raw: string) {
    const formatted = normalizeBomStationCodeText(raw)
    const matched = findMasterStationByCode(stations, formatted)
    patchCard(modelId, {
      station_code_text: formatted,
      station_id: matched?.id ?? ''
    })
  }

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

      <div>
        <span className="mb-2 block text-sm font-bold text-slate-300">{t('bom.col.applicable_models')}</span>
        {variants.length === 0 ? (
          <p className="text-xs text-slate-500">{t('bom.selectFamilyFirst')}</p>
        ) : (
          <div className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
            {variants.map(m => (
              <label
                key={m.id}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-bold ${
                  selectedModelIds.includes(m.id)
                    ? 'border-violet-500/50 bg-violet-500/15 text-violet-200'
                    : 'border-slate-700 bg-slate-800 text-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selectedModelIds.includes(m.id)}
                  onChange={e => toggleModel(m, e.target.checked)}
                />
                {m.name}
              </label>
            ))}
          </div>
        )}
      </div>

      {cards.length > 0 && (
        <div className="space-y-3">
          <span className="block text-sm font-bold text-slate-300">{t('bom.modelCards')}</span>
          {cards.map(card => (
            <div
              key={card.modelId}
              className="rounded-xl border border-violet-500/25 bg-slate-900/60 p-4"
            >
              <p className="mb-3 text-sm font-black text-violet-300">{card.modelName}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t('bom.col.part_number')} required>
                  <input
                    className={inputCls()}
                    dir="ltr"
                    value={card.part_number}
                    onChange={e => patchCard(card.modelId, { part_number: e.target.value })}
                  />
                </Field>
                <Field label={t('bom.qtyPerCar')} required>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    className={inputCls()}
                    value={card.qty}
                    onChange={e => patchCard(card.modelId, { qty: e.target.value })}
                  />
                </Field>
                <Field label={t('bom.col.part_kind')}>
                  <select
                    className={inputCls()}
                    value={card.part_kind || DEFAULT_PART_KIND}
                    onChange={e => patchCard(card.modelId, { part_kind: e.target.value })}
                  >
                    <option value="P">{t('bom.partKindPart')}</option>
                    <option value="H/W">{t('bom.partKindHardware')}</option>
                  </select>
                </Field>
                <Field label={t('bom.col.supply_source')}>
                  <select
                    className={inputCls()}
                    value={card.supply_source || DEFAULT_SUPPLY_SOURCE}
                    onChange={e => patchCard(card.modelId, { supply_source: e.target.value })}
                  >
                    <option value="CKD">{t('bom.supplyCkd')}</option>
                    <option value="Local">{t('bom.supplyLocal')}</option>
                  </select>
                </Field>
                <Field label={t('bom.station')}>
                  <select
                    className={inputCls()}
                    value={card.station_id}
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
                </Field>
                <Field label={t('bom.col.station_code')}>
                  <input
                    className={inputCls()}
                    dir="ltr"
                    value={displayBomStationCode(card.station_code_text)}
                    onChange={e => patchCard(card.modelId, { station_code_text: e.target.value })}
                    onBlur={e => commitStationCode(card.modelId, e.target.value)}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
