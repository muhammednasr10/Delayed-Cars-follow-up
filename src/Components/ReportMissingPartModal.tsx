import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { Modal } from './Modal'
import { StationSelect } from './StationSelect'
import { VehicleModelFamilyPicker, resolveFamilyIdForVariant } from './VehicleModelFamilyPicker'
import { reportMissingPartsBatch } from '../services/missingPartsService'
import { getStations, getVehicleColors, getVehicleModels } from '../services/settingsService'
import type { MissingPartLineInput } from '../Types/missingPart'
import type { PriorityLevel, StopperType } from '../Types/enums'
import type { Station, VehicleColor, VehicleModel } from '../Types/settings'
import { useMpLookups } from '../hooks/useMpLookups'
import { MpLookupCreatableSelect } from './MpLookupCreatableSelect'
import { defaultDepartmentCode, defaultReasonCode } from '../Utils/mpLookupLabel'

const PRIORITIES: PriorityLevel[] = ['low', 'normal', 'high', 'critical']
const STOPPER_TYPES: StopperType[] = ['line_stopper', 'car_stopper']

type IssueLineDraft = MissingPartLineInput & {
  key: string
  station: Station | null
  vehicleCount: number
}

function resizeVins(count: number, prev: string[]): string[] {
  const n = Math.max(1, Math.min(count, 20))
  const next = [...prev]
  while (next.length < n) next.push('')
  return next.slice(0, n)
}

function newIssueLine(): IssueLineDraft {
  return {
    key: crypto.randomUUID(),
    partDescription: '',
    requiredQty: 1,
    reason: '',
    department: '',
    stationId: null,
    station: null,
    vehicleCount: 1,
    vins: ['']
  }
}

type VehicleForm = {
  familyId: string
  modelId: string
  colorId: string | null
  priority: PriorityLevel
  stopperType: StopperType
  notes: string
}

const emptyVehicle: VehicleForm = {
  familyId: '',
  modelId: '',
  colorId: null,
  priority: 'normal',
  stopperType: 'car_stopper',
  notes: ''
}

type Props = {
  open: boolean
  onClose: () => void
  onReported?: (summary?: string) => void
}

