import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, PackageX, X } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import { IplPartAutocomplete } from './IplPartAutocomplete'
import { MpLookupCreatableSelect } from '../MpLookupCreatableSelect'
import { EmployeeAutocomplete } from '../EmployeeAutocomplete'
import { useDamagedPartsLookups } from '../../hooks/useDamagedPartsLookups'
import type { DamagedPartInput, DamagedPartRecord } from '../../Types/damagedPart'
import type { Employee } from '../../Types/employee'
import type { VehicleModel } from '../../Types/settings'

import type { ResponsibleDepartment } from '../../Types/enums'

const CAUSING_DEPARTMENTS: ResponsibleDepartment[] = ['warehouse', 'purchasing', 'production', 'quality', 'supplier', 'management']

type FormState = {
  vehicleModelId: string
  partId: string
  partNumber: string
  partName: string | null
  quantity: string
  damageReason: string
  finalDecision: string
  isRepairable: boolean
  causedByEmployeeId: string
  causingDepartment: string
  notes: string
  reportedAt: string
}

function emptyForm(): FormState {
  return {
    vehicleModelId: '',
    partId: '',
    partNumber: '',
    partName: null,
    quantity: '1',
    damageReason: '',
    finalDecision: 'pending',
    isRepairable: false,
    causedByEmployeeId: '',
    causingDepartment: '',
    notes: '',
    reportedAt: new Date().toISOString().slice(0, 10)
  }
}

function formFromRecord(row: DamagedPartRecord): FormState {
  return {
    vehicleModelId: row.vehicleModelId,
    partId: row.partId,
    partNumber: row.partNumber,
    partName: row.partName,
    quantity: String(row.quantity),
    damageReason: row.damageReason,
    finalDecision: row.finalDecision,
    isRepairable: row.isRepairable,
    causedByEmployeeId: row.causedByEmployeeId ?? '',
    causingDepartment: row.causingDepartment ?? '',
    notes: row.notes ?? '',
    reportedAt: row.reportedAt
  }
}

type Props = {
  open: boolean
  models: VehicleModel[]
  employees: Employee[]
  editing: DamagedPartRecord | null
  onClose: () => void
  onSave: (input: DamagedPartInput, imageFile: File | null, editingId?: string) => void
  saving?: boolean
}

