import { useEffect, useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import { getBomItemById, saveBomFromModelCards } from '../../services/bomService'
import {
  loadStopperExclusionEntries,
  saveStopperExclusions,
  type StopperExclusionEntry
} from '../../services/bomStopperService'
import { getStations, getVehicleModels } from '../../services/settingsService'
import { BomModelCardsEditor } from './BomModelCardsEditor'
import { BomStopperExclusionsEditor } from './BomStopperExclusionsEditor'
import { cardsFromBomRow, cardsFromBomRows, type ModelCardDraft } from '../../Utils/bomModelCards'
import { DEFAULT_PART_KIND, DEFAULT_SUPPLY_SOURCE } from '../../Utils/bomDefaults'
import { effectiveBomStopperType } from '../../Utils/bomStopper'
import type { BomStopperType } from '../../Types/engineering'
import type { Station, VehicleModel } from '../../Types/settings'

type Props = {
  mode: 'create' | 'edit'
  itemId: string | null
  editItemIds?: string[]
  open: boolean
  defaultVehicleModelId?: string
  onClose: () => void
  onSaved: () => void
}

export function BomFormModal({ mode, itemId, editItemIds, open, defaultVehicleModelId, onClose, onSaved }: Props) {
  const { t } = useLang()
  const isCreate = mode === 'create'
  const [models, setModels] = useState<VehicleModel[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [partNameAr, setPartNameAr] = useState('')
  const [partNameEn, setPartNameEn] = useState('')
  const [notes, setNotes] = useState('')
  const [stopperType, setStopperType] = useState<BomStopperType>('non_stopper')
  const [exclusions, setExclusions] = useState<StopperExclusionEntry[]>([])
  const [familyIds, setFamilyIds] = useState<string[]>([])
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([])
  const [cards, setCards] = useState<ModelCardDraft[]>([])

  useEffect(() => {
    if (!open) return
    setError('')
    setLoading(true)
    const base = Promise.all([getVehicleModels(), getStations()])
    if (isCreate) {
      base
        .then(([vm, st]) => {
          setModels(vm)
          setStations(st)
          setPartNameAr('')
          setPartNameEn('')
          setNotes('')
          setStopperType('non_stopper')
          setExclusions([])
          if (defaultVehicleModelId) {
            const m = vm.find(x => x.id === defaultVehicleModelId)
            if (m) {
              const fids = m.parent_model_id ? [m.parent_model_id] : []
              setFamilyIds(fids)
              setSelectedModelIds([m.id])
              setCards([
                {
                  modelId: m.id,
                  modelName: m.name,
                  part_number: '',
                  part_number_new: '',
                  alternative_part_no: '',
                  qty: '1',
                  part_kind: DEFAULT_PART_KIND,
                  supply_source: DEFAULT_SUPPLY_SOURCE,
                  station_id: '',
                  station_code_text: '',
                  bom_classification: '',
                  station_category: ''
                }
              ])
            } else {
              setFamilyIds([])
              setSelectedModelIds([])
              setCards([])
            }
          } else {
            setFamilyIds([])
            setSelectedModelIds([])
            setCards([])
          }
        })
        .finally(() => setLoading(false))
      return
    }
    if (!itemId) return
    const ids = editItemIds?.length ? editItemIds : [itemId]
    Promise.all([Promise.all(ids.map(id => getBomItemById(id))), getVehicleModels(), getStations()])
      .then(async ([rows, vm, st]) => {
        setModels(vm)
        setStations(st)
        const valid = rows.filter((r): r is NonNullable<typeof r> => Boolean(r))
        const row = valid[0]
        if (row) {
          setPartNameAr(row.part_name_ar ?? '')
          setPartNameEn(row.part_name_en ?? '')
          setNotes(row.notes ?? '')
          setStopperType(effectiveBomStopperType(row))
          const parsed = valid.length > 1 ? cardsFromBomRows(vm, valid) : cardsFromBomRow(vm, row)
          setFamilyIds(parsed.familyIds)
          setSelectedModelIds(parsed.cards.map(c => c.modelId))
          setCards(parsed.cards)
          try {
            const entries = await loadStopperExclusionEntries(row.id)
            setExclusions(entries)
          } catch {
            setExclusions([])
          }
        }
      })
      .catch(e => setError(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false))
  }, [open, itemId, editItemIds, isCreate, defaultVehicleModelId, t])

  async function save() {
    if (!partNameAr.trim() && !partNameEn.trim()) {
      setError(t('bom.partNameRequired'))
      return
    }
    if (cards.length === 0) {
      setError(t('bom.modelRequired'))
      return
    }
    setSaving(true)
    setError('')
    try {
      const savedId = await saveBomFromModelCards(
        isCreate ? undefined : itemId ?? undefined,
        familyIds,
        cards,
        { part_name_ar: partNameAr, part_name_en: partNameEn, notes, stopper_type: stopperType },
        models
      )
      const partIds =
        stopperType === 'non_stopper' ? [] : exclusions.map(e => e.part_id)
      await saveStopperExclusions(savedId, partIds)
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={isCreate ? t('bom.addRow') : t('bom.editRow')}
      icon={isCreate ? <Plus className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 font-bold">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => void save()}
            className="rounded-xl bg-cyan-500 px-4 py-2 font-black text-slate-950 disabled:opacity-50"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </>
      }
    >
      {loading ? (
        <p className="text-sm text-slate-400">{t('common.loading')}</p>
      ) : (
        <div className="space-y-4 text-sm">
          {error && <p className="text-red-300">{error}</p>}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('bom.col.part_name_ar')}>
              <input className={inputCls()} value={partNameAr} onChange={e => setPartNameAr(e.target.value)} />
            </Field>
            <Field label={t('bom.col.part_name_en')}>
              <input className={inputCls()} value={partNameEn} onChange={e => setPartNameEn(e.target.value)} />
            </Field>
          </div>

          <Field label={t('bom.stopperType')}>
            <select
              className={inputCls()}
              value={stopperType}
              onChange={e => {
                const next = e.target.value as BomStopperType
                setStopperType(next)
                if (next === 'non_stopper') setExclusions([])
              }}
            >
              <option value="non_stopper">{t('bom.stopperNone')}</option>
              <option value="line_stopper">{t('bom.stopperLine')}</option>
              <option value="car_stopper">{t('bom.stopperCar')}</option>
            </select>
          </Field>

          <BomStopperExclusionsEditor
            stopperType={stopperType}
            exclusions={exclusions}
            onChange={setExclusions}
          />

          <BomModelCardsEditor
            models={models}
            stations={stations}
            familyIds={familyIds}
            selectedModelIds={selectedModelIds}
            cards={cards}
            onFamilyIdsChange={setFamilyIds}
            onSelectedModelIdsChange={setSelectedModelIds}
            onCardsChange={setCards}
          />

          <Field label={t('common.notes')}>
            <textarea className={inputCls()} rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </Field>
        </div>
      )}
    </Modal>
  )
}
