import { useEffect, useRef, useState } from 'react'
import { BadgeCheck } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import { VehicleModelMultiSelect } from '../VehicleModelMultiSelect'
import { StationNameAutocomplete } from '../StationNameAutocomplete'
import { MpLookupCreatableSelect } from '../MpLookupCreatableSelect'
import { getWorkerLinesForStationAndModels } from '../../services/stationOperationsService'
import { createQnCategoryOption } from '../../services/qualityNotesLookupService'
import { formatStationReferenceCode } from '../../Utils/stationHierarchy'
import type { QualityNoteInput, QualityNoteRecord, QualityNoteSeverity } from '../../Types/qualityNote'
import type { MpLookupOption } from '../../Types/mpLookup'
import type { Station, VehicleModel } from '../../Types/settings'

const SEVERITIES: QualityNoteSeverity[] = ['low', 'medium', 'high', 'critical']

type FormState = {
  vehicleModelIds: string[]
  stationId: string
  workerLineStationId: string
  category: string
  severity: QualityNoteSeverity
  notedAt: string
  description: string
  vehicleCount: number
  specifyVins: boolean
  vins: string[]
}

function recordToForm(row: QualityNoteRecord): FormState {
  const hasVins = row.vins.length > 0
  return {
    vehicleModelIds: [...row.vehicleModelIds],
    stationId: row.stationId ?? '',
    workerLineStationId: row.workerLineStationId ?? '',
    category: row.category,
    severity: row.severity,
    notedAt: row.notedAt.slice(0, 10),
    description: row.description,
    vehicleCount: row.vehicleCount,
    specifyVins: hasVins,
    vins: hasVins ? [...row.vins] : ['']
  }
}

function emptyForm(): FormState {
  return {
    vehicleModelIds: [],
    stationId: '',
    workerLineStationId: '',
    category: '',
    severity: 'medium',
    notedAt: new Date().toISOString().slice(0, 10),
    description: '',
    vehicleCount: 1,
    specifyVins: false,
    vins: ['']
  }
}

type Props = {
  open: boolean
  onClose: () => void
  onSave: (input: QualityNoteInput) => void
  saving?: boolean
  stations: Station[]
  models: VehicleModel[]
  categories: MpLookupOption[]
  onCategoriesChange: (options: MpLookupOption[]) => void
  editing?: QualityNoteRecord | null
}

