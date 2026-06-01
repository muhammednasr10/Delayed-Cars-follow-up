import type { CriticalityLevel, DelayStatus } from '../Types/car'
import { criticalityLabel, statusLabel } from '../Utils/formatters'

export function CriticalityBadge({ level }: { level: CriticalityLevel }) {
  const classes: Record<CriticalityLevel, string> = {
    critical: 'bg-red-500/15 text-red-300 ring-red-400/30',
    medium: 'bg-orange-500/15 text-orange-300 ring-orange-400/30',
    low: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30'
  }

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${classes[level]}`}>
      {criticalityLabel[level]}
    </span>
  )
}

export function StatusBadge({ status }: { status: DelayStatus }) {
  const classes: Record<DelayStatus, string> = {
    waiting: 'bg-slate-500/15 text-slate-200 ring-slate-400/30',
    shipping: 'bg-cyan-500/15 text-cyan-300 ring-cyan-400/30',
    installed: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30',
    closed: 'bg-zinc-500/15 text-zinc-300 ring-zinc-400/30'
  }

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${classes[status]}`}>
      {statusLabel[status]}
    </span>
  )
}
