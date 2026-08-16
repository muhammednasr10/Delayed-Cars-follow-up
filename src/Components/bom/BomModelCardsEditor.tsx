import { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { masterStationsForBom } from '../../Utils/bomStationCode'
import {
  familyOptions,
  groupModelCardsByFamily,
  modelCardFitUi,
  syncModelCardsWithFamilies,
  type ModelCardDraft
} from '../../Utils/bomModelCards'
import { DEFAULT_PART_KIND, DEFAULT_SUPPLY_SOURCE } from '../../Utils/bomDefaults'
import { partKindPresetOptions, supplySourcePresetOptions } from '../../Utils/bomPresetOptions'
import { BomModelCardRow } from './BomModelCardRow'
import { BomModelFeedingModal } from './BomModelFeedingModal'
import type { Station, VehicleModel } from '../../Types/settings'

type Props = {
  models: VehicleModel[]
  stations: Station[]
  familyIds: string[]
  cards: ModelCardDraft[]
  masterSeed?: Partial<ModelCardDraft>
  showAllVariants?: boolean
  onFamilyIdsChange: (ids: string[]) => void
  onCardsChange: (cards: ModelCardDraft[]) => void
}

function seedCardFromMaster(partial: Partial<ModelCardDraft>): ModelCardDraft {
  return {
    modelId: '__seed__',
    modelName: '',
    part_number: '',
    part_number_new: partial.part_number_new ?? '',
    alternative_part_no: partial.alternative_part_no ?? '',
    qty: '0',
    notFitted: false,
    part_kind: partial.part_kind ?? DEFAULT_PART_KIND,
    supply_source: partial.supply_source ?? DEFAULT_SUPPLY_SOURCE,
    station_id: partial.station_id ?? '',
    station_code_text: partial.station_code_text ?? '',
    bom_classification: partial.bom_classification ?? '',
    station_category: partial.station_category ?? ''
  }
}

export function BomModelCardsEditor({
  models,
  stations,
  familyIds,
  cards,
  masterSeed,
  showAllVariants = false,
  onFamilyIdsChange,
  onCardsChange
}: Props) {
  const { t } = useLang()
  const families = useMemo(() => familyOptions(models), [models])
  const masterStations = useMemo(() => masterStationsForBom(stations), [stations])
  const partKindOptions = useMemo(() => partKindPresetOptions(t), [t])
  const supplyOptions = useMemo(() => supplySourcePresetOptions(t), [t])
  const [openFamilyIds, setOpenFamilyIds] = useState<string[]>([])
  const [feedingModelId, setFeedingModelId] = useState<string | null>(null)

  function cardsForSync(): ModelCardDraft[] {
    if (cards.length > 0) return cards
    if (masterSeed) return [seedCardFromMaster(masterSeed)]
    return []
  }

  const displayedCards = useMemo(
    () => (showAllVariants ? syncModelCardsWithFamilies(models, [], cardsForSync()) : cards),
    [showAllVariants, models, cards, masterSeed]
  )

  useEffect(() => {
    if (!showAllVariants || displayedCards.length === 0) return
    const same =
      displayedCards.length === cards.length && displayedCards.every((c, i) => c.modelId === cards[i]?.modelId)
    if (!same) onCardsChange(displayedCards)
  }, [showAllVariants, displayedCards, cards, onCardsChange])

  const familyGroups = useMemo(
    () => (showAllVariants ? groupModelCardsByFamily(models, displayedCards) : []),
    [showAllVariants, models, displayedCards]
  )
  const feedingCard = displayedCards.find(c => c.modelId === feedingModelId) ?? null

  function toggleFamily(id: string, on: boolean) {
    const nextFamilies = on ? [...familyIds, id] : familyIds.filter(x => x !== id)
    onFamilyIdsChange(nextFamilies)
    if (showAllVariants) return
    onCardsChange(syncModelCardsWithFamilies(models, nextFamilies, cardsForSync()))
  }

  function toggleOpenFamily(id: string) {
    setOpenFamilyIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  function patchCard(modelId: string, patch: Partial<ModelCardDraft>) {
    onCardsChange(displayedCards.map(c => (c.modelId === modelId ? { ...c, ...patch } : c)))
  }

  function renderModelTable(rows: ModelCardDraft[]) {
    return (
      <div className="overflow-x-auto rounded-xl border border-violet-500/25">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-900/80">
            <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-500">
              <th className="px-3 py-2 text-start">{t('bom.model')}</th>
              <th className="px-3 py-2 text-center">{t('bom.iplFitStatus')}</th>
              <th className="px-3 py-2 text-start">{t('bom.col.part_number')}</th>
              <th className="px-3 py-2 text-center">{t('bom.qtyPerCar')}</th>
              <th className="px-3 py-2 text-start">{t('bom.col.part_kind')}</th>
              <th className="px-3 py-2 text-start">{t('bom.col.supply_source')}</th>
              <th className="px-3 py-2 text-start">{t('bom.station')}</th>
              {showAllVariants && <th className="px-2 py-2 text-center">{t('bom.iplLogistics.feedingCol')}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(card => (
              <BomModelCardRow
                key={card.modelId}
                card={card}
                masterStations={masterStations}
                partKindOptions={partKindOptions}
                supplyOptions={supplyOptions}
                showFeedingAction={showAllVariants}
                onPatch={patchCard}
                onOpenFeeding={setFeedingModelId}
              />
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!showAllVariants && (
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
      )}

      {displayedCards.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <span className="block text-sm font-bold text-slate-300">{t('bom.modelCards')}</span>
            <p className="text-xs text-slate-500">
              {t(showAllVariants ? 'bom.modelCardsAllModelsHint' : 'bom.modelCardsPerModelHint')}
            </p>
          </div>

          {showAllVariants ? (
            <div className="space-y-2">
              {familyGroups.map(group => {
                const open = openFamilyIds.includes(group.familyId)
                const fittedCount = group.cards.filter(c => modelCardFitUi(c) === 'fitted').length
                return (
                  <div key={group.familyId} className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
                    <button
                      type="button"
                      onClick={() => toggleOpenFamily(group.familyId)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-start hover:bg-slate-900/70"
                    >
                      <span className="text-sm font-black text-violet-100">
                        {group.familyName || t('bom.otherModels')}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500">
                          {fittedCount}/{group.cards.length}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
                        />
                      </span>
                    </button>
                    {open && <div className="border-t border-slate-800">{renderModelTable(group.cards)}</div>}
                  </div>
                )
              })}
            </div>
          ) : (
            renderModelTable(displayedCards)
          )}
        </div>
      )}

      {!showAllVariants && familyIds.length > 0 && displayedCards.length === 0 && (
        <p className="text-xs text-slate-500">{t('bom.noVariantsInFamily')}</p>
      )}

      <BomModelFeedingModal
        open={Boolean(feedingCard)}
        modelName={feedingCard?.modelName ?? ''}
        value={feedingCard?.feeding}
        onClose={() => setFeedingModelId(null)}
        onApply={feeding => {
          if (!feedingCard) return
          patchCard(feedingCard.modelId, { feeding })
        }}
      />
    </div>
  )
}
