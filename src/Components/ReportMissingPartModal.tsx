import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { useEmployees } from '../hooks/useEmployees'
import { useFactoryOrgScope } from '../hooks/useFactoryOrgScope'
import { Modal } from './Modal'
import { StationSelect } from './StationSelect'
import { FactoryOrgUnitPicker } from './FactoryOrgUnitPicker'
import { VehicleModelFamilyPicker, resolveFamilyIdForVariant } from './VehicleModelFamilyPicker'
import { reportMissingPartsBatch } from '../services/missingPartsService'
import { getFactoryOrgUnits } from '../services/factoryOrgService'
import { getStations, getVehicleColors, getVehicleModels } from '../services/settingsService'
import type { MissingPartLineInput } from '../Types/missingPart'
import type { PriorityLevel, StopperType } from '../Types/enums'
import type { Station, VehicleColor, VehicleModel } from '../Types/settings'
import type { FactoryOrgUnit } from '../Types/factoryOrg'
import { orgPathLeaf } from '../Utils/employeeOrgPicker'
import { useFormatError } from '../hooks/useFormatError'
import { useMpLookups } from '../hooks/useMpLookups'
import { MpLookupCreatableSelect } from './MpLookupCreatableSelect'
import { defaultDepartmentCode, defaultReasonCode } from '../Utils/mpLookupLabel'
import { isValidVinLength, normalizeChassisVin } from '../Utils/vinValidation'

const PRIORITIES: PriorityLevel[] = ['low', 'normal', 'high', 'critical']
const STOPPER_TYPES: StopperType[] = ['line_stopper', 'car_stopper']

type IssueLineDraft = Omit<MissingPartLineInput, 'vins'> & {
  key: string
  station: Station | null
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
    station: null
  }
}

type VehicleForm = {
  familyId: string
  modelId: string
  colorId: string | null
  orgPath: string[]
  priority: PriorityLevel
  stopperType: StopperType
  notes: string
  vehicleCount: number
  vins: string[]
}

const emptyVehicle: VehicleForm = {
  familyId: '',
  modelId: '',
  colorId: null,
  orgPath: [],
  priority: 'normal',
  stopperType: 'car_stopper',
  notes: '',
  vehicleCount: 1,
  vins: ['']
}

type Props = {
  open: boolean
  onClose: () => void
  onReported?: (summary?: string) => void
}

