import { useLang } from '../i18n/LanguageContext'
import type {
  VehicleCompletionStatus,
  VehicleDeliveryStatus,
  VehicleProductionStatus,
  VehicleQcStatus
} from '../Types/enums'

const base = 'inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 whitespace-nowrap'

// Color rules: red = blocked/critical, orange = pending, blue/cyan = in-progress, green = done.
export function DeliveryBadge({ status }: { status: VehicleDeliveryStatus }) {
  const { t } = useLang()
  const classes: Record<VehicleDeliveryStatus, string> = {
    blocked: 'bg-red-500/15 text-red-300 ring-red-400/30',
    ready: 'bg-cyan-500/15 text-cyan-300 ring-cyan-400/30',
    delivered: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30'
  }
  return <span className={`${base} ${classes[status]}`}>{t(`deliveryStatus.${status}`)}</span>
}

export function QcBadge({ status }: { status: VehicleQcStatus }) {
  const { t } = useLang()
  const classes: Record<VehicleQcStatus, string> = {
    pending: 'bg-orange-500/15 text-orange-300 ring-orange-400/30',
    passed: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30',
    failed: 'bg-red-500/15 text-red-300 ring-red-400/30',
    not_required: 'bg-slate-500/15 text-slate-300 ring-slate-400/30'
  }
  return <span className={`${base} ${classes[status]}`}>{t(`qcStatus.${status}`)}</span>
}

export function ProductionStatusBadge({ status }: { status: VehicleProductionStatus }) {
  const { t } = useLang()
  const classes: Record<VehicleProductionStatus, string> = {
    planned: 'bg-slate-500/15 text-slate-300 ring-slate-400/30',
    on_line: 'bg-cyan-500/15 text-cyan-300 ring-cyan-400/30',
    off_line_incomplete: 'bg-red-500/15 text-red-300 ring-red-400/30',
    rework: 'bg-orange-500/15 text-orange-300 ring-orange-400/30',
    completed: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30'
  }
  return <span className={`${base} ${classes[status]}`}>{t(`productionStatus.${status}`)}</span>
}

export function CompletionStatusBadge({ status }: { status: VehicleCompletionStatus }) {
  const { t } = useLang()
  const classes: Record<VehicleCompletionStatus, string> = {
    incomplete: 'bg-orange-500/15 text-orange-300 ring-orange-400/30',
    complete: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30'
  }
  const label = status === 'complete' ? t('common.yes') : t('common.no')
  return <span className={`${base} ${classes[status]}`}>{label}</span>
}

export function CompletionBar({ percent }: { percent: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)))
  const color = pct >= 100 ? 'bg-emerald-400' : pct > 0 ? 'bg-cyan-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-300">{pct}%</span>
    </div>
  )
}
