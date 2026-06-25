import { useEffect, useState } from 'react'
import { Wrench } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import type { EquipmentStatus, EquipmentType, LineEquipment, LineEquipmentInput } from '../../Types/equipment'
import { EQUIPMENT_STATUSES } from '../../Types/equipment'

function emptyForm(type: EquipmentType): LineEquipmentInput {
  return {
    equipmentCode: '',
    equipmentType: type,
    name: '',
    model: '',
    serialNumber: '',
    location: '',
    status: 'active',
    notes: ''
  }
}

type Props = {
  open: boolean
  equipmentType: EquipmentType
  editing: LineEquipment | null
  onClose: () => void
  onSave: (input: LineEquipmentInput) => void
  saving?: boolean
}

export function EquipmentItemFormModal({ open, equipmentType, editing, onClose, onSave, saving }: Props) {
  const { t } = useLang()
  const [form, setForm] = useState<LineEquipmentInput>(emptyForm(equipmentType))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        equipmentCode: editing.equipmentCode,
        equipmentType: editing.equipmentType,
        name: editing.name ?? '',
        model: editing.model ?? '',
        serialNumber: editing.serialNumber ?? '',
        location: editing.location ?? '',
        status: editing.status,
        notes: editing.notes ?? ''
      })
    } else {
      setForm(emptyForm(equipmentType))
    }
    setError('')
  }, [open, editing, equipmentType])

  function validate(): string | null {
    if (!form.equipmentCode.trim()) return t('equipment.errCode')
    return null
  }

  function submit() {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    onSave({
      ...form,
      equipmentCode: form.equipmentCode.trim(),
      name: form.name?.trim() || undefined,
      model: form.model?.trim() || undefined,
      serialNumber: form.serialNumber?.trim() || undefined,
      location: form.location?.trim() || undefined,
      notes: form.notes?.trim() || undefined
    })
  }

  return (
    <Modal
      open={open}
      title={editing ? t('equipment.editItem') : t('equipment.addItem')}
      subtitle={t(`equipment.types.${equipmentType}`)}
      icon={<Wrench className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-xl"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-sky-400 disabled:opacity-60"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

        <Field label={t('equipment.cols.id')} required>
          <input
            className={inputCls()}
            value={form.equipmentCode}
            onChange={e => setForm(f => ({ ...f, equipmentCode: e.target.value.toUpperCase() }))}
            placeholder={t('equipment.codePlaceholder')}
            disabled={!!editing}
          />
        </Field>

        <Field label={t('equipment.cols.name')}>
          <input className={inputCls()} value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('equipment.cols.model')}>
            <input className={inputCls()} value={form.model ?? ''} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
          </Field>
          <Field label={t('equipment.cols.serial')}>
            <input className={inputCls()} value={form.serialNumber ?? ''} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} />
          </Field>
        </div>

        <Field label={t('equipment.cols.location')}>
          <input className={inputCls()} value={form.location ?? ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
        </Field>

        {editing && (
          <Field label={t('equipment.cols.status')}>
            <select
              className={inputCls()}
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as EquipmentStatus }))}
            >
              {EQUIPMENT_STATUSES.map(key => (
                <option key={key} value={key}>
                  {t(`equipment.status.${key}`)}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label={t('common.notes')}>
          <textarea className={`${inputCls()} min-h-[3rem] resize-y`} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </Field>
      </div>
    </Modal>
  )
}