export function QualityNoteFormModal({
  open,
  onClose,
  onSave,
  saving,
  stations,
  models,
  categories,
  onCategoriesChange,
  editing = null
}: Props) {
  const { t } = useLang()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [stationQuery, setStationQuery] = useState('')
  const [error, setError] = useState('')
  const [workerLines, setWorkerLines] = useState<{ stationId: string; displayCode: string }[]>([])
  const [workerLinesLoading, setWorkerLinesLoading] = useState(false)
  const wasOpen = useRef(false)

  useEffect(() => {
    if (open && !wasOpen.current) {
      if (editing) {
        setForm(recordToForm(editing))
        setStationQuery(editing.stationCode ? formatStationReferenceCode(editing.stationCode) : '')
      } else {
        const defaults = emptyForm()
        if (categories.length > 0) defaults.category = categories[0].code
        setForm(defaults)
        setStationQuery('')
      }
      setError('')
      setWorkerLines([])
    }
    wasOpen.current = open
  }, [open, categories, editing])

  useEffect(() => {
    if (!open || categories.length === 0) return
    setForm(f => (f.category ? f : { ...f, category: categories[0].code }))
  }, [open, categories])

  useEffect(() => {
    if (!open || !form.stationId || form.vehicleModelIds.length === 0) {
      setWorkerLines([])
      return
    }
    let cancelled = false
    setWorkerLinesLoading(true)
    getWorkerLinesForStationAndModels(form.stationId, form.vehicleModelIds)
      .then(list => {
        if (!cancelled) setWorkerLines(list)
      })
      .catch(() => {
        if (!cancelled) setWorkerLines([])
      })
      .finally(() => {
        if (!cancelled) setWorkerLinesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, form.stationId, form.vehicleModelIds])

  useEffect(() => {
    if (!form.workerLineStationId) return
    if (!workerLines.some(w => w.stationId === form.workerLineStationId)) {
      setForm(f => ({ ...f, workerLineStationId: '' }))
    }
  }, [workerLines, form.workerLineStationId])

  useEffect(() => {
    const n = Math.max(1, form.vehicleCount)
    if (!form.specifyVins) return
    setForm(f => {
      const next = [...f.vins]
      while (next.length < n) next.push('')
      if (next.length > n) next.length = n
      return { ...f, vins: next }
    })
  }, [form.vehicleCount, form.specifyVins])

  function setVehicleCount(count: number) {
    const n = Math.max(1, Math.min(99, count || 1))
    setForm(f => ({ ...f, vehicleCount: n }))
  }

  function validate(): string | null {
    if (form.vehicleModelIds.length === 0) return t('qualityNotes.errModel')
    if (!form.stationId) return t('qualityNotes.errStation')
    if (!form.category) return t('qualityNotes.errCategory')
    if (!form.description.trim()) return t('qualityNotes.errDescription')
    if (!form.notedAt) return t('qualityNotes.errDate')
    if (form.vehicleCount < 1) return t('qualityNotes.errVehicleCount')
    if (form.specifyVins) {
      if (form.vins.length !== form.vehicleCount) return t('qualityNotes.errVinCount')
      for (const vin of form.vins) {
        if (vin.trim().length < 4) return t('qualityNotes.errVin')
      }
    }
    return null
  }

  function submit() {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    onSave({
      vehicleModelIds: form.vehicleModelIds,
      stationId: form.stationId,
      workerLineStationId: form.workerLineStationId || null,
      category: form.category,
      severity: form.severity,
      description: form.description.trim(),
      vehicleCount: form.vehicleCount,
      vins: form.specifyVins ? form.vins.map(v => v.trim().toUpperCase()) : [],
      notedAt: form.notedAt
    })
  }

  async function onCreateCategory(labelAr: string) {
    const opt = await createQnCategoryOption(labelAr)
    onCategoriesChange([...categories, opt])
    return opt
  }

  return (
    <Modal
      open={open}
      title={editing ? t('qualityNotes.formEditTitle') : t('qualityNotes.formTitle')}
      subtitle={t('qualityNotes.formSubtitle')}
      icon={<BadgeCheck className="h-5 w-5" />}
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
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-white hover:bg-emerald-400 disabled:opacity-60"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

        <Field label={t('qualityNotes.cols.model')} required>
          <VehicleModelMultiSelect
            models={models}
            value={form.vehicleModelIds}
            onChange={vehicleModelIds => setForm(f => ({ ...f, vehicleModelIds, workerLineStationId: '' }))}
          />
        </Field>

        <Field label={t('qualityNotes.cols.station')} required>
          <StationNameAutocomplete
            value={stationQuery}
            onChange={setStationQuery}
            stations={stations}
            placeholder={t('qualityNotes.stationSearchPh')}
            onPick={station => {
              setForm(f => ({ ...f, stationId: station.id, workerLineStationId: '' }))
            }}
          />
        </Field>

        <Field label={t('qualityNotes.cols.workerLine')}>
          {form.vehicleModelIds.length === 0 || !form.stationId ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-500">
              {t('qualityNotes.workerNeedsModelStation')}
            </p>
          ) : workerLinesLoading ? (
            <p className="text-sm text-slate-500">{t('common.loading')}</p>
          ) : workerLines.length === 0 ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              {t('qualityNotes.noLineBalancingWorkerLines')}
            </p>
          ) : (
            <select
              className={`${inputCls()} font-mono`}
              dir="ltr"
              value={form.workerLineStationId}
              onChange={e => setForm(f => ({ ...f, workerLineStationId: e.target.value }))}
            >
              <option value="">—</option>
              {workerLines.map(w => (
                <option key={w.stationId} value={w.stationId}>
                  {w.displayCode}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label={t('qualityNotes.cols.category')} required>
          <MpLookupCreatableSelect
            options={categories}
            value={form.category}
            onChange={category => setForm(f => ({ ...f, category }))}
            onCreate={async label => onCreateCategory(label)}
            addLabel={t('qualityNotes.addCategoryOption')}
          />
        </Field>

        <Field label={t('qualityNotes.cols.description')} required>
          <textarea
            className={`${inputCls()} min-h-[5rem] resize-y`}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder={t('qualityNotes.descriptionPh')}
          />
        </Field>

        <Field label={t('qualityNotes.cols.severity')} required>
          <select
            className={inputCls()}
            value={form.severity}
            onChange={e => setForm(f => ({ ...f, severity: e.target.value as QualityNoteSeverity }))}
          >
            {SEVERITIES.map(key => (
              <option key={key} value={key}>
                {t(`qualityNotes.severity.${key}`)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('qualityNotes.cols.vehicleCount')} required>
          <input
            type="number"
            min={1}
            max={99}
            className={inputCls()}
            value={form.vehicleCount}
            onChange={e => setVehicleCount(Number(e.target.value))}
          />
        </Field>

        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500"
            checked={form.specifyVins}
            onChange={e =>
              setForm(f => ({
                ...f,
                specifyVins: e.target.checked,
                vins: e.target.checked ? Array.from({ length: f.vehicleCount }, (_, i) => f.vins[i] ?? '') : []
              }))
            }
          />
          {t('qualityNotes.specifyVins')}
        </label>

        {form.specifyVins && (
          <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-900/40 p-3">
            <p className="text-xs font-bold text-slate-400">{t('qualityNotes.vinsHint', { n: form.vehicleCount })}</p>
            {form.vins.map((vin, idx) => (
              <Field key={idx} label={t('qualityNotes.vinN', { n: idx + 1 })}>
                <input
                  className={inputCls()}
                  value={vin}
                  placeholder={t('qualityNotes.vinPlaceholder')}
                  onChange={e =>
                    setForm(f => {
                      const vins = [...f.vins]
                      vins[idx] = e.target.value
                      return { ...f, vins }
                    })
                  }
                />
              </Field>
            ))}
          </div>
        )}

        <Field label={t('qualityNotes.cols.date')} required>
          <input
            type="date"
            className={inputCls()}
            value={form.notedAt}
            onChange={e => setForm(f => ({ ...f, notedAt: e.target.value }))}
          />
        </Field>
      </div>
    </Modal>
  )
}
