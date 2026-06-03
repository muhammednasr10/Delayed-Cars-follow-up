import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus, Settings2 } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { useMpLookups } from '../hooks/useMpLookups'
import { mpLookupLabel } from '../Utils/mpLookupLabel'
import { useCanManageMissingPart } from '../hooks/useCanManageMissingPart'
import { Modal } from './Modal'
import { MissingStatusChip } from './StatusChips'
import { installMissingPart } from '../services/missingPartsService'
import type { MissingPartDetail, VehicleIssuesContext } from '../Types/missingPart'

export type UpdateVehicleContext = VehicleIssuesContext

type Props = {
  vehicle: UpdateVehicleContext | null
  onClose: () => void
  onChanged: () => void
}

type LineDraft = {
  part: MissingPartDetail
  target: number
}

export function UpdateMissingPartModal({ vehicle, onClose, onChanged }: Props) {
  const { t, lang } = useLang()
  const { reasons, departments } = useMpLookups()
  const { canInstall, canUpdateStatus } = useCanManageMissingPart()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [lines, setLines] = useState<LineDraft[]>([])

  const openParts = useMemo(
    () => vehicle?.parts.filter(p => p.status !== 'closed' && p.status !== 'cancelled') ?? [],
    [vehicle]
  )

  useEffect(() => {
    if (!vehicle) {
      setLines([])
      return
    }
    setLines(
      openParts.map(p => ({
        part: p,
        target: p.installedQty
      }))
    )
    setError('')
  }, [vehicle, openParts])

  if (!vehicle) return null

  const canEditQty = canInstall && canUpdateStatus
  const pendingSaves = lines.filter(l => l.target > l.part.installedQty)

  function setTarget(partId: string, target: number) {
    setLines(prev =>
      prev.map(l => {
        if (l.part.id !== partId) return l
        const saved = l.part.installedQty
        const max = l.part.requiredQty
        return { ...l, target: Math.max(saved, Math.min(max, target)) }
      })
    )
  }

  async function saveAll() {
    if (!canEditQty || pendingSaves.length === 0) {
      setError(t('mp.act.needIncrease'))
      return
    }
    setBusy(true)
    setError('')
    try {
      for (const line of pendingSaves) {
        const delta = line.target - line.part.installedQty
        if (delta > 0) await installMissingPart(line.part.id, delta)
      }
      onChanged()
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
      title={t('mp.act.vehicleTitle')}
      subtitle={t('mp.act.vehicleIssues', { n: openParts.length })}
      icon={<Settings2 className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footer={
        canEditQty && pendingSaves.length > 0 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveAll()}
            className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            {t('mp.act.saveAll')}
          </button>
        ) : undefined
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

        <div className="max-h-[min(50vh,400px)] space-y-3 overflow-y-auto pe-1">
          {lines.map(line => {
            const { part, target } = line
            const saved = part.installedQty
            const required = part.requiredQty
            const pct = required > 0 ? Math.min(100, (target / required) * 100) : 0
            const hasIncrease = target > saved

            const multiVin = openParts.length > 1 && new Set(openParts.map(p => p.vin)).size > 1

            return (
              <div key={part.id} className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0 text-start">
                    {multiVin && (
                      <p className="mb-1 font-mono text-xs font-bold text-cyan-300" dir="ltr">
                        {part.vin}
                      </p>
                    )}
                    <p className="font-bold text-slate-100">{part.partDescription}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {mpLookupLabel(reasons, part.reason, lang)} · {mpLookupLabel(departments, part.department, lang)}
                    </p>
                  </div>
                  <MissingStatusChip status={part.status} />
                </div>

                <p className="mb-2 text-center text-[10px] font-bold uppercase text-slate-500">
                  {t('mp.act.qtyCounter')}
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={busy || !canEditQty || target <= saved}
                    onClick={() => setTarget(part.id, target - 1)}
                    className="rounded-lg bg-slate-800 p-2 text-slate-200 hover:bg-slate-700 disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-[88px] font-mono text-2xl font-black tabular-nums text-white">
                    {target}
                    <span className="text-slate-500">/</span>
                    {required}
                  </span>
                  <button
                    type="button"
                    disabled={busy || !canEditQty || target >= required}
                    onClick={() => setTarget(part.id, target + 1)}
                    className="rounded-lg bg-slate-800 p-2 text-slate-200 hover:bg-slate-700 disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
                {canEditQty && hasIncrease && (
                  <p className="mt-1.5 text-center text-[10px] text-slate-500">
                    {t('mp.act.willInstall', { n: target - saved })}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {!canEditQty && <p className="text-center text-xs text-amber-300">{t('mp.act.noInstallPerm')}</p>}
        {canEditQty && <p className="text-center text-xs text-slate-500">{t('mp.act.installOnlyHint')}</p>}

        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
      </div>
    </Modal>
  )
}
