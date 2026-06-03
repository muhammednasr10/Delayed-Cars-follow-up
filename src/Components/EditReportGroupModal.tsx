import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../Context/AuthContext'
import { Modal } from './Modal'
import { StationAutocomplete } from './StationAutocomplete'
import { setVehicleStation, updateMissingPartRecord } from '../services/missingPartsService'
import { getStations } from '../services/stationService'
import type { ReportGroupContext } from '../Types/missingPart'
import type { MissingPartReason, PriorityLevel, ResponsibleDepartment, StopperType } from '../Types/enums'
import type { Station } from '../Types/settings'

const REASONS: MissingPartReason[] = ['stock_shortage', 'supplier_delay', 'damaged_part', 'qc_rejection', 'wrong_part', 'production_mistake', 'other']
const DEPARTMENTS: ResponsibleDepartment[] = ['warehouse', 'purchasing', 'production', 'quality', 'supplier', 'management']
const PRIORITIES: PriorityLevel[] = ['low', 'normal', 'high', 'critical']
const STOPPER_TYPES: StopperType[] = ['line_stopper', 'car_stopper']

type Props = {
  group: ReportGroupContext | null
  onClose: () => void
  onSaved: () => void
}

export function EditReportGroupModal({ group, onClose, onSaved }: Props) {
  const { t } = useLang()
  const { hasRole } = useAuth()
  const canCreateStation = hasRole('admin', 'production', 'warehouse')
  const [station, setStation] = useState<Station | null>(null)
  const [partDescription, setPartDescription] = useState('')
  const [reason, setReason] = useState<MissingPartReason>('stock_shortage')
  const [department, setDepartment] = useState<ResponsibleDepartment>('warehouse')
  const [priority, setPriority] = useState<PriorityLevel>('normal')
  const [stopperType, setStopperType] = useState<StopperType>('car_stopper')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const sample = group?.parts[0]

  useEffect(() => {
    if (!group || !sample) return
    setPartDescription(sample.partDescription)
    setReason(sample.reason)
    setDepartment(sample.department)
    setPriority(sample.priority)
    setStopperType(sample.stopperType)
    setNotes(sample.notes ?? '')
    setError('')
    getStations()
      .then(list => {
        const sid = sample.stationId
        setStation(sid ? list.find(s => s.id === sid) ?? null : null)
      })
      .catch(() => setStation(null))
  }, [group, sample])

  if (!group || !sample) return null

  const vins = group.parts.map(p => p.vin).sort((a, b) => a.localeCompare(b))

  async function save() {
    if (!group) return
    if (!partDescription.trim()) {
      setError(t('mp.edit.partRequired'))
      return
    }
    if (!station?.id) {
      setError(t('station.notFound'))
      return
    }

    setBusy(true)
    setError('')
    try {
      for (const part of group.parts) {
        await updateMissingPartRecord(part.id, {
          partDescription: partDescription.trim(),
          requiredQty: part.requiredQty,
          reason,
          department,
          priority,
          stopperType,
          notes
        })
        if (part.stationId !== station.id) {
          await setVehicleStation(part.vehicleId, station.id)
        }
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={Boolean(group)}
      title={t('mp.edit.groupTitle')}
      subtitle={t('mp.act.vehicleIssues', { n: group.parts.length })}
      icon={<Pencil className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200">
            {t('common.cancel')}
          </button>
          <button type="button" disabled={busy} onClick={() => void save()} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50">
            {t('common.save')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-slate-300">
            <span>{group.modelName}</span>
            {group.colorName && (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full ring-1 ring-slate-500" style={{ backgroundColor: group.colorHex ?? '#fff' }} />
                {group.colorName}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500">{t('mp.f.vehicleCount')}: {vins.length}</p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase text-slate-500">{t('mp.vinListTitle')}</p>
          <ul className="max-h-28 space-y-1 overflow-y-auto">
            {vins.map((vin, i) => (
              <li key={vin} className="font-mono text-xs text-cyan-100" dir="ltr">
                {i + 1}. {vin}
              </li>
            ))}
          </ul>
        </div>

        <label className="block text-xs font-bold text-slate-400">{t('mp.f.station')}</label>
        <StationAutocomplete value={station} onSelect={setStation} canCreate={canCreateStation} />

        <label className="block text-xs font-bold text-slate-400">{t('mp.cols.reason')}</label>
        <input className="input-dark w-full" value={partDescription} onChange={e => setPartDescription(e.target.value)} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-400">{t('mp.cols.reasonClass')}</label>
            <select className="input-dark w-full" value={reason} onChange={e => setReason(e.target.value as MissingPartReason)}>
              {REASONS.map(r => (
                <option key={r} value={r}>
                  {t(`reason.${r}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-400">{t('mp.cols.department')}</label>
            <select className="input-dark w-full" value={department} onChange={e => setDepartment(e.target.value as ResponsibleDepartment)}>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>
                  {t(`department.${d}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-400">{t('mp.f.priority')}</label>
            <select className="input-dark w-full" value={priority} onChange={e => setPriority(e.target.value as PriorityLevel)}>
              {PRIORITIES.map(p => (
                <option key={p} value={p}>
                  {t(`priority.${p}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-400">{t('mp.f.stopper')}</label>
            <select className="input-dark w-full" value={stopperType} onChange={e => setStopperType(e.target.value as StopperType)}>
              {STOPPER_TYPES.map(s => (
                <option key={s} value={s}>
                  {t(`stopper.${s}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="block text-xs font-bold text-slate-400">{t('mp.f.notes')}</label>
        <textarea className="input-dark w-full" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />

        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
      </div>
    </Modal>
  )
}
