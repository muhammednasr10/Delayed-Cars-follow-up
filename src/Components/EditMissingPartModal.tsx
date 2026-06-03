import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../Context/AuthContext'
import { Modal } from './Modal'
import { StationAutocomplete } from './StationAutocomplete'
import { setVehicleStation, updateMissingPartRecord } from '../services/missingPartsService'
import { getStations } from '../services/stationService'
import type { Station } from '../Types/settings'
import type { VehicleIssuesContext } from '../Types/missingPart'
import type { MissingPartDetail } from '../Types/missingPart'
import type { MissingPartReason, PriorityLevel, ResponsibleDepartment, StopperType } from '../Types/enums'

const REASONS: MissingPartReason[] = ['stock_shortage', 'supplier_delay', 'damaged_part', 'qc_rejection', 'wrong_part', 'production_mistake', 'other']
const DEPARTMENTS: ResponsibleDepartment[] = ['warehouse', 'purchasing', 'production', 'quality', 'supplier', 'management']
const PRIORITIES: PriorityLevel[] = ['low', 'normal', 'high', 'critical']
const STOPPER_TYPES: StopperType[] = ['line_stopper', 'car_stopper']

type Props = {
  vehicle: VehicleIssuesContext | null
  onClose: () => void
  onSaved: () => void
}

type LineDraft = {
  part: MissingPartDetail
  station: Station | null
  partDescription: string
  requiredQty: number
  reason: MissingPartReason
  department: ResponsibleDepartment
  priority: PriorityLevel
  stopperType: StopperType
  notes: string
}

function lineChanged(d: LineDraft): boolean {
  const p = d.part
  return (
    d.partDescription.trim() !== p.partDescription ||
    d.requiredQty !== p.requiredQty ||
    d.reason !== p.reason ||
    d.department !== p.department ||
    d.priority !== p.priority ||
    d.stopperType !== p.stopperType ||
    (d.notes.trim() || '') !== (p.notes ?? '') ||
    (d.station?.id ?? null) !== (p.stationId ?? null)
  )
}

