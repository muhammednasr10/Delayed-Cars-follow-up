import { useEffect, useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import { createBomItem, getBomItemById, updateBomItem } from '../../services/bomService'
import { getStations, getVehicleModels } from '../../services/settingsService'
import type { Station, VehicleModel } from '../../Types/settings'

const emptyForm = {
  part_number: '',
  part_number_new: '',
  alternative_part_no: '',
  part_name_ar: '',
  part_name_en: '',
  part_kind: '',
  quantity: '1',
  vehicle_model_id: '',
  station_id: '',
  station_code_text: '',
  station_category: '',
  model_family: '',
  applicable_models_text: '',
  bom_classification: '',
  qty_by_model_raw: '',
  notes: ''
}

type Props = {
  mode: 'create' | 'edit'
  itemId: string | null
  open: boolean
  defaultVehicleModelId?: string
  onClose: () => void
  onSaved: () => void
}

export function BomFormModal({ mode, itemId, open, defaultVehicleModelId, onClose, onSaved }: Props) {
  const { t } = useLang()
  const isCreate = mode === 'create'
  const [models, setModels] = useState<VehicleModel[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)

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
          setForm({
            ...emptyForm,
            vehicle_model_id: defaultVehicleModelId ?? ''
          })
        })
        .finally(() => setLoading(false))
      return
    }
    if (!itemId) return
    Promise.all([getBomItemById(itemId), getVehicleModels(), getStations()])
      .then(([row, vm, st]) => {
        setModels(vm)
        setStations(st)
        if (row) {
          setForm({
            part_number: row.part_number,
            part_number_new: row.part_number_new ?? '',
            alternative_part_no: row.alternative_part_no ?? '',
            part_name_ar: row.part_name_ar ?? '',
            part_name_en: row.part_name_en ?? '',
            part_kind: row.part_type ?? '',
            quantity: String(row.quantity),
            vehicle_model_id: row.vehicle_model_id ?? '',
            station_id: row.station_id ?? '',
            station_code_text: row.station_code_text ?? '',
            station_category: row.station_category ?? '',
            model_family: row.model_family ?? '',
            applicable_models_text: row.applicable_models_text ?? '',
            bom_classification: row.bom_classification ?? '',
            qty_by_model_raw: row.qty_by_model_raw ?? '',
            notes: row.notes ?? ''
          })
        }
      })
      .catch(e => setError(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false))
  }, [open, itemId, isCreate, defaultVehicleModelId, t])

  async function save() {
    if (!form.part_number.trim()) {
      setError(t('bom.partNumberRequired'))
      return
    }
    if (!form.vehicle_model_id) {
      setError(t('bom.modelRequired'))
      return
    }
    setSaving(true)
    setError('')
    try {
      const qty = Number(form.quantity)
      const quantity = Number.isFinite(qty) && qty > 0 ? qty : 1
      const payload = {
        part_number: form.part_number,
        part_number_new: form.part_number_new,
        alternative_part_no: form.alternative_part_no,
        part_name_ar: form.part_name_ar,
        part_name_en: form.part_name_en,
        part_kind: form.part_kind,
        quantity,
        vehicle_model_id: form.vehicle_model_id,
        station_id: form.station_id || null,
        station_code_text: form.station_code_text,
        station_category: form.station_category,
        model_family: form.model_family,
        applicable_models_text: form.applicable_models_text,
        bom_classification: form.bom_classification,
        qty_by_model_raw: form.qty_by_model_raw,
        notes: form.notes
      }
      if (isCreate) await createBomItem(payload)
      else if (itemId) await updateBomItem(itemId, payload)
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
        <div className="max-h-[65vh] space-y-3 overflow-y-auto text-sm">
          {error && <p className="text-red-300">{error}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('bom.col.part_number')} required>
              <input className={inputCls()} dir="ltr" value={form.part_number} onChange={e => setForm(f => ({ ...f, part_number: e.target.value }))} />
            </Field>
            <Field label={t('bom.model')} required>
              <select className={inputCls()} value={form.vehicle_model_id} onChange={e => setForm(f => ({ ...f, vehicle_model_id: e.target.value }))}>
                <option value="">{t('bom.selectModel')}</option>
                {models.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('bom.col.part_number_new')}>
              <input className={inputCls()} dir="ltr" value={form.part_number_new} onChange={e => setForm(f => ({ ...f, part_number_new: e.target.value }))} />
            </Field>
            <Field label={t('bom.col.alternative_part_no')}>
              <input className={inputCls()} dir="ltr" value={form.alternative_part_no} onChange={e => setForm(f => ({ ...f, alternative_part_no: e.target.value }))} />
            </Field>
            <Field label={t('bom.qty')} required>
              <input className={inputCls()} type="number" min={0.001} step="any" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </Field>
            <Field label={t('bom.col.part_name_ar')}>
              <input className={inputCls()} value={form.part_name_ar} onChange={e => setForm(f => ({ ...f, part_name_ar: e.target.value }))} />
            </Field>
            <Field label={t('bom.col.part_name_en')}>
              <input className={inputCls()} value={form.part_name_en} onChange={e => setForm(f => ({ ...f, part_name_en: e.target.value }))} />
            </Field>
            <Field label={t('bom.col.part_kind')}>
              <input className={inputCls()} value={form.part_kind} onChange={e => setForm(f => ({ ...f, part_kind: e.target.value }))} />
            </Field>
            <Field label={t('bom.col.bom_classification')}>
              <input className={inputCls()} value={form.bom_classification} onChange={e => setForm(f => ({ ...f, bom_classification: e.target.value }))} />
            </Field>
            <Field label={t('bom.col.model_family')}>
              <input className={inputCls()} value={form.model_family} onChange={e => setForm(f => ({ ...f, model_family: e.target.value }))} />
            </Field>
            <Field label={t('bom.col.applicable_models')}>
              <input className={inputCls()} value={form.applicable_models_text} onChange={e => setForm(f => ({ ...f, applicable_models_text: e.target.value }))} />
            </Field>
            <Field label={t('bom.col.station_code')}>
              <input className={inputCls()} value={form.station_code_text} onChange={e => setForm(f => ({ ...f, station_code_text: e.target.value }))} />
            </Field>
            <Field label={t('bom.station')}>
              <select
                className={inputCls()}
                value={form.station_id}
                onChange={e => {
                  const st = stations.find(s => s.id === e.target.value)
                  setForm(f => ({
                    ...f,
                    station_id: e.target.value,
                    station_code_text: st ? String(st.station_number) : f.station_code_text
                  }))
                }}
              >
                <option value="">{t('bom.noStation')}</option>
                {stations.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.station_number} — {s.station_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('bom.col.part_class')}>
              <input className={inputCls()} value={form.station_category} onChange={e => setForm(f => ({ ...f, station_category: e.target.value }))} />
            </Field>
            <div className="sm:col-span-2">
              <Field label={t('bom.col.qty_by_model')}>
                <input className={inputCls()} value={form.qty_by_model_raw} onChange={e => setForm(f => ({ ...f, qty_by_model_raw: e.target.value }))} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label={t('common.notes')}>
                <textarea className={inputCls()} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </Field>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
