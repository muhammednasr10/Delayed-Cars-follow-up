import { useEffect, useState, type ReactNode } from 'react'
import { Check, MapPin } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { Modal } from './Modal'
import { STATION_TYPES } from '../Types/enums'

type Values = Record<string, string>
type Option = { value: string; label: string }

type Props = {
  open: boolean
  mode: 'create' | 'edit'
  initialValues: Values
  areas: Option[]
  busy: boolean
  onClose: () => void
  onSubmit: (values: Values) => Promise<boolean>
}

const DEPARTMENTS = ['warehouse', 'purchasing', 'production', 'quality', 'supplier', 'management'] as const

// Multi-step (wizard) form for creating/editing a station. Splits the long
// form into compact steps with per-step validation and a review summary.
export function StationWizardModal({ open, mode, initialValues, areas, busy, onClose, onSubmit }: Props) {
  const { t } = useLang()
  const [step, setStep] = useState(0)
  const [values, setValues] = useState<Values>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset wizard state each time it opens.
  useEffect(() => {
    if (!open) return
    setValues(initialValues)
    setErrors({})
    setStep(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const steps = [
    t('settings.wizard.basic'),
    t('settings.wizard.location'),
    t('settings.wizard.responsibility'),
    t('settings.wizard.review')
  ]
  const lastStep = steps.length - 1
  const isActive = values.is_active !== 'false'

  function set(key: string, value: string) {
    setValues(prev => ({ ...prev, [key]: value }))
    setErrors(prev => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  // Only Step 1 (basic) has DB-required fields.
  function validateStep(s: number): boolean {
    const e: Record<string, string> = {}
    if (s === 0) {
      if (!values.station_number?.trim()) e.station_number = `«${t('settings.fields.stationNumber')}» ${t('common.required')}`
      if (!values.station_name?.trim()) e.station_name = `«${t('settings.fields.stationName')}» ${t('common.required')}`
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (validateStep(step)) setStep(s => Math.min(s + 1, lastStep))
  }

  function back() {
    setStep(s => Math.max(s - 1, 0))
  }

  async function save() {
    if (!validateStep(0)) {
      setStep(0)
      return
    }
    await onSubmit(values)
  }

  const areaLabel = areas.find(a => a.value === values.work_area_id)?.label
  const deptLabel = values.responsible_department ? t(`department.${values.responsible_department}`) : null

  return (
    <Modal
      open={open}
      title={mode === 'edit' ? t('settings.editTitle', { title: t('settings.tabs.stations') }) : t('settings.addTitle', { title: t('settings.tabs.stations') })}
      icon={<MapPin className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <button onClick={onClose} disabled={busy} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50">
            {t('common.cancel')}
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={back} disabled={busy} className="rounded-xl bg-slate-700 px-4 py-2 font-bold text-slate-100 hover:bg-slate-600 disabled:opacity-50">
                {t('common.back')}
              </button>
            )}
            {step < lastStep && (
              <button onClick={next} disabled={busy} className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50">
                {t('common.next')}
              </button>
            )}
            {step === lastStep && (
              <button onClick={save} disabled={busy} className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50">
                {busy ? t('common.saving') : mode === 'edit' ? t('settings.wizard.saveEdit') : t('settings.wizard.addStation')}
              </button>
            )}
          </div>
        </div>
      }
    >
      <StepIndicator steps={steps} current={step} />

      <div className="mt-5">
        {step === 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('settings.fields.stationNumber')} required error={errors.station_number}>
              <input className={inputCls(errors.station_number)} value={values.station_number ?? ''} placeholder="ST-01" onChange={e => set('station_number', e.target.value)} />
            </Field>
            <Field label={t('settings.fields.stationName')} required error={errors.station_name}>
              <input className={inputCls(errors.station_name)} value={values.station_name ?? ''} onChange={e => set('station_name', e.target.value)} />
            </Field>
            <Field label={t('settings.fields.stationNameEn')}>
              <input className={inputCls()} value={values.station_name_en ?? ''} onChange={e => set('station_name_en', e.target.value)} dir="ltr" />
            </Field>
            <Field label={t('settings.fields.stationType')}>
              <select className={inputCls()} value={values.station_type || 'main_line'} onChange={e => set('station_type', e.target.value)}>
                {STATION_TYPES.map(s => <option key={s} value={s}>{t(`stationType.${s}`)}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <span className="mb-2 block text-sm font-bold text-slate-300">{t('settings.wizard.activeStatus')}</span>
              <div className="flex gap-2">
                <Toggle active={isActive} label={t('settings.wizard.active')} onClick={() => set('is_active', 'true')} tone="emerald" />
                <Toggle active={!isActive} label={t('settings.wizard.inactive')} onClick={() => set('is_active', 'false')} tone="slate" />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('settings.fields.workArea')}>
              <select className={inputCls()} value={values.work_area_id ?? ''} onChange={e => set('work_area_id', e.target.value)}>
                <option value="">—</option>
                {areas.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </Field>
            <Field label={t('station.line')}>
              <input className={inputCls()} value={values.line_name ?? ''} onChange={e => set('line_name', e.target.value)} />
            </Field>
            <Field label={t('settings.fields.sortOrder')}>
              <input type="number" className={inputCls()} value={values.sort_order ?? '0'} onChange={e => set('sort_order', e.target.value)} />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('station.department')}>
              <select className={inputCls()} value={values.responsible_department ?? ''} onChange={e => set('responsible_department', e.target.value)}>
                <option value="">—</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{t(`department.${d}`)}</option>)}
              </select>
            </Field>
            <Field label={t('station.person')}>
              <input className={inputCls()} value={values.responsible_person ?? ''} onChange={e => set('responsible_person', e.target.value)} />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">{t('settings.wizard.reviewHint')}</p>
            <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-slate-800 bg-slate-800 sm:grid-cols-2">
              <ReviewRow label={t('settings.fields.stationNumber')} value={values.station_number} />
              <ReviewRow label={t('settings.fields.stationName')} value={values.station_name} />
              <ReviewRow label={t('settings.fields.stationType')} value={t(`stationType.${values.station_type || 'main_line'}`)} />
              <ReviewRow label={t('settings.wizard.activeStatus')} value={isActive ? t('settings.wizard.active') : t('settings.wizard.inactive')} />
              <ReviewRow label={t('settings.fields.workArea')} value={areaLabel} />
              <ReviewRow label={t('station.line')} value={values.line_name} />
              <ReviewRow label={t('station.department')} value={deptLabel} />
              <ReviewRow label={t('station.person')} value={values.responsible_person} />
            </dl>
            {(errors.station_number || errors.station_name) && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {errors.station_number || errors.station_name}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

function inputCls(error?: string) {
  return `input-dark ${error ? 'border-red-500/60' : ''}`
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-bold text-slate-300">{label}{required && <span className="text-red-400"> *</span>}</span>
      {children}
      {error && <span className="block text-xs font-semibold text-red-400">{error}</span>}
    </label>
  )
}

function Toggle({ active, label, onClick, tone }: { active: boolean; label: string; onClick: () => void; tone: 'emerald' | 'slate' }) {
  const activeCls = tone === 'emerald' ? 'border-emerald-500 bg-emerald-500/15 text-emerald-100' : 'border-slate-500 bg-slate-500/15 text-slate-100'
  return (
    <button type="button" onClick={onClick} className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${active ? activeCls : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
      {label}
    </button>
  )
}

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition ${active ? 'bg-cyan-500 text-slate-950' : done ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`truncate text-xs font-bold ${active ? 'text-white' : done ? 'text-emerald-300' : 'text-slate-500'}`}>{label}</span>
          </div>
        )
      })}
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value?: string | null }) {
  const { t } = useLang()
  return (
    <div className="bg-slate-900/80 p-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-bold text-slate-100">{value?.trim() ? value : <span className="font-normal text-slate-500">{t('settings.wizard.empty')}</span>}</dd>
    </div>
  )
}