export function EditMissingPartModal({ vehicle, onClose, onSaved }: Props) {
  const { t } = useLang()
  const { hasRole } = useAuth()
  const canCreateStation = hasRole('admin', 'production', 'warehouse')
  const [lines, setLines] = useState<LineDraft[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const openParts =
    vehicle?.parts.filter(p => p.status !== 'closed' && p.status !== 'cancelled') ?? []

  useEffect(() => {
    if (!vehicle) {
      setLines([])
      return
    }
    getStations()
      .then(list => {
        setLines(
          openParts.map(p => ({
            part: p,
            station: p.stationId ? list.find(s => s.id === p.stationId) ?? null : null,
            partDescription: p.partDescription,
            requiredQty: p.requiredQty,
            reason: p.reason,
            department: p.department,
            priority: p.priority,
            stopperType: p.stopperType,
            notes: p.notes ?? ''
          }))
        )
      })
      .catch(() => setLines(openParts.map(p => ({ part: p, station: null, partDescription: p.partDescription, requiredQty: p.requiredQty, reason: p.reason, department: p.department, priority: p.priority, stopperType: p.stopperType, notes: p.notes ?? '' }))))
    setError('')
  }, [vehicle, openParts])

  if (!vehicle) return null

  const changed = lines.filter(lineChanged)

  function patchLine(partId: string, patch: Partial<LineDraft>) {
    setLines(prev => prev.map(l => (l.part.id === partId ? { ...l, ...patch } : l)))
  }

  async function saveAll() {
    if (changed.length === 0) {
      setError(t('mp.edit.nothingChanged'))
      return
    }
    for (const line of changed) {
      if (!line.partDescription.trim()) {
        setError(t('mp.edit.partRequired'))
        return
      }
      if (line.requiredQty < Math.max(1, line.part.installedQty)) {
        setError(t('mp.edit.qtyBelowInstalled'))
        return
      }
    }

    setBusy(true)
    setError('')
    try {
      for (const line of changed) {
        if (!line.station?.id) {
          setError(t('station.notFound'))
          return
        }
        await updateMissingPartRecord(line.part.id, {
          partDescription: line.partDescription.trim(),
          requiredQty: Math.max(1, line.requiredQty),
          reason: line.reason,
          department: line.department,
          priority: line.priority,
          stopperType: line.stopperType,
          notes: line.notes
        })
        if (line.station.id !== line.part.stationId) {
          await setVehicleStation(line.part.vehicleId, line.station.id)
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
      open={Boolean(vehicle)}
      title={t('mp.edit.vehicleTitle')}
      subtitle={t('mp.act.vehicleIssues', { n: openParts.length })}
      icon={<Pencil className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={busy || changed.length === 0}
            onClick={() => void saveAll()}
            className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            {changed.length > 1 ? t('mp.edit.saveAll') : t('common.save')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center">
          <div className="font-black text-white">{vehicle.vin}</div>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-300">
            <span>{vehicle.modelName}</span>
            {vehicle.colorName && (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-3 rounded-full ring-1 ring-slate-500"
                  style={{ backgroundColor: vehicle.colorHex ?? '#fff' }}
                />
                {vehicle.colorName}
              </span>
            )}
          </div>
        </div>

        {openParts.length === 0 && (
          <p className="text-center text-sm text-slate-400">{t('mp.act.noOpenIssues')}</p>
        )}

        <div className="max-h-[min(55vh,420px)] space-y-3 overflow-y-auto pe-1">
          {lines.map((line, idx) => (
            <div key={line.part.id} className="space-y-2 rounded-xl border border-slate-700 bg-slate-950/50 p-3">
              <p className="text-[10px] font-black uppercase text-cyan-400/90">
                {t('mp.issueN', { n: idx + 1 })}
              </p>
              <label className="block text-xs font-bold text-slate-400">{t('mp.f.station')}</label>
              <StationAutocomplete
                value={line.station}
                onSelect={s => patchLine(line.part.id, { station: s })}
                canCreate={canCreateStation}
              />
              <label className="block text-xs font-bold text-slate-400">{t('mp.cols.reason')}</label>
              <input
                className="input-dark w-full"
                value={line.partDescription}
                onChange={e => patchLine(line.part.id, { partDescription: e.target.value })}
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-400">{t('mp.cols.reasonClass')}</label>
                  <select
                    className="input-dark w-full"
                    value={line.reason}
                    onChange={e => patchLine(line.part.id, { reason: e.target.value as MissingPartReason })}
                  >
                    {REASONS.map(r => (
                      <option key={r} value={r}>
                        {t(`reason.${r}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-400">{t('mp.cols.department')}</label>
                  <select
                    className="input-dark w-full"
                    value={line.department}
                    onChange={e => patchLine(line.part.id, { department: e.target.value as ResponsibleDepartment })}
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>
                        {t(`department.${d}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="block text-xs font-bold text-slate-400">{t('mp.cols.qty')}</label>
              <input
                type="number"
                min={Math.max(1, line.part.installedQty)}
                className="input-dark w-full"
                value={line.requiredQty}
                onChange={e => patchLine(line.part.id, { requiredQty: Number(e.target.value) })}
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-400">{t('mp.f.priority')}</label>
                  <select
                    className="input-dark w-full"
                    value={line.priority}
                    onChange={e => patchLine(line.part.id, { priority: e.target.value as PriorityLevel })}
                  >
                    {PRIORITIES.map(p => (
                      <option key={p} value={p}>
                        {t(`priority.${p}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-400">{t('mp.f.stopper')}</label>
                  <select
                    className="input-dark w-full"
                    value={line.stopperType}
                    onChange={e => patchLine(line.part.id, { stopperType: e.target.value as StopperType })}
                  >
                    {STOPPER_TYPES.map(s => (
                      <option key={s} value={s}>
                        {t(`stopper.${s}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="block text-xs font-bold text-slate-400">{t('mp.f.notes')}</label>
              <textarea
                className="input-dark w-full"
                rows={2}
                value={line.notes}
                onChange={e => patchLine(line.part.id, { notes: e.target.value })}
              />
            </div>
          ))}
        </div>

        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
      </div>
    </Modal>
  )
}
