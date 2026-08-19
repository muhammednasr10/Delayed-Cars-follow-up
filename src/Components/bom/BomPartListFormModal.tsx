import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ClipboardList } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { inputCls } from '../FormField'
import { Modal } from '../Modal'
import { ConfirmDialog } from '../ConfirmDialog'
import {
  findPartMasterByArabicName,
  getT4cIplStationOptions,
  type PartListStationOption,
  type PartMasterHit
} from '../../services/partsService'
import { fetchBomCardsForPartMaster } from '../../services/bomPartMasterService'
import { getStations, getVehicleModels } from '../../services/settingsService'
import { isMostlyArabic, translateArabicPartName, translateEnglishPartName } from '../../Utils/partNameEn'
import { displayBomStationCode, findMasterStationByCode, normalizeBomStationCodeText } from '../../Utils/bomStationCode'
import { DEFAULT_PART_KIND, DEFAULT_SUPPLY_SOURCE } from '../../Utils/bomDefaults'
import { partKindPresetOptions, supplySourcePresetOptions } from '../../Utils/bomPresetOptions'
import { mergeIncomingModelCards, syncModelCardsWithFamilies, type ModelCardDraft } from '../../Utils/bomModelCards'
import type { Station, VehicleModel } from '../../Types/settings'
import { BomPresetSelect } from './BomPresetSelect'
import { PartListAutocomplete } from './PartListAutocomplete'
import { BomModelCardsEditor } from './BomModelCardsEditor'

export type PartListFormState = {
  common_station: string
  part_name_ar: string
  part_name_en: string
  common_name: string
  part_type: string
  common_supply_source: string
}

export type PartListSavePayload = {
  cards: ModelCardDraft[]
  models: VehicleModel[]
  existingPartId?: string
}

type Props = {
  open: boolean
  editId: string | null
  form: PartListFormState
  busy: boolean
  onClose: () => void
  onSave: (payload: PartListSavePayload) => void | Promise<void>
  onChange: (form: PartListFormState) => void
}

function seedCardFromForm(form: PartListFormState, stations: Station[]): Partial<ModelCardDraft> {
  const stationCode = normalizeBomStationCodeText(form.common_station)
  const matched = findMasterStationByCode(stations, stationCode)
  return {
    part_kind: form.part_type || DEFAULT_PART_KIND,
    supply_source: form.common_supply_source || DEFAULT_SUPPLY_SOURCE,
    station_code_text: stationCode,
    station_id: matched?.id ?? '',
    qty: '0'
  }
}

function buildDefaultCards(models: VehicleModel[], form: PartListFormState, stations: Station[]): ModelCardDraft[] {
  const seed = seedCardFromForm(form, stations)
  return syncModelCardsWithFamilies(models, [], [
    {
      modelId: '__seed__',
      modelName: '',
      part_number: '',
      part_number_new: '',
      alternative_part_no: '',
      qty: '0',
      notFitted: false,
      part_kind: seed.part_kind ?? DEFAULT_PART_KIND,
      supply_source: seed.supply_source ?? DEFAULT_SUPPLY_SOURCE,
      station_id: seed.station_id ?? '',
      station_code_text: seed.station_code_text ?? '',
      bom_classification: '',
      station_category: ''
    }
  ])
}