export function ReportMissingPartModal({ open, onClose, onReported }: Props) {
  const { t } = useLang()
  const { reasons, departments, addReason, addDepartment } = useMpLookups()
  const [models, setModels] = useState<VehicleModel[]>([])
  const [colors, setColors] = useState<VehicleColor[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [listsLoading, setListsLoading] = useState(false)
  const [issues, setIssues] = useState(() => [newIssueLine()])
  const [vehicle, setVehicle] = useState<VehicleForm>(emptyVehicle)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || reasons.length === 0 || departments.length === 0) return
    setIssues(prev =>
      prev.map(l => ({
        ...l,
        reason: l.reason || defaultReasonCode(reasons),
        department: l.department || defaultDepartmentCode(departments)
      }))
    )
  }, [open, reasons, departments])

  useEffect(() => {
    if (!open) return
    setIssues([
      {
        ...newIssueLine(),
        reason: defaultReasonCode(reasons),
        department: defaultDepartmentCode(departments)
      }
    ])
    setVehicle(emptyVehicle)
    setFormError('')
    Promise.all([getVehicleModels(), getVehicleColors(), getStations()])
      .then(([m, c, st]) => {
        setModels(m)
        setColors(c)
        setStations(st)
      })
      .catch(err => setFormError(err instanceof Error ? err.message : t('common.error')))
      .finally(() => setListsLoading(false))
  }, [open, reasons, departments, t])

  function patchIssue(key: string, patch: Partial<IssueLineDraft>) {
    setIssues(prev => prev.map(l => (l.key === key ? { ...l, ...patch } : l)))
  }

  function setLineStation(key: string, station: Station | null) {
    patchIssue(key, { station, stationId: station?.id ?? null })
  }

  function setLineVehicleCount(key: string, n: number) {
    const c = Math.max(1, Math.min(20, n))
    setIssues(prev =>
      prev.map(l => {
        if (l.key !== key) return l
        return { ...l, vehicleCount: c, vins: resizeVins(c, l.vins) }
      })
    )
  }

  function updateLineVin(key: string, index: number, value: string) {
    setIssues(prev =>
      prev.map(l => {
        if (l.key !== key) return l
        return { ...l, vins: l.vins.map((v, i) => (i === index ? value : v)) }
      })
    )
  }

  function addIssue() {
    setIssues(prev => [
      ...prev,
      {
        ...newIssueLine(),
        reason: defaultReasonCode(reasons),
        department: defaultDepartmentCode(departments)
      }
    ])
  }

  function removeIssue(key: string) {
    setIssues(prev => (prev.length <= 1 ? prev : prev.filter(l => l.key !== key)))
  }

  async function submit() {
    if (!vehicle.modelId) {
      setFormError(t('mp.f.model'))
      return
    }

    const validIssues = issues.filter(l => l.partDescription.trim())
    if (validIssues.length === 0) {
      setFormError(t('mp.errOneIssue'))
      return
    }

    for (let li = 0; li < validIssues.length; li++) {
      const line = validIssues[li]
      if (!line.stationId) {
        setFormError(t('mp.errIssueStation', { n: li + 1 }))
        return
      }
      const vinList = line.vins.map(v => v.trim()).filter(Boolean)
      if (vinList.length !== line.vehicleCount) {
        setFormError(t('mp.errIssueVins', { n: li + 1 }))
        return
      }
      for (let vi = 0; vi < vinList.length; vi++) {
        if (vinList[vi].length < 6) {
          setFormError(t('mp.errIssueVinIndex', { issue: li + 1, vin: vi + 1 }))
          return
        }
      }
    }

    setSubmitting(true)
    setFormError('')
    try {
      let totalCars = 0
      let totalRecords = 0
      for (const line of validIssues) {
        const vinList = line.vins.map(v => v.trim())
        const result = await reportMissingPartsBatch({
          vins: vinList,
          modelId: vehicle.modelId,
          parts: [
            {
              partDescription: line.partDescription.trim(),
              requiredQty: 1,
              reason: line.reason,
              department: line.department,
              stationId: line.stationId,
              vins: vinList
            }
          ],
          colorId: vehicle.colorId,
          stationId: line.stationId,
          reason: line.reason,
          department: line.department,
          priority: vehicle.priority,
          stopperType: vehicle.stopperType,
          notes: vehicle.notes || undefined
        })
        totalCars += result.vehicle_count
        totalRecords += result.missing_part_count
      }
      onReported?.(t('mp.batchSuccess', { cars: totalCars, parts: totalRecords }))
      onClose()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setSubmitting(false)
    }
  }

  const totalRecords = issues
    .filter(l => l.partDescription.trim())
    .reduce((s, l) => s + l.vehicleCount, 0)

  return (
    <Modal
      open={open}
      title={t('mp.reportTitle')}
      icon={<AlertTriangle className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      footer={
        <>
          <button onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200 hover:bg-slate-700">
            {t('common.cancel')}
          </button>
          <button disabled={submitting} onClick={() => void submit()} className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50">
            {submitting ? t('common.saving') : t('common.save')}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300">{t('mp.sectionVehicle')}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <VehicleModelFamilyPicker
                models={models}
                familyId={vehicle.familyId}
                variantId={vehicle.modelId}
                loading={listsLoading}
                onFamilyChange={familyId => setVehicle(p => ({ ...p, familyId, modelId: '' }))}
                onVariantChange={modelId =>
                  setVehicle(p => ({
                    ...p,
                    modelId,
                    familyId: resolveFamilyIdForVariant(models, modelId) || p.familyId
                  }))
                }
              />
            </div>
            <Field label={t('mp.f.color')}>
              {listsLoading ? (
                <p className="text-sm text-slate-500">{t('common.loading')}</p>
              ) : colors.length === 0 ? (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
                  {t('mp.noColorsInSettings')}
                </p>
              ) : (
                <select
                  className="input-dark"
                  value={vehicle.colorId ?? ''}
                  onChange={e => setVehicle(p => ({ ...p, colorId: e.target.value || null }))}
                >
                  <option value="">—</option>
                  {colors.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300">{t('mp.sectionIssues')}</h3>
              <p className="mt-0.5 text-[10px] text-slate-500">{t('mp.sectionIssuesHint')}</p>
            </div>
            <button type="button" onClick={addIssue} className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-slate-700">
              <Plus className="h-3.5 w-3.5" /> {t('mp.addIssueLine')}
            </button>
          </div>

          <div className="space-y-3">
            {issues.map((line, idx) => (
              <div key={line.key} className="space-y-3 rounded-xl border border-slate-700/80 bg-slate-900/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase text-cyan-400/80">{t('mp.issueN', { n: idx + 1 })}</p>
                  <button
                    type="button"
                    disabled={issues.length <= 1}
                    onClick={() => removeIssue(line.key)}
                    className="rounded-lg bg-red-500/15 p-2 text-red-200 hover:bg-red-500/25 disabled:opacity-30"
                    title={t('common.delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <Field label={t('mp.f.station')} required>
                  <StationSelect
                    stations={stations}
                    value={line.station}
                    loading={listsLoading}
                    onSelect={s => setLineStation(line.key, s)}
                  />
                </Field>

                <Field label={t('mp.cols.reason')} required>
                  <input
                    className="input-dark"
                    value={line.partDescription}
                    onChange={e => patchIssue(line.key, { partDescription: e.target.value })}
                    placeholder={t('mp.issueReasonPlaceholder')}
                  />
                </Field>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field label={t('mp.f.vehicleCount')} required>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      className="input-dark"
                      value={line.vehicleCount}
                      onChange={e => setLineVehicleCount(line.key, Number(e.target.value) || 1)}
                    />
                  </Field>
                  <Field label={t('mp.cols.reasonClass')}>
                    <MpLookupCreatableSelect
                      options={reasons}
                      value={line.reason}
                      onChange={code => patchIssue(line.key, { reason: code })}
                      onCreate={addReason}
                      addLabel={t('mp.addReasonOption')}
                    />
                  </Field>
                  <Field label={t('mp.cols.department')}>
                    <MpLookupCreatableSelect
                      options={departments}
                      value={line.department}
                      onChange={code => patchIssue(line.key, { department: code })}
                      onCreate={addDepartment}
                      addLabel={t('mp.addDepartmentOption')}
                    />
                  </Field>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-500">
                    {line.vehicleCount === 1 ? t('mp.singleVinTitle') : t('mp.vinListTitle')}
                  </p>
                  {line.vins.map((vin, vi) => (
                    <Field key={vi} label={line.vehicleCount === 1 ? t('mp.f.vin') : t('mp.f.vinN', { n: vi + 1 })} required>
                      <input
                        className="input-dark font-mono"
                        dir="ltr"
                        value={vin}
                        onChange={e => updateLineVin(line.key, vi, e.target.value)}
                        placeholder="VIN"
                      />
                    </Field>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {totalRecords > 0 && (
            <p className="text-[10px] text-slate-500">{t('mp.batchHintTotal', { total: totalRecords })}</p>
          )}
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('mp.f.priority')}>
            <select className="input-dark" value={vehicle.priority} onChange={e => setVehicle(p => ({ ...p, priority: e.target.value as PriorityLevel }))}>
              {PRIORITIES.map(pr => (
                <option key={pr} value={pr}>
                  {t(`priority.${pr}`)}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label={t('mp.f.stopper')} required>
              <div className="grid grid-cols-2 gap-2">
                {STOPPER_TYPES.map(s => {
                  const active = vehicle.stopperType === s
                  const tone =
                    s === 'line_stopper' ? 'border-red-500 bg-red-500/15 text-red-100' : 'border-amber-500 bg-amber-500/15 text-amber-100'
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setVehicle(p => ({ ...p, stopperType: s }))}
                      className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${active ? tone : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    >
                      {t(`stopper.${s}`)}
                    </button>
                  )
                })}
              </div>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label={t('mp.f.notes')}>
              <textarea className="input-dark min-h-16" value={vehicle.notes} onChange={e => setVehicle(p => ({ ...p, notes: e.target.value }))} />
            </Field>
          </div>
        </section>

        {formError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{formError}</div>}
      </div>
    </Modal>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-bold text-slate-300">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </span>
      {children}
    </label>
  )
}
