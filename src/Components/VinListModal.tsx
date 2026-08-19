import { useEffect, useMemo, useState } from 'react'
import { Check, CheckCircle2, Hash } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { Modal } from './Modal'
import type { MissingPartDetail } from '../Types/missingPart'
import { uniqueVehicleReps } from '../Utils/missingPartPageUtils'

export type VinListModalPayload = {
  parts: MissingPartDetail[]
  modelName: string
  colorName: string | null
  pickComplete?: boolean
}

type Props = {
  payload: VinListModalPayload | null
  canComplete?: boolean
  completeBusy?: boolean
  onClose: () => void
  onCompleteSelected?: (parts: MissingPartDetail[]) => void
}

function isCompletable(part: MissingPartDetail) {
  return !part.shortageResolvedAt && part.status !== 'closed' && part.status !== 'cancelled'
}

export function VinListModal({ payload, canComplete = false, completeBusy, onClose, onCompleteSelected }: Props) {
  const { t } = useLang()
  const vehicles = useMemo(() => {
    if (!payload?.parts.length) return []
    return uniqueVehicleReps(payload.parts).sort((a, b) => a.vin.localeCompare(b.vin))
  }, [payload])
  const completable = useMemo(() => vehicles.filter(isCompletable), [vehicles])
  const completableIds = useMemo(() => completable.map(v => v.vehicleId), [completable])
  const selectable = Boolean(canComplete && onCompleteSelected && completable.length > 0)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!payload) {
      setSelected(new Set())
      return
    }
    setSelected(payload.pickComplete ? new Set(completableIds) : new Set())
  }, [payload, completableIds])

  if (!payload || vehicles.length === 0) return null

  const selectedReps = completable.filter(v => selected.has(v.vehicleId))
  const allOn = completableIds.length > 0 && completableIds.every(id => selected.has(id))

  function toggle(vehicleId: string) {
    if (!selectable || completeBusy) return
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(vehicleId)) next.delete(vehicleId)
      else next.add(vehicleId)
      return next
    })
  }

  function toggleAll() {
    setSelected(allOn ? new Set() : new Set(completableIds))
  }

  return (
    <Modal
      open
      title={t('mp.vinListModal.title')}
      subtitle={selectable ? t('mp.vinListModal.pickHint') : t('mp.vinListModal.subtitle', { n: vehicles.length })}
      icon={<Hash className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footer={
        selectable ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={completeBusy || selectedReps.length === 0}
              onClick={() => onCompleteSelected?.(selectedReps)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {t('mp.vinListModal.completeSelectedN', { n: selectedReps.length })}
            </button>
          </div>
        ) : undefined
      }
    >
      {(payload.modelName || payload.colorName) && (
        <div className="mb-4 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-center">
          <p className="text-sm font-bold text-white">{payload.modelName}</p>
          {payload.colorName && <p className="mt-1 text-xs text-slate-400">{payload.colorName}</p>}
        </div>
      )}

      {selectable && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold text-slate-400">{t('mp.vinListModal.subtitle', { n: vehicles.length })}</p>
          <button
            type="button"
            onClick={toggleAll}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-cyan-200 hover:bg-slate-700"
          >
            {allOn ? t('mp.vinListModal.clearSelection') : t('mp.vinListModal.selectAll')}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {vehicles.map((vehicle, i) => {
          const on = selected.has(vehicle.vehicleId)
          const canPick = selectable && isCompletable(vehicle)
          return (
            <button
              key={vehicle.vehicleId}
              type="button"
              disabled={!canPick || completeBusy}
              onClick={() => toggle(vehicle.vehicleId)}
              className={`rounded-xl border px-3 py-3 text-center shadow-sm ${
                canPick
                  ? on
                    ? 'border-emerald-400/50 bg-emerald-500/15'
                    : 'border-cyan-500/25 bg-cyan-500/5 hover:border-cyan-400/50'
                  : 'border-slate-700 bg-slate-950/40'
              } ${canPick ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <p className="text-[10px] font-bold uppercase text-slate-500">{i + 1}</p>
              <p className="mt-1 font-mono text-base font-black text-cyan-100" dir="ltr">
                {vehicle.vin}
              </p>
              {canPick && (
                <span
                  className={`mt-2 inline-flex h-4 w-4 items-center justify-center rounded border ${
                    on ? 'border-emerald-400 bg-emerald-500 text-white' : 'border-slate-500 text-transparent'
                  }`}
                >
                  <Check className="h-3 w-3" />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
