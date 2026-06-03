import { useState } from 'react'
import { CheckCircle2, Settings2, ShieldCheck, ShieldX, XCircle } from 'lucide-react'
import { useAuth } from '../Context/AuthContext'
import { useLang } from '../i18n/LanguageContext'
import { Modal } from './Modal'
import { MissingStatusChip, StopperChip } from './StatusChips'
import { cancelMissingPart, installMissingPart, recordQc } from '../services/missingPartsService'
import type { MissingPartDetail } from '../Types/missingPart'

type Props = {
  part: MissingPartDetail | null
  onClose: () => void
  onChanged: () => void
}

export function UpdateMissingPartModal({ part, onClose, onChanged }: Props) {
  const { t } = useLang()
  const { hasRole } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!part) return null

  const canInstall = hasRole('admin', 'production')
  const canQc = hasRole('admin', 'quality')
  const canCancel = hasRole('admin', 'production')
  const isFinal = part.status === 'closed' || part.status === 'cancelled'
  const fullyInstalled = part.installedQty >= part.requiredQty

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await action()
      onChanged()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  const showInstall = canInstall && !isFinal && !fullyInstalled
  const showQcPass = canQc && !isFinal && fullyInstalled
  const showQcFail = canQc && !isFinal && fullyInstalled
  const showCancel = canCancel && !isFinal
  const noActions = !showInstall && !showQcPass && !showQcFail && !showCancel

  return (
    <Modal
      open={Boolean(part)}
      title={t('mp.act.title')}
      icon={<Settings2 className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-md"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between">
            <span className="font-black text-white">{part.vin}</span>
            <MissingStatusChip status={part.status} />
          </div>
          <p className="mt-1 text-sm text-slate-300">{part.partDescription}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StopperChip type={part.stopperType} />
            {part.stationName && (
              <span className="text-xs text-slate-400">
                {part.stationNumber ? `${part.stationNumber} · ` : ''}{part.stationName}
                {part.stationLineName ? ` · ${part.stationLineName}` : ''}
              </span>
            )}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Metric label={t('mp.act.required')} value={part.requiredQty} />
            <Metric label={t('mp.act.installed')} value={part.installedQty} />
            <Metric label={t('mp.act.remaining')} value={part.remainingQty} />
          </div>
        </div>

        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

        <div className="space-y-2">
          {showInstall && (
            <ActionButton
              busy={busy}
              onClick={() => run(() => installMissingPart(part.id, part.remainingQty))}
              className="bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25"
              icon={<CheckCircle2 className="h-4 w-4" />}
              label={t('mp.act.installed_btn')}
            />
          )}
          {showQcPass && (
            <ActionButton
              busy={busy}
              onClick={() => run(() => recordQc(part.vehicleId, 'pass', part.id))}
              className="bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
              icon={<ShieldCheck className="h-4 w-4" />}
              label={t('mp.act.qcPass')}
            />
          )}
          {showQcFail && (
            <ActionButton
              busy={busy}
              onClick={() => run(() => recordQc(part.vehicleId, 'fail', part.id))}
              className="bg-orange-500/15 text-orange-200 hover:bg-orange-500/25"
              icon={<ShieldX className="h-4 w-4" />}
              label={t('mp.act.qcFail')}
            />
          )}
          {showCancel && (
            <ActionButton
              busy={busy}
              onClick={() => run(() => cancelMissingPart(part.id))}
              className="bg-red-500/15 text-red-200 hover:bg-red-500/25"
              icon={<XCircle className="h-4 w-4" />}
              label={t('mp.act.cancel')}
            />
          )}
          {noActions && <p className="text-sm text-slate-400">{t('mp.act.noActions')}</p>}
        </div>
      </div>
    </Modal>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-900 p-2">
      <div className="text-slate-500">{label}</div>
      <div className="text-base font-black text-white">{value}</div>
    </div>
  )
}

function ActionButton({ busy, onClick, className, icon, label }: { busy: boolean; onClick: () => void; className: string; icon: React.ReactNode; label: string }) {
  return (
    <button disabled={busy} onClick={onClick} className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition disabled:opacity-50 ${className}`}>
      {icon} {label}
    </button>
  )
}
