import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../Context/AuthContext'
import { Modal } from './Modal'
import { StationAutocomplete } from './StationAutocomplete'
import { reportMissingPartsBatch } from '../services/missingPartsService'
import { getVehicleColors, getVehicleModels } from '../services/settingsService'
import type { MissingPartLineInput } from '../Types/missingPart'
import type { MissingPartReason, PriorityLevel, ResponsibleDepartment, StopperType } from '../Types/enums'
import type { Station, VehicleColor, VehicleModel } from '../Types/settings'

const REASONS: MissingPartReason[] = ['stock_shortage', 'supplier_delay', 'damaged_part', 'qc_rejection', 'wrong_part', 'production_mistake', 'other']
const DEPARTMENTS: ResponsibleDepartment[] = ['warehouse', 'purchasing', 'production', 'quality', 'supplier', 'management']
const PRIORITIES: PriorityLevel[] = ['low', 'normal', 'high', 'critical']
const STOPPER_TYPES: StopperType[] = ['line_stopper', 'car_stopper']

function newPartLine(): MissingPartLineInput & { key: string } {
  return { key: crypto.randomUUID(), partDescription: '', requiredQty: 1 }
}

function resizeVins(count: number, prev: string[]): string[] {
  const n = Math.max(1, Math.min(count, 20))
  const next = [...prev]
  while (next.length < n) next.push('')
  return next.slice(0, n)
}

type SharedForm = {
  modelId: string
  colorId: string | null
  stationId: string | null
  reason: MissingPartReason
  department: ResponsibleDepartment
  priority: PriorityLevel
  stopperType: StopperType
  notes: string
}

