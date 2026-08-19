import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, ScanLine, X } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useFactoryOrgScope } from '../../hooks/useFactoryOrgScope'
import { useEmployees } from '../../hooks/useEmployees'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import { FactoryOrgUnitPicker } from '../FactoryOrgUnitPicker'
import { VehicleModelFamilyPicker } from '../VehicleModelFamilyPicker'
import type { ScratchInput, ScratchRecord, ScratchSeverity } from '../../Types/scratch'
import { getFactoryOrgUnits } from '../../services/factoryOrgService'
import type { FactoryOrgUnit } from '../../Types/factoryOrg'
import type { VehicleModel } from '../../Types/settings'
import { orgPathFromLeaf, orgPathLabel, orgPathLeaf } from '../../Utils/employeeOrgPicker'
import { CHASSIS_VIN_LENGTH, isValidVinLength, normalizeChassisVin } from '../../Utils/vinValidation'

const SEVERITIES: ScratchSeverity[] = ['light', 'medium', 'severe']

type FormState = {
  familyId: string
  variantId: string
  vin: string
  notes: string
  orgPath: string[]
  severity: ScratchSeverity
  recordedAt: string
  willStop: boolean
}

function emptyForm(defaultPath: string[] = []): FormState {
  return {
    familyId: '',
    variantId: '',
    vin: '',
    notes: '',
    orgPath: [...defaultPath],
    severity: 'light',
    recordedAt: new Date().toISOString().slice(0, 10),
    willStop: false
  }
}

type Props = {
  open: boolean
  models: VehicleModel[]
  modelsLoading?: boolean
  editing?: ScratchRecord | null
  onClose: () => void
  onSave: (input: ScratchInput, imageFile: File | null) => void
  saving?: boolean
}

export function ScratchFormModal({ open, models, modelsLoading, editing, onClose, onSave, saving }: Props) {
  const { t } = useLang()
  const { employees } = useEmployees()
  const { defaultOrgPath } = useFactoryOrgScope(employees)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [error, setError] = useState('')
  const [orgUnits, setOrgUnits] = useState<FactoryOrgUnit[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const orgPreview = useMemo(() => orgPathLabel(form.orgPath, orgUnits), [form.orgPath, orgUnits])

  useEffect(() => {
    if (!open) return
    setError('')
    setImageFile(null)
    setImagePreview(null)
    getFactoryOrgUnits()
      .then(units => {
        setOrgUnits(units)
        if (editing) {
          setForm({
            familyId: editing.parentModelId ?? '',
            variantId: editing.vehicleModelId ?? '',
            vin: editing.vin,
            notes: editing.notes ?? '',
            orgPath: orgPathFromLeaf(editing.factoryOrgUnitId, units),
            severity: editing.severity,
            recordedAt: editing.recordedAt.slice(0, 10),
            willStop: editing.willStop
          })
          if (editing.imageUrl) setImagePreview(editing.imageUrl)
        } else {
          setForm(emptyForm(defaultOrgPath))
        }
      })
      .catch(() => {
        setOrgUnits([])
        if (editing) {
          setForm({
            familyId: editing.parentModelId ?? '',
            variantId: editing.vehicleModelId ?? '',
            vin: editing.vin,
            notes: editing.notes ?? '',
            orgPath: [],
            severity: editing.severity,
            recordedAt: editing.recordedAt.slice(0, 10),
            willStop: editing.willStop
          })
          if (editing.imageUrl) setImagePreview(editing.imageUrl)
        } else {
          setForm(emptyForm(defaultOrgPath))
        }
      })
  }, [open, defaultOrgPath, editing])

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  function pickImage(file: File | null) {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    if (!file) {
      setImageFile(null)
      setImagePreview(editing?.imageUrl ?? null)
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
    if (!isValidVinLength(form.vin)) return t('scratches.errVin')
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
        vin: normalizeChassisVin(form.vin),
        parentModelId: form.familyId,
        vehicleModelId: form.variantId,
        bodyArea,
        factoryOrgUnitId,
        severity: form.severity,
        recordedAt: form.recordedAt,
        notes: form.notes?.trim() || undefined,
        willStop: form.willStop
      },
      imageFile
    )
  }

  return (
    <Modal
      open={open}
      title={editing ? t('scratches.formEditTitle') : t('scratches.formTitle')}
      subtitle={t('scratches.formSubtitle')}
      icon={<ScanLine className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-xl"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
          >
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
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}

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
            inputMode="numeric"
            maxLength={CHASSIS_VIN_LENGTH}
            value={form.vin}
            onChange={e =>
              setForm(f => ({ ...f, vin: e.target.value.replace(/\D/g, '').slice(0, CHASSIS_VIN_LENGTH) }))
            }
            placeholder={t('scratches.vinPlaceholder')}
          />
          <p className="mt-1 text-[10px] text-slate-500">{t('scratches.vinHint')}</p>
        </Field>

        <Field label={t('scratches.cols.notes')}>
          <textarea
            className={`${inputCls()} min-h-[5rem] resize-y`}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder={t('scratches.notesPlaceholder')}
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
            <p className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-300">
              {orgPreview}
            </p>
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

        <Field label={t('scratches.willStop.label')} required>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, willStop: true }))}
              className={`rounded-xl border px-3 py-2.5 text-sm font-black ${
                form.willStop
                  ? 'border-red-400/50 bg-red-500/20 text-red-100'
                  : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-500'
              }`}
            >
              {t('scratches.willStop.yes')}
            </button>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, willStop: false }))}
              className={`rounded-xl border px-3 py-2.5 text-sm font-black ${
                !form.willStop
                  ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100'
                  : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-500'
              }`}
            >
              {t('scratches.willStop.no')}
            </button>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">{t('scratches.willStop.hint')}</p>
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
              <button type="button" onClick={() => fileInputRef.current?.click()} className="block">
                <img src={imagePreview} alt="" className="max-h-40 rounded-xl border border-slate-700 object-contain" />
              </button>
              {imageFile && (
                <button
                  type="button"
                  onClick={() => pickImage(null)}
                  className="absolute top-1 rounded-full bg-slate-900/90 p-1 text-slate-300 hover:text-white ltr:right-1 rtl:left-1"
                  aria-label={t('scratches.removeImage')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
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