export function ReportMissingPartModal({ open, onClose, onReported }: Props) {
  const { t } = useLang()
  const formatError = useFormatError()
  const { employees } = useEmployees()
  const { defaultOrgPath } = useFactoryOrgScope(employees)
  const { reasons, departments, addReason, addDepartment } = useMpLookups()
  const [models, setModels] = useState<VehicleModel[]>([])
  const [colors, setColors] = useState<VehicleColor[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [orgUnits, setOrgUnits] = useState<FactoryOrgUnit[]>([])
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
    setVehicle({ ...emptyVehicle, orgPath: [...defaultOrgPath] })
    setFormError('')
    setListsLoading(true)
    Promise.all([getVehicleModels(), getVehicleColors(), getStations(), getFactoryOrgUnits()])
      .then(([m, c, st, org]) => {
        setModels(m)
        setColors(c)
        setStations(st)
        setOrgUnits(org)
      })
      .catch(err => setFormError(formatError(err)))
      .finally(() => setListsLoading(false))
  }, [open, t, defaultOrgPath])

  function patchIssue(key: string, patch: Partial<IssueLineDraft>) {
    setIssues(prev => prev.map(l => (l.key === key ? { ...l, ...patch } : l)))
  }

  function setLineStation(key: string, station: Station | null) {
    patchIssue(key, { station, stationId: station?.id ?? null })
  }

  function setVehicleCount(n: number) {
    const count = Math.max(1, Math.min(20, n))
    setVehicle(prev => ({ ...prev, vehicleCount: count, vins: resizeVins(count, prev.vins) }))
  }

  function updateVehicleVin(index: number, value: string) {
    setVehicle(prev => ({ ...prev, vins: prev.vins.map((v, i) => (i === index ? value : v)) }))
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
    const missing: string[] = []

    if (!vehicle.modelId) missing.push(t('mp.f.model'))
    if (!orgPathLeaf(vehicle.orgPath)) missing.push(t('scratches.errArea'))

    const validIssues = issues.filter(l => l.partDescription.trim())
    if (validIssues.length === 0) missing.push(t('mp.errOneIssue'))

    const vinList = vehicle.vins.map(v => normalizeChassisVin(v)).filter(Boolean)
    if (vinList.length !== vehicle.vehicleCount) missing.push(t('mp.errAllVins'))
    for (let vi = 0; vi < vinList.length; vi++) {
      if (!isValidVinLength(vinList[vi])) missing.push(t('mp.errVinIndex', { n: vi + 1 }))
    }
    const uniqueVins = new Set(vinList)
    if (uniqueVins.size !== vinList.length) missing.push(t('mp.errDuplicateVin'))

    for (let li = 0; li < validIssues.length; li++) {
      const line = validIssues[li]
      if (!line.stationId) missing.push(t('mp.errIssueStation', { n: li + 1 }))
    }

    if (missing.length > 0) {
      setFormError(missing.join(' · '))
      return
    }

    setSubmitting(true)
    setFormError('')
    try {
      const normalizedVins = vehicle.vins.map(v => normalizeChassisVin(v))
      const result = await reportMissingPartsBatch({
        vins: normalizedVins,
        modelId: vehicle.modelId,
        parts: validIssues.map(line => ({
          partDescription: line.partDescription.trim(),
          requiredQty: 1,
          reason: line.reason,
          department: line.department,
          stationId: line.stationId
        })),
        colorId: vehicle.colorId,
        stationId: validIssues[0]?.stationId ?? null,
        reason: validIssues[0]?.reason,
        department: validIssues[0]?.department,
        priority: vehicle.priority,
        stopperType: vehicle.stopperType,
        notes: vehicle.notes || undefined,
        factoryOrgUnitId: orgPathLeaf(vehicle.orgPath)
      })
      onReported?.(t('mp.batchSuccess', { cars: result.vehicle_count, parts: result.missing_part_count }))
      onClose()
    } catch (err) {
      setFormError(formatError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const totalRecords = issues.filter(l => l.partDescription.trim()).length * vehicle.vehicleCount

  return (
    <Modal
      open={open}
      title={t('mp.reportTitle')}
      icon={<AlertTriangle className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      footer={
        <div className="w-full space-y-3">
          {formError && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/15 px-3 py-2 text-sm text-red-200">{formError}</div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200 hover:bg-slate-700">
              {t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit()}
              className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {submitting ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
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
            <div className="sm:col-span-2 space-y-2">
              <p className="text-sm font-bold text-slate-300">{t('mp.cols.orgUnit')} *</p>
              <p className="text-xs text-slate-500">{t('org.f.orgUnitsHint')}</p>
              <FactoryOrgUnitPicker
                units={orgUnits}
                path={vehicle.orgPath}
                onChange={orgPath => setVehicle(p => ({ ...p, orgPath }))}
              />
            </div>
            <Field label={t('mp.f.vehicleCount')} required>
              <input
                type="number"
                min={1}
                max={20}
                className="input-dark"
                value={vehicle.vehicleCount}
                onChange={e => setVehicleCount(Number(e.target.value) || 1)}
              />
            </Field>
          </div>
          <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <p className="text-[10px] font-bold uppercase text-slate-500">
              {vehicle.vehicleCount === 1 ? t('mp.singleVinTitle') : t('mp.vinListTitle')}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {vehicle.vins.map((vin, vi) => (
                <Field key={vi} label={vehicle.vehicleCount === 1 ? t('mp.f.vin') : t('mp.f.vinN', { n: vi + 1 })} required>
                  <input
                    className="input-dark font-mono"
                    dir="ltr"
                    inputMode="numeric"
                    maxLength={4}
                    value={vin}
                    onChange={e => updateVehicleVin(vi, e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="0000"
                  />
                </Field>
              ))}
            </div>
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

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
