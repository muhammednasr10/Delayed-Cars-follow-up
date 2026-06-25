import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MapPin } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { Modal } from './Modal'
import { STATION_TYPES } from '../Types/enums'
import type { WorkArea } from '../Types/settings'
import {
  composeStationNumber,
  formatStationReferenceCode,
  nextWorkerSuffix,
  normalizeStationReferenceCode,
  stationReferenceExists
} from '../Utils/stationHierarchy'
import { normalizeStationType } from '../Utils/stationDisplay'
import { StationNameAutocomplete } from './StationNameAutocomplete'
import type { Station } from '../Types/settings'

type Values = Record<string, string>

type Props = {
  open: boolean
  mode: 'create' | 'edit'
  initialValues: Values
  existingStationNumbers: string[]
  busy: boolean
  /** عند إضافة عامل لنفس المحطة — يُثبَّت الكود ويُضاف L2، L3… تلقائياً */
  withWorkerSuffix?: boolean
  lockStationBase?: boolean
  workAreas?: Pick<WorkArea, 'id' | 'name'>[]
  /** محطات مرجعية من الإعدادات — تفعّل الإكمال التلقائي */
  masterStations?: Station[]
  /** عند الإضافة: يجب اختيار محطة موجودة في الإعدادات (ربط فقط) */
  linkFromSettingsOnly?: boolean
  /** أرقام المحطة الحالية (مرجعية + خطوط عمال) — يُستثناها من فحص التكرار عند التعديل */
  excludeStationNumbers?: string[]
  onClose: () => void
  onSubmit: (values: Values) => Promise<boolean>
}

