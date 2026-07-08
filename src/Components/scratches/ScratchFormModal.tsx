import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, ScanLine, X } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useFactoryOrgScope } from '../../hooks/useFactoryOrgScope'
import { useEmployees } from '../../hooks/useEmployees'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import { FactoryOrgUnitPicker } from '../FactoryOrgUnitPicker'
import { VehicleModelFamilyPicker } from '../VehicleModelFamilyPicker'
import type { ScratchInput, ScratchSeverity } from '../../Types/scratch'
import { getFactoryOrgUnits } from '../../services/factoryOrgService'
import type { FactoryOrgUnit } from '../../Types/factoryOrg'
import type { VehicleModel } from '../../Types/settings'
import { orgPathLabel, orgPathLeaf } from '../../Utils/employeeOrgPicker'

const SEVERITIES: ScratchSeverity[] = ['light', 'medium', 'severe']

type FormState = {
  familyId: string
  variantId: string
  vin: string
  notes: string
  orgPath: string[]
  severity: ScratchSeverity
  recordedAt: string
}

function emptyForm(defaultPath: string[] = []): FormState {
  return {
    familyId: '',
    variantId: '',
    vin: '',
    notes: '',
    orgPath: [...defaultPath],
    severity: 'light',
    recordedAt: new Date().toISOString().slice(0, 10)
  }
}

function countDigits(value: string): number {
  return (value.match(/\d/g) ?? []).length
}

type Props = {
  open: boolean
  models: VehicleModel[]
  modelsLoading?: boolean
  onClose: () => void
  onSave: (input: ScratchInput, imageFile: File | null) => void
  saving?: boolean
}

export function ScratchFormModal({ open, models, modelsLoading, onClose, onSave, saving }: Props) {
  const { t } = useLang()
  const { employees } = useEmployees()
  const { defaultOrgPath } = useFactoryOrgScope(employees)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [error, setError] = useState('')
  const [orgUnits, setOrgUnits] = useState<FactoryOrgUnit[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const orgPreview = useMemo(
    () => orgPathLabel(form.orgPath, orgUnits),
    [form.orgPath, orgUnits]
  )

  useEffect(() => {
    if (!open) return
    setForm(emptyForm(defaultOrgPath))
    setError('')
    setImageFile(null)
    setImagePreview(null)
    getFactoryOrgUnits()
      .then(setOrgUnits)
      .catch(() => setOrgUnits([]))
  }, [open, defaultOrgPath])

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  function pickImage(file: File | null) {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    if (!file) {
      setImageFile(null)
      setImagePreview(null)
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t('scratches.errImageSize'))
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type.toLowerCase())) {
      setError(t('scratches.errImageType'))
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError('')
  }

  function validate(): string | null {
    if (!form.familyId) return t('scratches.errParentModel')
    if (!form.variantId) return t('scratches.errVariant')
    if (countDigits(form.vin.trim()) < 4) return t('scratches.errVin')
    if (!orgPathLeaf(form.orgPath)) return t('scratches.errArea')
    if (!form.recordedAt) return t('scratches.errDate')
    return null
  }

  function submit() {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    const factoryOrgUnitId = orgPathLeaf(form.orgPath)!
    const bodyArea = orgPathLabel(form.orgPath, orgUnits) ?? ''
    onSave(
      {
        vin: form.vin.trim().toUpperCase(),
        parentModelId: form.familyId,
        vehicleModelId: form.variantId,
        bodyArea,
        factoryOrgUnitId,
        severity: form.severity,
        recordedAt: form.recordedAt,
        notes: form.notes?.trim() || undefined
      },
      imageFile
    )
  }

  return (
    <Modal
      open={open}
      title={t('scratches.formTitle')}
      subtitle={t('scratches.formSubtitle')}
      icon={<ScanLine className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-xl"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={saving || modelsLoading}
            onClick={submit}
            className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-black text-white hover:bg-rose-400 disabled:opacity-60"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

        <VehicleModelFamilyPicker
          models={models}
          familyId={form.familyId}
          variantId={form.variantId}
          loading={modelsLoading}
          onFamilyChange={familyId => setForm(f => ({ ...f, familyId, variantId: '' }))}
          onVariantChange={variantId => setForm(f => ({ ...f, variantId }))}
        />

        <Field label={t('scratches.cols.vin')} required>
          <input
            className={inputCls()}
            dir="ltr"
            value={form.vin}
            onChange={e => setForm(f => ({ ...f, vin: e.target.value }))}
            placeholder={t('scratches.vinPlaceholder')}
          />
        </Field>

        <Field label={t('common.notes')}>
          <textarea
            className={`${inputCls()} min-h-[5rem] resize-y`}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
        </Field>

        <div className="space-y-2">
          <p className="text-sm font-bold text-slate-300">{t('scratches.cols.orgUnit')} *</p>
          {orgUnits.length === 0 ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              {t('scratches.areaOrgEmpty')}
            </p>
          ) : (
            <FactoryOrgUnitPicker
              units={orgUnits}
              path={form.orgPath}
              onChange={orgPath => setForm(f => ({ ...f, orgPath }))}
            />
          )}
          {orgPreview && (
            <p className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-300">{orgPreview}</p>
          )}
        </div>

        <Field label={t('scratches.cols.severity')} required>
          <select
            className={inputCls()}
            value={form.severity}
            onChange={e => setForm(f => ({ ...f, severity: e.target.value as ScratchSeverity }))}
          >
            {SEVERITIES.map(key => (
              <option key={key} value={key}>
                {t(`scratches.severity.${key}`)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('scratches.cols.date')} required>
          <input
            type="date"
            className={inputCls()}
            value={form.recordedAt}
            onChange={e => setForm(f => ({ ...f, recordedAt: e.target.value }))}
          />
        </Field>

        <Field label={t('scratches.cols.image')}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={e => pickImage(e.target.files?.[0] ?? null)}
          />
          {imagePreview ? (
            <div className="relative inline-block">
              <img src={imagePreview} alt="" className="max-h-40 rounded-xl border border-slate-700 object-contain" />
              <button
                type="button"
                onClick={() => pickImage(null)}
                className="absolute top-1 rounded-full bg-slate-900/90 p-1 text-slate-300 hover:text-white ltr:right-1 rtl:left-1"
                aria-label={t('scratches.removeImage')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 bg-slate-900/40 px-4 py-6 text-sm font-bold text-slate-400 hover:border-rose-500/50 hover:text-rose-200"
            >
              <ImagePlus className="h-5 w-5" />
              {t('scratches.uploadImage')}
            </button>
          )}
        </Field>
      </div>
    </Modal>
  )
}
