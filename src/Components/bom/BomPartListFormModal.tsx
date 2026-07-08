import { useEffect, useMemo, useRef, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { inputCls } from '../FormField'
import { Modal } from '../Modal'
import { getT4cIplStationOptions, type PartListStationOption } from '../../services/partsService'
import { getVehicleModels } from '../../services/settingsService'
import { isLatinPartName, isMostlyArabic, translateArabicPartName, translateEnglishPartName } from '../../Utils/partNameEn'
import { displayBomStationCode } from '../../Utils/bomStationCode'
import { isAssignableModel } from '../../Utils/vehicleModelHierarchy'
import type { VehicleModel } from '../../Types/settings'

export type PartListFormState = {
  common_station: string
  part_name_ar: string
  part_name_en: string
  common_name: string
  model_names: string[]
}

type Props = {
  open: boolean
  editId: string | null
  form: PartListFormState
  busy: boolean
  defaultModelNames?: string[]
  onClose: () => void
  onSave: () => void
  onChange: (form: PartListFormState) => void
}

export function BomPartListFormModal({ open, editId, form, busy, defaultModelNames, onClose, onSave, onChange }: Props) {
  const { t } = useLang()
  const [stationOptions, setStationOptions] = useState<PartListStationOption[]>([])
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>([])
  const autoAr = useRef(false)
  const autoEn = useRef(false)

  useEffect(() => {
    if (!open) return
    autoAr.current = false
    autoEn.current = false
    void getT4cIplStationOptions()
      .then(setStationOptions)
      .catch(() => setStationOptions([]))
    void getVehicleModels()
      .then(setVehicleModels)
      .catch(() => setVehicleModels([]))
  }, [open])

  const assignableModels = useMemo(
    () => vehicleModels.filter(isAssignableModel).sort((a, b) => a.name.localeCompare(b.name)),
    [vehicleModels]
  )

  const allModelNames = useMemo(
    () => defaultModelNames ?? assignableModels.map(m => m.name),
    [defaultModelNames, assignableModels]
  )

  const selectedModels = useMemo(() => new Set(form.model_names), [form.model_names])

  const selectOptions = useMemo(() => {
    const map = new Map(stationOptions.map(o => [o.code, o]))
    const current = displayBomStationCode(form.common_station)
    if (current && !map.has(current)) {
      map.set(current, { code: current, label: current })
    }
    return [...map.values()]
  }, [stationOptions, form.common_station])

  function patch(patch: Partial<PartListFormState>) {
    onChange({ ...form, ...patch })
  }

  function toggleModel(modelName: string, checked: boolean) {
    const next = new Set(form.model_names)
    if (checked) next.add(modelName)
    else next.delete(modelName)
    patch({ model_names: [...next].sort((a, b) => a.localeCompare(b)) })
  }

  function onArabicChange(value: string) {
    const next: PartListFormState = { ...form, part_name_ar: value }
    if (!form.part_name_en.trim() || autoEn.current) {
      if (isMostlyArabic(value)) {
        const translated = translateArabicPartName(value)
        if (translated) {
          next.part_name_en = translated
          autoEn.current = true
        }
      } else if (isLatinPartName(value)) {
        next.part_name_en = value
        autoEn.current = true
      }
    }
    if (!form.common_name.trim() && value.trim()) {
      next.common_name = value.trim()
    }
    onChange(next)
  }

  function onEnglishChange(value: string) {
    const next: PartListFormState = { ...form, part_name_en: value }
    if (!form.part_name_ar.trim() || autoAr.current) {
      if (isLatinPartName(value)) {
        const translated = translateEnglishPartName(value)
        if (translated && isMostlyArabic(translated)) {
          next.part_name_ar = translated
          autoAr.current = true
        } else if (!isMostlyArabic(value)) {
          next.part_name_ar = value
          autoAr.current = true
        }
      }
    }
    if (!form.common_name.trim() && value.trim()) {
      next.common_name = value.trim()
    }
    onChange(next)
  }

  function onArabicBlur() {
    if (form.part_name_ar.trim() && (!form.part_name_en.trim() || autoEn.current)) {
      onArabicChange(form.part_name_ar)
    }
  }

  function onEnglishBlur() {
    if (form.part_name_en.trim() && (!form.part_name_ar.trim() || autoAr.current)) {
      onEnglishChange(form.part_name_en)
    }
  }

  return (
    <Modal
      open={open}
      title={editId ? t('bom.partListEdit') : t('bom.partListAdd')}
      icon={<ClipboardList className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
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
            disabled={busy}
            onClick={onSave}
            className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
          >
            {t('common.save')}
          </button>
        </>
      }
    >
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
          <input
            className={inputCls()}
            value={form.part_name_ar}
            onChange={e => onArabicChange(e.target.value)}
            onBlur={onArabicBlur}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">{t('bom.col.part_name_en')}</span>
          <input
            className={inputCls()}
            value={form.part_name_en}
            onChange={e => onEnglishChange(e.target.value)}
            onBlur={onEnglishBlur}
            dir="ltr"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs text-slate-500">{t('bom.col.common_name')}</span>
          <input className={inputCls()} value={form.common_name} onChange={e => patch({ common_name: e.target.value })} />
        </label>
        <div className="sm:col-span-2">
          <span className="mb-2 block text-xs text-slate-500">{t('bom.col.used_in_models')}</span>
          {assignableModels.length === 0 ? (
            <p className="text-xs text-slate-500">{t('common.loading')}</p>
          ) : (
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/50 p-3">
              {assignableModels.map(m => (
                <label
                  key={m.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-200 hover:bg-slate-950/40"
                >
                  <input
                    type="checkbox"
                    className="rounded border-slate-600"
                    checked={selectedModels.has(m.name)}
                    onChange={e => toggleModel(m.name, e.target.checked)}
                  />
                  <span className="font-bold text-violet-200">{m.name}</span>
                </label>
              ))}
            </div>
          )}
          <span className="mt-1 block text-[10px] text-slate-600">{t('bom.partListModelsHint')}</span>
        </div>
      </div>
    </Modal>
  )
}