export function StationWizardModal({
  open,
  mode,
  initialValues,
  existingStationNumbers,
  busy,
  withWorkerSuffix = false,
  lockStationBase = false,
  workAreas,
  masterStations,
  linkFromSettingsOnly = false,
  excludeStationNumbers,
  onClose,
  onSubmit
}: Props) {
  const { t } = useLang()
  const [values, setValues] = useState<Values>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const lastSeedKeyRef = useRef('')

  useEffect(() => {
    if (!open) {
      lastSeedKeyRef.current = ''
      return
    }
    const key = [
      initialValues.station_base ?? '',
      initialValues.station_number ?? '',
      initialValues.station_name ?? '',
      initialValues.headcount_workers ?? ''
    ].join('|')
    if (!key.replace(/\|/g, '').trim()) return
    if (lastSeedKeyRef.current === key) return
    lastSeedKeyRef.current = key
    setValues(initialValues)
    setErrors({})
    setFormError('')
  }, [open, initialValues])

  const isActive = values.is_active !== 'false'

  const workerSuffix = useMemo(() => {
    if (!withWorkerSuffix) return ''
    const base = normalizeStationReferenceCode(values.station_base ?? '')
    if (!base) return 'L1'
    if (mode === 'edit' && values.worker_suffix) return values.worker_suffix
    return nextWorkerSuffix(existingStationNumbers, base, values.station_number)
  }, [withWorkerSuffix, mode, values.station_base, values.worker_suffix, values.station_number, existingStationNumbers])

  const stationPreview = useMemo(() => {
    const base = normalizeStationReferenceCode(values.station_base ?? '')
    if (!base) return ''
    if (withWorkerSuffix) return composeStationNumber(base, workerSuffix || 'L1')
    return formatStationReferenceCode(base)
  }, [values.station_base, withWorkerSuffix, workerSuffix])

  function set(key: string, value: string) {
    setValues(prev => ({ ...prev, [key]: value }))
    setErrors(prev => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function applyMasterStation(station: Station) {
    const base = normalizeStationReferenceCode(station.station_number)
    const workAreaId = station.work_area_id ?? station.work_areas?.id ?? ''
    setValues(prev => ({
      sort_order: station.sort_order != null ? String(station.sort_order) : '0',
      station_base: formatStationReferenceCode(station.station_number),
      station_name: station.station_name,
      work_area_id: workAreaId,
      station_type: normalizeStationType(station.station_type),
      is_active: station.is_active === false ? 'false' : 'true',
      station_number: base,
      headcount_workers:
        station.headcount_workers != null && station.headcount_workers > 0
          ? String(station.headcount_workers)
          : '1',
      worker_suffix: prev.worker_suffix ?? ''
    }))
    setErrors({})
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    const base = normalizeStationReferenceCode(values.station_base ?? '')
    const originalBase = normalizeStationReferenceCode(
      initialValues.station_base ?? initialValues.station_number ?? ''
    )
    const baseChanged = mode === 'edit' && base !== originalBase
    if (!base) {
      e.station_base = `«${t('settings.cols.stationName')}» ${t('common.required')}`
    } else if (linkFromSettingsOnly && masterStations?.length) {
      const found = masterStations.some(
        s => normalizeStationReferenceCode(s.station_number).toUpperCase() === base.toUpperCase()
      )
      if (!found) e.station_base = t('operations.stationMustFromSettings')
    } else if (
      !linkFromSettingsOnly &&
      (mode === 'create' || baseChanged) &&
      stationReferenceExists(
        existingStationNumbers,
        base,
        mode === 'edit' ? initialValues.station_number || initialValues.station_base : undefined,
        excludeStationNumbers
      )
    ) {
      e.station_base = t('settings.stationDuplicateDetail', { code: formatStationReferenceCode(base) })
    }
    if (!values.station_name?.trim()) e.station_name = `«${t('settings.fields.commonName')}» ${t('common.required')}`
    setErrors(e)
    if (Object.keys(e).length > 0) {
      setFormError(t('settings.wizard.fixErrors'))
      return false
    }
    setFormError('')
    return true
  }

  async function save() {
    if (!validate()) return
    const base = normalizeStationReferenceCode(values.station_base ?? '')
    const station_number = withWorkerSuffix ? composeStationNumber(base, workerSuffix || 'L1') : base
    const ok = await onSubmit({
      ...values,
      station_base: base,
      worker_suffix: workerSuffix,
      station_number
    })
    if (!ok) return
  }

  return (
    <Modal
      open={open}
      title={
        linkFromSettingsOnly && mode === 'create'
          ? t('operations.addParentStation')
          : mode === 'edit'
            ? t('settings.editTitle', { title: t('engineering.stations.title') })
            : t('settings.addTitle', { title: t('engineering.stations.title') })
      }
      icon={<MapPin className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-xl"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50">
            {t('common.cancel')}
          </button>
          <button type="button" onClick={() => void save()} disabled={busy} className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50">
            {busy ? t('common.saving') : linkFromSettingsOnly && mode === 'create' ? t('operations.linkStationConfirm') : mode === 'edit' ? t('settings.wizard.saveEdit') : t('settings.wizard.addStation')}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {linkFromSettingsOnly && mode === 'create' && (
          <p className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
            {t('operations.pickStationHint')}
          </p>
        )}
        <div className="flex items-start gap-3">
          <Field label={t('settings.fields.sortOrder')} className="w-24 shrink-0">
            <input
              type="number"
              min={0}
              className={inputCls()}
              value={values.sort_order ?? '0'}
              onChange={e => set('sort_order', e.target.value)}
            />
          </Field>

          <Field label={t('settings.cols.stationName')} className="min-w-0 flex-1">
            {masterStations && masterStations.length > 0 && !lockStationBase ? (
              <StationNameAutocomplete
                value={values.station_base ?? ''}
                stations={masterStations}
                workAreas={workAreas}
                error={errors.station_base}
                placeholder="PBS01"
                onChange={v => set('station_base', v)}
                onPick={applyMasterStation}
              />
            ) : (
              <>
                <input
                  className={`${inputCls(errors.station_base)} w-full font-mono`}
                  value={values.station_base ?? ''}
                  placeholder="PBS01"
                  dir="ltr"
                  readOnly={lockStationBase}
                  onChange={e => set('station_base', e.target.value)}
                />
                {errors.station_base && (
                  <span className="block text-xs font-semibold text-red-400">{errors.station_base}</span>
                )}
              </>
            )}
            {withWorkerSuffix && stationPreview && (
              <span className="mt-1 block font-mono text-xs text-cyan-300/80" dir="ltr">
                {stationPreview}
              </span>
            )}
          </Field>
        </div>

        <Field label={t('settings.fields.commonName')} required error={errors.station_name}>
          <input className={inputCls(errors.station_name)} value={values.station_name ?? ''} onChange={e => set('station_name', e.target.value)} />
        </Field>

        {workAreas && (
          <Field label={t('settings.cols.workArea')}>
            <select className={inputCls()} value={values.work_area_id ?? ''} onChange={e => set('work_area_id', e.target.value)}>
              <option value="">{t('operations.workplaceEmpty')}</option>
              {workAreas.map(area => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label={t('settings.fields.stationType')}>
          <select
            className={inputCls()}
            value={normalizeStationType(values.station_type)}
            onChange={e => set('station_type', e.target.value)}
          >
            {STATION_TYPES.map(s => (
              <option key={s} value={s}>
                {t(`stationType.${s}`)}
              </option>
            ))}
          </select>
        </Field>

        {!withWorkerSuffix && (
          <Field label={t('settings.fields.headcountWorkers')}>
            <input
              type="number"
              min={1}
              step={1}
              className={inputCls()}
              value={values.headcount_workers ?? '1'}
              onChange={e => set('headcount_workers', e.target.value)}
            />
          </Field>
        )}

        <div>
          <span className="mb-2 block text-sm font-bold text-slate-300">{t('settings.wizard.activeStatus')}</span>
          <div className="flex gap-2">
            <Toggle active={isActive} label={t('settings.wizard.active')} onClick={() => set('is_active', 'true')} tone="emerald" />
            <Toggle active={!isActive} label={t('settings.wizard.inactive')} onClick={() => set('is_active', 'false')} tone="slate" />
          </div>
        </div>

        {formError && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200">
            {formError}
          </p>
        )}
      </div>
    </Modal>
  )
}

function inputCls(error?: string) {
  return `input-dark ${error ? 'border-red-500/60' : ''}`
}

function Field({
  label,
  required,
  error,
  hint,
  className,
  children
}: {
  label: string
  required?: boolean
  error?: string
  hint?: string
  className?: string
  children: ReactNode
}) {
  return (
    <label className={`block space-y-1.5 ${className ?? ''}`}>
      <span className="text-sm font-bold text-slate-300">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </span>
      {hint && (
        <span className="block font-mono text-xs text-cyan-300/80" dir="ltr">
          {hint}
        </span>
      )}
      {children}
      {error && <span className="block text-xs font-semibold text-red-400">{error}</span>}
    </label>
  )
}

function Toggle({ active, label, onClick, tone }: { active: boolean; label: string; onClick: () => void; tone: 'emerald' | 'slate' }) {
  const activeCls = tone === 'emerald' ? 'border-emerald-500 bg-emerald-500/15 text-emerald-100' : 'border-slate-500 bg-slate-500/15 text-slate-100'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${active ? activeCls : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
    >
      {label}
    </button>
  )
}
