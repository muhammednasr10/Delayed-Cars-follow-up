import { useEffect, useRef, useState } from 'react'
import { BadgeCheck, Plus, X } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import { VehicleModelMultiSelect } from '../VehicleModelMultiSelect'
import { StationNameAutocomplete } from '../StationNameAutocomplete'
import { MpLookupCreatableSelect } from '../MpLookupCreatableSelect'
import { getWorkerLinesForStationAndModels } from '../../services/stationOperationsService'
import { createQnCategoryOption } from '../../services/qualityNotesLookupService'
import { formatStationReferenceCode } from '../../Utils/stationHierarchy'
import type {
  QualityNoteInput,
  QualityNoteRecord,
  QualityNoteRepairTime,
  QualityNoteSeverity
} from '../../Types/qualityNote'
import type { MpLookupOption } from '../../Types/mpLookup'
import type { Station, VehicleModel } from '../../Types/settings'
import { QUALITY_NOTE_REPAIR_TIMES, QUALITY_NOTE_SEVERITIES } from './qualityNoteConstants'
import {
  emptyQualityNoteForm,
  qualityNoteRecordToForm,
  type QualityNoteFormState
} from './qualityNoteFormState'

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
  const [form, setForm] = useState<QualityNoteFormState>(emptyQualityNoteForm)
  const [stationQuery, setStationQuery] = useState('')
  const [error, setError] = useState('')
  const [workerLines, setWorkerLines] = useState<
    { stationId: string; displayCode: string; commonName: string | null }[]
  >([])
  const [workerLinesLoading, setWorkerLinesLoading] = useState(false)
  const wasOpen = useRef(false)

  useEffect(() => {
    if (open && !wasOpen.current) {
      if (editing) {
        setForm(qualityNoteRecordToForm(editing))
        setStationQuery(editing.stationCode ? formatStationReferenceCode(editing.stationCode) : '')
      } else {
        const defaults = emptyQualityNoteForm()
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

  function validate(): string | null {
    if (form.vehicleModelIds.length === 0) return t('qualityNotes.errModel')
    if (!form.stationId) return t('qualityNotes.errStation')
    if (!form.category) return t('qualityNotes.errCategory')
    if (!form.description.trim()) return t('qualityNotes.errDescription')
    if (!form.notedAt) return t('qualityNotes.errDate')
    if (!form.severity) return t('qualityNotes.errSeverity')
    if (!form.repairTime) return t('qualityNotes.errRepairTime')
    if (form.specifyVins) {
      if (form.vins.length < 1) return t('qualityNotes.errVin')
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
      repairTime: form.repairTime,
      description: form.description.trim(),
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
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
          >
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
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}

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
              className={inputCls()}
              value={form.workerLineStationId}
              onChange={e => setForm(f => ({ ...f, workerLineStationId: e.target.value }))}
            >
              <option value="">—</option>
              {workerLines.map(w => (
                <option key={w.stationId} value={w.stationId}>
                  {w.commonName ? `${w.displayCode} — ${w.commonName}` : w.displayCode}
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('qualityNotes.cols.severity')} required>
            <select
              className={inputCls()}
              value={form.severity}
              onChange={e => setForm(f => ({ ...f, severity: e.target.value as QualityNoteSeverity }))}
            >
              {QUALITY_NOTE_SEVERITIES.map(key => (
                <option key={key} value={key}>
                  {t(`qualityNotes.severity.${key}`)}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t('qualityNotes.cols.repairTime')} required>
            <select
              className={inputCls()}
              value={form.repairTime}
              onChange={e => setForm(f => ({ ...f, repairTime: e.target.value as QualityNoteRepairTime }))}
            >
              {QUALITY_NOTE_REPAIR_TIMES.map(key => (
                <option key={key} value={key}>
                  {t(`qualityNotes.repairTime.${key}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500"
            checked={form.specifyVins}
            onChange={e =>
              setForm(f => ({
                ...f,
                specifyVins: e.target.checked,
                vins: e.target.checked ? (f.vins.length > 0 ? f.vins : ['']) : []
              }))
            }
          />
          {t('qualityNotes.specifyVins')}
        </label>

        {form.specifyVins && (
          <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-900/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-400">{t('qualityNotes.vinsListHint')}</p>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, vins: [...f.vins, ''] }))}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-xs font-bold text-cyan-200 hover:bg-slate-700"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('qualityNotes.addVin')}
              </button>
            </div>
            {form.vins.map((vin, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <Field label={t('qualityNotes.vinN', { n: idx + 1 })}>
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
                </div>
                {form.vins.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setForm(f => ({
                        ...f,
                        vins: f.vins.filter((_, i) => i !== idx)
                      }))
                    }
                    className="mb-1 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-red-300"
                    title={t('common.delete')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
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