const emptyShared: SharedForm = {
  modelId: '',
  colorId: null,
  stationId: null,
  reason: 'stock_shortage',
  department: 'warehouse',
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
  const { hasRole } = useAuth()
  const canCreateStation = hasRole('admin', 'production', 'warehouse')
  const [models, setModels] = useState<VehicleModel[]>([])
  const [colors, setColors] = useState<VehicleColor[]>([])
  const [station, setStation] = useState<Station | null>(null)
  const [vehicleCount, setVehicleCount] = useState(1)
  const [vins, setVins] = useState<string[]>([''])
  const [parts, setParts] = useState(() => [newPartLine()])
  const [shared, setShared] = useState<SharedForm>(emptyShared)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setVehicleCount(1)
    setVins([''])
    setParts([newPartLine()])
    setShared(emptyShared)
    setStation(null)
    setFormError('')
    Promise.all([getVehicleModels(), getVehicleColors()])
      .then(([m, c]) => {
        setModels(m)
        setColors(c)
      })
      .catch(err => setFormError(err instanceof Error ? err.message : t('common.error')))
  }, [open, t])

  function selectStation(s: Station | null) {
    setStation(s)
    setShared(p => ({ ...p, stationId: s?.id ?? null }))
  }

  function setCount(n: number) {
    const c = Math.max(1, Math.min(20, n))
    setVehicleCount(c)
    setVins(prev => resizeVins(c, prev))
  }

  function updateVin(index: number, value: string) {
    setVins(prev => prev.map((v, i) => (i === index ? value : v)))
  }

  function updatePart(key: string, patch: Partial<MissingPartLineInput>) {
    setParts(prev => prev.map(p => (p.key === key ? { ...p, ...patch } : p)))
  }

  function addPart() {
    setParts(prev => [...prev, newPartLine()])
  }

  function removePart(key: string) {
    setParts(prev => (prev.length <= 1 ? prev : prev.filter(p => p.key !== key)))
  }

  async function submit() {
    const vinList = vins.map(v => v.trim()).filter(Boolean)
    if (vinList.length !== vehicleCount) {
      setFormError(t('mp.errAllVins'))
      return
    }
    for (let i = 0; i < vinList.length; i++) {
      if (vinList[i].length < 6) {
        setFormError(t('mp.errVinIndex', { n: i + 1 }))
        return
      }
    }
    if (!shared.modelId) {
      setFormError(t('mp.f.model'))
      return
    }
    if (!shared.stationId) {
      setFormError(t('station.notFound'))
      return
    }
    const validParts = parts.filter(p => p.partDescription.trim())
    if (validParts.length === 0) {
      setFormError(t('mp.errOnePart'))
      return
    }
    for (const p of validParts) {
      if (p.requiredQty < 1) {
        setFormError(t('mp.f.qty'))
        return
      }
    }

    setSubmitting(true)
    setFormError('')
    try {
      const result = await reportMissingPartsBatch({
        vins: vinList,
        modelId: shared.modelId,
        parts: validParts.map(({ partDescription, requiredQty }) => ({ partDescription, requiredQty })),
        colorId: shared.colorId,
        stationId: shared.stationId,
        reason: shared.reason,
        department: shared.department,
        priority: shared.priority,
        stopperType: shared.stopperType,
        notes: shared.notes || undefined
      })
      onReported?.(
        t('mp.batchSuccess', {
          cars: result.vehicle_count,
          parts: result.missing_part_count
        })
      )
      onClose()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setSubmitting(false)
    }
  }

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
      <div className="max-h-[70vh] space-y-5 overflow-y-auto">
        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300">{t('mp.sectionVehicle')}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('mp.f.vehicleCount')} required>
              <input
                type="number"
                min={1}
                max={20}
                className="input-dark"
                value={vehicleCount}
                onChange={e => setCount(Number(e.target.value) || 1)}
              />
            </Field>
            <Field label={t('mp.f.model')} required>
              <select className="input-dark" value={shared.modelId} onChange={e => setShared(p => ({ ...p, modelId: e.target.value }))}>
                <option value="">—</option>
                {models.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('mp.f.color')}>
              <select className="input-dark" value={shared.colorId ?? ''} onChange={e => setShared(p => ({ ...p, colorId: e.target.value || null }))}>
                <option value="">—</option>
                {colors.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label={t('mp.f.station')} required>
                <StationAutocomplete value={station} onSelect={selectStation} canCreate={canCreateStation} />
              </Field>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-700/80 bg-slate-950/50 p-3">
            <p className="text-[10px] font-bold uppercase text-slate-500">{t('mp.vinListTitle')}</p>
            {vins.map((vin, i) => (
              <Field key={i} label={t('mp.f.vinN', { n: i + 1 })} required>
                <input
                  className="input-dark font-mono"
                  dir="ltr"
                  value={vin}
                  onChange={e => updateVin(i, e.target.value)}
                  placeholder="VIN"
                />
              </Field>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300">{t('mp.sectionParts')}</h3>
            <button type="button" onClick={addPart} className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-slate-700">
              <Plus className="h-3.5 w-3.5" /> {t('mp.addPartLine')}
            </button>
          </div>
          <div className="space-y-3">
            {parts.map((line, idx) => (
              <div key={line.key} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-700/80 bg-slate-900/40 p-3 sm:grid-cols-[1fr_100px_auto] sm:items-end">
                <Field label={t('mp.f.partN', { n: idx + 1 })} required>
                  <input
                    className="input-dark"
                    value={line.partDescription}
                    onChange={e => updatePart(line.key, { partDescription: e.target.value })}
                  />
                </Field>
                <Field label={t('mp.f.qty')}>
                  <input
                    type="number"
                    min={1}
                    className="input-dark"
                    value={line.requiredQty}
                    onChange={e => updatePart(line.key, { requiredQty: Math.max(1, Number(e.target.value) || 1) })}
                  />
                </Field>
                <button
                  type="button"
                  disabled={parts.length <= 1}
                  onClick={() => removePart(line.key)}
                  className="rounded-lg bg-red-500/15 p-2 text-red-200 hover:bg-red-500/25 disabled:opacity-30"
                  title={t('common.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-500">
            {t('mp.batchHint', {
              cars: vehicleCount,
              lines: parts.filter(p => p.partDescription.trim()).length || parts.length,
              total: vehicleCount * (parts.filter(p => p.partDescription.trim()).length || parts.length)
            })}
          </p>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('mp.f.reason')}>
            <select className="input-dark" value={shared.reason} onChange={e => setShared(p => ({ ...p, reason: e.target.value as MissingPartReason }))}>
              {REASONS.map(r => (
                <option key={r} value={r}>
                  {t(`reason.${r}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('mp.f.department')}>
            <select className="input-dark" value={shared.department} onChange={e => setShared(p => ({ ...p, department: e.target.value as ResponsibleDepartment }))}>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>
                  {t(`department.${d}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('mp.f.priority')}>
            <select className="input-dark" value={shared.priority} onChange={e => setShared(p => ({ ...p, priority: e.target.value as PriorityLevel }))}>
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
                  const active = shared.stopperType === s
                  const tone =
                    s === 'line_stopper' ? 'border-red-500 bg-red-500/15 text-red-100' : 'border-amber-500 bg-amber-500/15 text-amber-100'
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setShared(p => ({ ...p, stopperType: s }))}
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
              <textarea className="input-dark min-h-16" value={shared.notes} onChange={e => setShared(p => ({ ...p, notes: e.target.value }))} />
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