export function BomPartListFormModal({ open, editId, form, busy, onClose, onSave, onChange }: Props) {
  const { t } = useLang()
  const [stationOptions, setStationOptions] = useState<PartListStationOption[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [familyIds, setFamilyIds] = useState<string[]>([])
  const [cards, setCards] = useState<ModelCardDraft[]>([])
  const [cardsLoading, setCardsLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [duplicateHit, setDuplicateHit] = useState<PartMasterHit | null>(null)
  const [confirmDuplicateOpen, setConfirmDuplicateOpen] = useState(false)
  const autoCommon = useRef(true)
  const duplicateCheckRef = useRef<number | null>(null)

  const partKindOptions = useMemo(() => partKindPresetOptions(t), [t])
  const supplyOptions = useMemo(() => supplySourcePresetOptions(t), [t])

  const englishSuggestion = useMemo(() => {
    if (!isMostlyArabic(form.part_name_ar)) return ''
    return translateArabicPartName(form.part_name_ar) || ''
  }, [form.part_name_ar])

  const arabicSuggestion = useMemo(() => {
    if (!form.part_name_en.trim() || isMostlyArabic(form.part_name_en)) return ''
    const translated = translateEnglishPartName(form.part_name_en)
    return translated && isMostlyArabic(translated) ? translated : ''
  }, [form.part_name_en])

  const cardMasterSeed = useMemo(() => seedCardFromForm(form, stations), [form, stations])

  const loadModelCards = useCallback(async (partId: string | null, allModels: VehicleModel[], st: Station[], snapshot: PartListFormState) => {
    if (partId) {
      const loaded = await fetchBomCardsForPartMaster(partId, allModels)
      if (loaded.cards.length > 0) {
        setFamilyIds(loaded.familyIds)
        setCards(loaded.cards)
        return
      }
    }
    setFamilyIds([])
    setCards(buildDefaultCards(allModels, snapshot, st))
  }, [])

  useEffect(() => {
    if (!open) return
    autoCommon.current = !editId
    setDuplicateHit(null)
    setConfirmDuplicateOpen(false)
    setFormError('')
    setCardsLoading(true)
    const snapshot = form

    void Promise.all([getT4cIplStationOptions(), getVehicleModels(), getStations()])
      .then(async ([stationOpts, allModels, st]) => {
        setStationOptions(stationOpts)
        setModels(allModels)
        setStations(st)
        await loadModelCards(editId, allModels, st, snapshot)
      })
      .catch(() => {
        setModels([])
        setStations([])
        setCards([])
      })
      .finally(() => setCardsLoading(false))
    // form snapshot at open — do not reload cards while typing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editId, loadModelCards])

  useEffect(() => {
    if (!open) return
    const term = form.part_name_ar.trim()
    if (duplicateCheckRef.current) window.clearTimeout(duplicateCheckRef.current)
    if (term.length < 2) {
      setDuplicateHit(null)
      return
    }
    duplicateCheckRef.current = window.setTimeout(() => {
      void findPartMasterByArabicName(term, editId)
        .then(setDuplicateHit)
        .catch(() => setDuplicateHit(null))
    }, 250)
    return () => {
      if (duplicateCheckRef.current) window.clearTimeout(duplicateCheckRef.current)
    }
  }, [open, form.part_name_ar, editId])

  const selectOptions = useMemo(() => {
    const map = new Map(stationOptions.map(o => [o.code, o]))
    const current = displayBomStationCode(form.common_station)
    if (current && !map.has(current)) {
      map.set(current, { code: current, label: current })
    }
    return [...map.values()]
  }, [stationOptions, form.common_station])

  function patch(patchValues: Partial<PartListFormState>) {
    onChange({ ...form, ...patchValues })
  }

  function onArabicChange(value: string) {
    const next: PartListFormState = { ...form, part_name_ar: value }
    if (autoCommon.current || !form.common_name.trim() || form.common_name.trim() === form.part_name_ar.trim()) {
      next.common_name = value.trim()
      autoCommon.current = true
    }
    onChange(next)
  }

  function onCommonChange(value: string) {
    autoCommon.current = false
    patch({ common_name: value })
  }

  function applyMasterHit(hit: PartMasterHit) {
    autoCommon.current = false
    onChange({
      ...form,
      part_name_ar: hit.part_name_ar?.trim() || '',
      part_name_en: hit.part_name_en?.trim() || form.part_name_en,
      common_name: hit.common_name?.trim() || hit.part_name_ar?.trim() || '',
      common_station: hit.common_station?.trim() || form.common_station,
      part_type: hit.part_type?.trim() || form.part_type || DEFAULT_PART_KIND,
      common_supply_source: hit.common_supply_source?.trim() || form.common_supply_source || DEFAULT_SUPPLY_SOURCE
    })
    if (models.length > 0) {
      void fetchBomCardsForPartMaster(hit.id, models).then(loaded => {
        if (loaded.cards.length > 0) {
          setFamilyIds(loaded.familyIds)
          setCards(loaded.cards)
        }
      })
    }
  }

  function applyEnglishSuggestion() {
    if (englishSuggestion) patch({ part_name_en: englishSuggestion })
  }

  function applyArabicSuggestion() {
    if (arabicSuggestion) patch({ part_name_ar: arabicSuggestion })
  }

  function validateSave(): string | null {
    if (!form.part_name_ar.trim() && !form.common_name.trim()) {
      return t('bom.partListCommonNameRequired')
    }
    for (const card of cards) {
      if (card.notFitted) continue
      const q = Number(card.qty)
      const hasPn = Boolean(card.part_number.trim())
      const hasQty = Number.isFinite(q) && q > 0
      if (hasPn && !hasQty) return t('bom.partListQtyRequiredWithNumber')
      if (hasQty && !hasPn) return t('bom.partNumberRequiredPerModel')
    }
    return null
  }

  async function commitSave(payload: PartListSavePayload = { cards, models }) {
    const err = validateSave()
    if (err) {
      setFormError(err)
      return
    }
    setFormError('')
    try {
      await onSave(payload)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t('common.error'))
    }
  }

  function handleSaveClick() {
    const err = validateSave()
    if (err) {
      setFormError(err)
      return
    }
    if (duplicateHit && !editId) {
      setConfirmDuplicateOpen(true)
      return
    }
    void commitSave()
  }

  async function confirmUpdateExisting() {
    if (!duplicateHit) {
      await commitSave()
      return
    }
    const err = validateSave()
    if (err) {
      setFormError(err)
      setConfirmDuplicateOpen(false)
      return
    }
    setFormError('')
    try {
      const loaded = await fetchBomCardsForPartMaster(duplicateHit.id, models)
      const merged = mergeIncomingModelCards(cards, loaded.cards)
      await onSave({ cards: merged, models, existingPartId: duplicateHit.id })
      setConfirmDuplicateOpen(false)
    } catch (e) {
      setConfirmDuplicateOpen(false)
      setFormError(e instanceof Error ? e.message : t('common.error'))
    }
  }

  return (
    <>
      <Modal
        open={open}
        title={editId ? t('bom.partListEdit') : t('bom.partListAdd')}
        icon={<ClipboardList className="h-5 w-5" />}
        onClose={onClose}
        maxWidthClass="max-w-5xl"
        footer={
          <>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={busy || cardsLoading}
              onClick={handleSaveClick}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
            >
              {t('common.save')}
            </button>
          </>
        }
      >
        {formError && <p className="mb-3 text-sm text-red-300">{formError}</p>}
        <p className="mb-3 text-xs text-slate-500">{t('bom.partListTranslateHint')}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs text-slate-500">{t('bom.col.common_station')}</span>
            <select
              className={inputCls()}
              value={form.common_station}
              onChange={e => patch({ common_station: e.target.value })}
            >
              <option value="">{t('bom.partListStationOptional')}</option>
              {selectOptions.map(opt => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[10px] text-slate-600">{t('bom.partListStationFromSettings')}</span>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">{t('bom.col.part_name_ar')}</span>
            <PartListAutocomplete
              value={form.part_name_ar}
              excludePartId={editId}
              onChange={onArabicChange}
              onPick={applyMasterHit}
            />
            <span className="mt-1 block text-[10px] text-slate-600">{t('bom.partListAutocompleteHint')}</span>
            {duplicateHit && (
              <p className="mt-1 flex items-start gap-1 text-[10px] font-bold text-amber-400">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                {t('bom.partListDuplicateWarning', { name: form.part_name_ar.trim() })}
              </p>
            )}
            {arabicSuggestion && !form.part_name_ar.trim() && (
              <button
                type="button"
                onClick={applyArabicSuggestion}
                className="mt-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300"
              >
                {t('bom.partListUseSuggestion', { s: arabicSuggestion })}
              </button>
            )}
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">{t('bom.col.part_name_en')}</span>
            <input
              className={inputCls()}
              value={form.part_name_en}
              onChange={e => patch({ part_name_en: e.target.value })}
              dir="ltr"
              placeholder={englishSuggestion || undefined}
            />
            {englishSuggestion && form.part_name_en.trim() !== englishSuggestion && (
              <button
                type="button"
                onClick={applyEnglishSuggestion}
                className="mt-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300"
              >
                {t('bom.partListUseSuggestion', { s: englishSuggestion })}
              </button>
            )}
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs text-slate-500">{t('bom.col.common_name')}</span>
            <input className={inputCls()} value={form.common_name} onChange={e => onCommonChange(e.target.value)} />
            <span className="mt-1 block text-[10px] text-slate-600">{t('bom.partListCommonNameHint')}</span>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">{t('bom.col.part_kind')}</span>
            <BomPresetSelect
              value={form.part_type || DEFAULT_PART_KIND}
              presets={partKindOptions}
              onChange={v => patch({ part_type: v })}
              className="w-full"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">{t('bom.col.common_supply_source')}</span>
            <BomPresetSelect
              value={form.common_supply_source || DEFAULT_SUPPLY_SOURCE}
              presets={supplyOptions}
              onChange={v => patch({ common_supply_source: v })}
              className="w-full"
            />
          </label>
        </div>

        <div className="mt-5 border-t border-slate-800 pt-4">
          <p className="mb-3 text-xs text-slate-500">{t('bom.partListModelNumbersHint')}</p>
          {cardsLoading ? (
            <p className="text-sm text-slate-400">{t('common.loading')}</p>
          ) : (
            <BomModelCardsEditor
              models={models}
              stations={stations}
              familyIds={familyIds}
              cards={cards}
              masterSeed={cardMasterSeed}
              showAllVariants
              onFamilyIdsChange={setFamilyIds}
              onCardsChange={setCards}
            />
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDuplicateOpen}
        title={t('bom.partListDuplicateTitle')}
        message={t('bom.partListDuplicateConfirm', { name: form.part_name_ar.trim() })}
        confirmLabel={t('bom.partListDuplicateUpdate')}
        cancelLabel={t('common.cancel')}
        tone="default"
        busy={busy}
        onConfirm={() => void confirmUpdateExisting()}
        onCancel={() => setConfirmDuplicateOpen(false)}
      />
    </>
  )
}
