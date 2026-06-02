import { useLang } from '../i18n/LanguageContext'
import type { MissingPartStatus, PriorityLevel } from '../Types/enums'

const base = 'inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 whitespace-nowrap'

export function PriorityChip({ level }: { level: PriorityLevel }) {
  const { t } = useLang()
  const classes: Record<PriorityLevel, string> = {
    critical: 'bg-red-500/15 text-red-300 ring-red-400/30',
    high: 'bg-orange-500/15 text-orange-300 ring-orange-400/30',
    normal: 'bg-cyan-500/15 text-cyan-300 ring-cyan-400/30',
    low: 'bg-slate-500/15 text-slate-300 ring-slate-400/30'
  }
  return <span className={`${base} ${classes[level]}`}>{t(`priority.${level}`)}</span>
}

export function MissingStatusChip({ status }: { status: MissingPartStatus }) {
  const { t } = useLang()
  const classes: Record<MissingPartStatus, string> = {
    open: 'bg-red-500/15 text-red-300 ring-red-400/30',
    waiting_purchase: 'bg-orange-500/15 text-orange-300 ring-orange-400/30',
    available_in_stock: 'bg-blue-500/15 text-blue-300 ring-blue-400/30',
    issued_to_production: 'bg-blue-500/15 text-blue-300 ring-blue-400/30',
    installed: 'bg-cyan-500/15 text-cyan-300 ring-cyan-400/30',
    qc_pending: 'bg-orange-500/15 text-orange-300 ring-orange-400/30',
    closed: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30',
    cancelled: 'bg-slate-500/15 text-slate-300 ring-slate-400/30'
  }
  return <span className={`${base} ${classes[status]}`}>{t(`mpStatus.${status}`)}</span>
}
