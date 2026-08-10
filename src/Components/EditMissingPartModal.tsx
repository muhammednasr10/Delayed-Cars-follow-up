import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { Modal } from './Modal'
import { updateMissingPartRecord } from '../services/missingPartsService'
import type { VehicleIssuesContext } from '../Types/missingPart'
import type { MissingPartDetail } from '../Types/missingPart'
import { useMpLookups } from '../hooks/useMpLookups'
import { useFormatError } from '../hooks/useFormatError'
import { MpLookupSelect } from './MpLookupSelect'

type Props = {
  vehicle: VehicleIssuesContext | null
  onClose: () => void
  onSaved: () => void
}

type LineDraft = {
  part: MissingPartDetail
  partDescription: string
  requiredQty: number
  reason: string
  department: string
  notes: string
}

function lineChanged(d: LineDraft): boolean {
  const p = d.part
  return (
    d.partDescription.trim() !== p.partDescription ||
    d.requiredQty !== p.requiredQty ||
    d.reason !== p.reason ||
    d.department !== p.department ||
    (d.notes.trim() || '') !== (p.notes ?? '')
  )
}

export function EditMissingPartModal({ vehicle, onClose, onSaved }: Props) {
  const { t } = useLang()
  const { reasons, departments } = useMpLookups()
  const formatError = useFormatError()
  const [lines, setLines] = useState<LineDraft[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const openParts =
    vehicle?.parts.filter(p => vehicle.allowArchived || (p.status !== 'closed' && p.status !== 'cancelled')) ?? []

  useEffect(() => {
    if (!vehicle) {
      setLines([])
      return
    }
    setLines(
      openParts.map(p => ({
        part: p,
        partDescription: p.partDescription,
        requiredQty: p.requiredQty,
        reason: p.reason,
        department: p.department,
        notes: p.notes ?? ''
      }))
    )
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
        await updateMissingPartRecord(line.part.id, {
          partDescription: line.partDescription.trim(),
          requiredQty: Math.max(1, line.requiredQty),
          reason: line.reason,
          department: line.department,
          priority: line.part.priority,
          stopperType: line.part.stopperType,
          notes: line.notes
        })
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(formatError(err))
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
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200"
          >
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

        {openParts.length === 0 && <p className="text-center text-sm text-slate-400">{t('mp.act.noOpenIssues')}</p>}

        <div className="max-h-[min(55vh,420px)] space-y-3 overflow-y-auto pe-1">
          {lines.map((line, idx) => (
            <div key={line.part.id} className="space-y-2 rounded-xl border border-slate-700 bg-slate-950/50 p-3">
              <p className="text-[10px] font-black uppercase text-cyan-400/90">{t('mp.issueN', { n: idx + 1 })}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-400">{t('mp.cols.reasonClass')}</label>
                  <MpLookupSelect
                    className="input-dark w-full"
                    options={reasons}
                    value={line.reason}
                    onChange={code => patchLine(line.part.id, { reason: code })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-400">{t('mp.cols.department')}</label>
                  <MpLookupSelect
                    className="input-dark w-full"
                    options={departments}
                    value={line.department}
                    onChange={code => patchLine(line.part.id, { department: code })}
                  />
                </div>
              </div>
              <label className="block text-xs font-bold text-slate-400">{t('mp.cols.reason')}</label>
              <input
                className="input-dark w-full"
                value={line.partDescription}
                onChange={e => patchLine(line.part.id, { partDescription: e.target.value })}
              />
              <label className="block text-xs font-bold text-slate-400">{t('mp.cols.qty')}</label>
              <input
                type="number"
                min={Math.max(1, line.part.installedQty)}
                className="input-dark w-full"
                value={line.requiredQty}
                onChange={e => patchLine(line.part.id, { requiredQty: Number(e.target.value) })}
              />
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

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}
      </div>
    </Modal>
  )
}