export function DamagedPartFormModal({ open, models, employees, editing, onClose, onSave, saving }: Props) {
  const { t } = useLang()
  const { reasons, decisions, loading: lookupsLoading, addReason, addDecision } = useDamagedPartsLookups()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const familyModels = useMemo(
    () => models.filter(m => m.is_active && m.model_kind === 'family').sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    [models]
  )

  const selectedModel = familyModels.find(m => m.id === form.vehicleModelId)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm(formFromRecord(editing))
      setExistingImageUrl(editing.imageUrl)
    } else {
      setForm(emptyForm())
      setExistingImageUrl(null)
    }
    setError('')
    setImageFile(null)
    setImagePreview(null)
  }, [open, editing])

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  useEffect(() => {
    if (!open || lookupsLoading || editing) return
    setForm(prev => ({
      ...prev,
      finalDecision: prev.finalDecision || decisions[0]?.code || 'pending'
    }))
  }, [open, lookupsLoading, decisions, editing])

  function pickImage(file: File | null) {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    if (!file) {
      setImageFile(null)
      setImagePreview(null)
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t('damagedParts.errImageSize'))
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type.toLowerCase())) {
      setError(t('damagedParts.errImageType'))
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError('')
  }

  function validate(): string | null {
    if (!form.vehicleModelId) return t('damagedParts.errModel')
    if (!form.partId || !form.partNumber.trim()) return t('damagedParts.errPart')
    const qty = Number(form.quantity)
    if (!Number.isFinite(qty) || qty <= 0) return t('damagedParts.errQty')
    if (!form.damageReason) return t('damagedParts.errReason')
    if (!form.finalDecision) return t('damagedParts.errDecision')
    if (!form.causedByEmployeeId) return t('damagedParts.errCauser')
    if (!form.causingDepartment) return t('damagedParts.errCausingDepartment')
    if (!form.reportedAt) return t('damagedParts.errDate')
    return null
  }

  function submit() {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    onSave(
      {
        vehicleModelId: form.vehicleModelId,
        partId: form.partId,
        partNumber: form.partNumber.trim(),
        partName: form.partName,
        quantity: Number(form.quantity),
        damageReason: form.damageReason,
        finalDecision: form.finalDecision,
        isRepairable: form.isRepairable,
        causedByEmployeeId: form.causedByEmployeeId,
        causingDepartment: form.causingDepartment,
        imagePath: editing?.imagePath ?? null,
        notes: form.notes.trim() || null,
        reportedAt: form.reportedAt
      },
      imageFile,
      editing?.id
    )
  }

  const previewSrc = imagePreview ?? existingImageUrl

  return (
    <Modal
      open={open}
      title={editing ? t('damagedParts.editTitle') : t('damagedParts.formTitle')}
      subtitle={t('damagedParts.formSubtitle')}
      icon={<PackageX className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-xl"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={saving || lookupsLoading}
            onClick={submit}
            className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-orange-400 disabled:opacity-60"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

        <Field label={t('damagedParts.cols.model')} required>
          <select
            className={inputCls()}
            value={form.vehicleModelId}
            onChange={e =>
              setForm(prev => ({
                ...prev,
                vehicleModelId: e.target.value,
                partId: '',
                partNumber: '',
                partName: null
              }))
            }
          >
            <option value="">{t('damagedParts.selectModel')}</option>
            {familyModels.map(model => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('damagedParts.cols.part')} required>
          <IplPartAutocomplete
            modelId={form.vehicleModelId}
            modelName={selectedModel?.name ?? ''}
            partNumber={form.partNumber}
            partName={form.partName}
            onPick={hit =>
              setForm(prev => ({
                ...prev,
                partId: hit.partId,
                partNumber: hit.partNumber,
                partName: hit.partName
              }))
            }
            onClear={() =>
              setForm(prev => ({
                ...prev,
                partId: '',
                partName: null
              }))
            }
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('damagedParts.cols.quantity')} required>
            <input
              type="number"
              min={0.001}
              step="any"
              className={inputCls()}
              value={form.quantity}
              onChange={e => setForm(prev => ({ ...prev, quantity: e.target.value }))}
            />
          </Field>
          <Field label={t('damagedParts.cols.date')} required>
            <input
              type="date"
              className={inputCls()}
              value={form.reportedAt}
              onChange={e => setForm(prev => ({ ...prev, reportedAt: e.target.value }))}
            />
          </Field>
        </div>

        <Field label={t('damagedParts.cols.causer')} required>
          <EmployeeAutocomplete
            employees={employees}
            value={form.causedByEmployeeId}
            onChange={id => {
              const employee = employees.find(e => e.id === id)
              setForm(prev => ({
                ...prev,
                causedByEmployeeId: id,
                causingDepartment: employee?.department ?? prev.causingDepartment
              }))
            }}
            placeholder={t('damagedParts.selectCauser')}
          />
        </Field>

        <Field label={t('damagedParts.cols.causingDepartment')} required>
          <select
            className={inputCls()}
            value={form.causingDepartment}
            onChange={e => setForm(prev => ({ ...prev, causingDepartment: e.target.value }))}
          >
            <option value="">{t('damagedParts.selectCausingDepartment')}</option>
            {CAUSING_DEPARTMENTS.map(dept => (
              <option key={dept} value={dept}>
                {t(`department.${dept}`)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('damagedParts.cols.reason')} required>
          <MpLookupCreatableSelect
            options={reasons}
            value={form.damageReason}
            onChange={code => setForm(prev => ({ ...prev, damageReason: code }))}
            onCreate={addReason}
            addLabel={t('damagedParts.addReasonOption')}
            className={inputCls()}
            disabled={lookupsLoading}
            allowEmpty
            emptyLabel={t('damagedParts.selectReason')}
          />
        </Field>

        <Field label={t('damagedParts.cols.repairable')}>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-600 accent-orange-500"
              checked={form.isRepairable}
              onChange={e => setForm(prev => ({ ...prev, isRepairable: e.target.checked }))}
            />
            <span className="text-sm font-bold text-slate-200">{t('damagedParts.repairableHint')}</span>
          </label>
        </Field>

        <Field label={t('damagedParts.cols.finalDecision')} required>
          <MpLookupCreatableSelect
            options={decisions}
            value={form.finalDecision}
            onChange={code => setForm(prev => ({ ...prev, finalDecision: code }))}
            onCreate={addDecision}
            addLabel={t('damagedParts.addDecisionOption')}
            className={inputCls()}
            disabled={lookupsLoading}
          />
        </Field>

        <Field label={t('damagedParts.cols.image')}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={e => pickImage(e.target.files?.[0] ?? null)}
          />
          {previewSrc ? (
            <div className="relative inline-block">
              <img src={previewSrc} alt="" className="max-h-40 rounded-xl border border-slate-700 object-contain" />
              <button
                type="button"
                onClick={() => {
                  pickImage(null)
                  setExistingImageUrl(null)
                }}
                className="absolute top-1 rounded-full bg-slate-900/90 p-1 text-slate-300 hover:text-white ltr:right-1 rtl:left-1"
                aria-label={t('damagedParts.removeImage')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 bg-slate-900/40 px-4 py-6 text-sm font-bold text-slate-400 hover:border-orange-500/50 hover:text-orange-200"
            >
              <ImagePlus className="h-5 w-5" />
              {t('damagedParts.uploadImage')}
            </button>
          )}
        </Field>

        <Field label={t('common.notes')}>
          <textarea
            className={`${inputCls()} min-h-[4.5rem] resize-y`}
            value={form.notes}
            onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
          />
        </Field>
      </div>
    </Modal>
  )
}

