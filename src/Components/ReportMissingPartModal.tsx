import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { Modal } from './Modal'
import { reportMissingPart } from '../services/missingPartsService'
import { getStations, getVehicleColors, getVehicleModels } from '../services/settingsService'
import type { ReportMissingPartInput } from '../Types/missingPart'
import type { MissingPartReason, PriorityLevel, ResponsibleDepartment } from '../Types/enums'
import type { Station, VehicleColor, VehicleModel } from '../Types/settings'

const REASONS: MissingPartReason[] = ['stock_shortage', 'supplier_delay', 'damaged_part', 'qc_rejection', 'wrong_part', 'production_mistake', 'other']
const DEPARTMENTS: ResponsibleDepartment[] = ['warehouse', 'purchasing', 'production', 'quality', 'supplier', 'management']
const PRIORITIES: PriorityLevel[] = ['low', 'normal', 'high', 'critical']

const emptyForm: ReportMissingPartInput = {
  vin: '', modelId: '', partDescription: '', colorId: null, stationId: null,
  requiredQty: 1, reason: 'stock_shortage', department: 'warehouse', priority: 'normal', isDrItem: false, notes: ''
}

type Props = {
  open: boolean
  onClose: () => void
  onReported?: () => void
}

export function ReportMissingPartModal({ open, onClose, onReported }: Props) {
  const { t } = useLang()
  const [models, setModels] = useState<VehicleModel[]>([])
  const [colors, setColors] = useState<VehicleColor[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [form, setForm] = useState<ReportMissingPartInput>(emptyForm)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(emptyForm)
    setFormError('')
    Promise.all([getVehicleModels(), getVehicleColors(), getStations()])
      .then(([m, c, s]) => {
        setModels(m)
        setColors(c)
        setStations(s)
      })
      .catch(err => setFormError(err instanceof Error ? err.message : t('common.error')))
  }, [open])

  async function submit() {
    if (form.vin.trim().length < 6) { setFormError(`${t('mp.f.vin')} (6+)`); return }
    if (!form.modelId) { setFormError(t('mp.f.model')); return }
    if (!form.partDescription.trim()) { setFormError(t('mp.f.part')); return }
    setSubmitting(true)
    setFormError('')
    try {
      await reportMissingPart(form)
      onReported?.()
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
      maxWidthClass="max-w-2xl"
      footer={
        <>
          <button onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200 hover:bg-slate-700">{t('common.cancel')}</button>
          <button disabled={submitting} onClick={submit} className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50">
            {submitting ? t('common.saving') : t('common.save')}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('mp.f.vin')} required>
          <input className="input-dark" value={form.vin} onChange={e => setForm(p => ({ ...p, vin: e.target.value }))} placeholder="VIN" />
        </Field>
        <Field label={t('mp.f.model')} required>
          <select className="input-dark" value={form.modelId} onChange={e => setForm(p => ({ ...p, modelId: e.target.value }))}>
            <option value="">—</option>
            {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
        <Field label={t('mp.f.color')}>
          <select className="input-dark" value={form.colorId ?? ''} onChange={e => setForm(p => ({ ...p, colorId: e.target.value || null }))}>
            <option value="">—</option>
            {colors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label={t('mp.f.station')}>
          <select className="input-dark" value={form.stationId ?? ''} onChange={e => setForm(p => ({ ...p, stationId: e.target.value || null }))}>
            <option value="">—</option>
            {stations.map(s => <option key={s.id} value={s.id}>{s.station_number} - {s.station_name}</option>)}
          </select>
        </Field>
        <Field label={t('mp.f.part')} required>
          <input className="input-dark" value={form.partDescription} onChange={e => setForm(p => ({ ...p, partDescription: e.target.value }))} />
        </Field>
        <Field label={t('mp.f.qty')}>
          <input type="number" min={1} className="input-dark" value={form.requiredQty} onChange={e => setForm(p => ({ ...p, requiredQty: Math.max(1, Number(e.target.value) || 1) }))} />
        </Field>
        <Field label={t('mp.f.reason')}>
          <select className="input-dark" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value as MissingPartReason }))}>
            {REASONS.map(r => <option key={r} value={r}>{t(`reason.${r}`)}</option>)}
          </select>
        </Field>
        <Field label={t('mp.f.department')}>
          <select className="input-dark" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value as ResponsibleDepartment }))}>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{t(`department.${d}`)}</option>)}
          </select>
        </Field>
        <Field label={t('mp.f.priority')}>
          <select className="input-dark" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as PriorityLevel }))}>
            {PRIORITIES.map(pr => <option key={pr} value={pr}>{t(`priority.${pr}`)}</option>)}
          </select>
        </Field>
        <Field label={t('mp.f.dr')}>
          <div className="flex gap-2">
            <button type="button" onClick={() => setForm(p => ({ ...p, isDrItem: true }))} className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold ${form.isDrItem ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-300'}`}>{t('common.yes')}</button>
            <button type="button" onClick={() => setForm(p => ({ ...p, isDrItem: false }))} className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold ${!form.isDrItem ? 'bg-slate-200 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>{t('common.no')}</button>
          </div>
        </Field>
        <div className="sm:col-span-2">
          <Field label={t('mp.f.notes')}>
            <textarea className="input-dark min-h-20" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </Field>
        </div>
        {formError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200 sm:col-span-2">{formError}</div>}
      </div>
    </Modal>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-bold text-slate-300">{label}{required && <span className="text-red-400"> *</span>}</span>
      {children}
    </label>
  )
}
