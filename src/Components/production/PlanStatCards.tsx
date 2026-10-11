import type { ReactNode } from 'react'

type PillTone = 'violet' | 'cyan' | 'slate' | 'emerald' | 'amber' | 'orange' | 'rose' | 'red'

const box: Record<PillTone, string> = {
  cyan: 'border-cyan-500/30 bg-cyan-500/10',
  violet: 'border-violet-500/30 bg-violet-500/10',
  amber: 'border-amber-500/30 bg-amber-500/10',
  red: 'border-red-500/30 bg-red-500/10',
  emerald: 'border-emerald-500/30 bg-emerald-500/10',
  rose: 'border-rose-500/30 bg-rose-500/10',
  orange: 'border-orange-500/30 bg-orange-500/10',
  slate: 'border-slate-600/40 bg-slate-800/40'
}

const ink: Record<PillTone, string> = {
  cyan: 'text-cyan-300',
  violet: 'text-violet-300',
  amber: 'text-amber-300',
  red: 'text-red-300',
  emerald: 'text-emerald-300',
  rose: 'text-rose-300',
  orange: 'text-orange-300',
  slate: 'text-slate-200'
}

const labelInk: Record<PillTone, string> = {
  cyan: 'text-cyan-200',
  violet: 'text-violet-200',
  amber: 'text-amber-200',
  red: 'text-red-200',
  emerald: 'text-emerald-200',
  rose: 'text-rose-200',
  orange: 'text-orange-200',
  slate: 'text-slate-300'
}

export function PlanStatCard({
  label,
  value,
  tone,
  wide
}: {
  label: string
  value: string
  tone: 'cyan' | 'violet' | 'amber' | 'red' | 'slate' | 'emerald' | 'rose'
  wide?: boolean
}) {
  const resolved = tone === 'slate' ? 'slate' : tone
  return (
    <div className={`rounded-xl border px-3 py-3 ${box[resolved]} ${wide ? 'col-span-2' : ''}`}>
      <p className="text-[10px] font-bold text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-black tabular-nums ${ink[resolved]}`}>{value}</p>
    </div>
  )
}

export function MetricPill({
  label,
  value,
  tone = 'violet',
  detail
}: {
  label: string
  value: string
  tone?: 'violet' | 'cyan' | 'amber' | 'rose'
  detail?: { label: string; value: string }
}) {
  const valueCls = tone === 'violet' ? 'text-white' : ink[tone]
  return (
    <div className={`rounded-xl border px-3 py-2 ${box[tone]}`}>
      <p className={`text-xs font-bold ${labelInk[tone]}`}>{label}</p>
      <p className={`text-lg font-black ${valueCls}`}>{value}</p>
      {detail && (
        <div className="mt-1.5 border-t border-white/10 pt-1.5">
          <p className="text-[10px] font-bold leading-snug text-slate-400">{detail.label}</p>
          <p className={`text-sm font-black tabular-nums ${valueCls}`}>{detail.value}</p>
        </div>
      )}
    </div>
  )
}

export function SummaryPill({
  label,
  value,
  hint,
  tone = 'violet'
}: {
  label: string
  value: ReactNode
  hint?: string
  tone?: 'violet' | 'cyan' | 'slate' | 'emerald' | 'amber' | 'orange' | 'rose'
}) {
  const border = tone === 'slate' ? 'border-slate-600 bg-slate-800/50' : box[tone]
  const valueCls = tone === 'violet' || tone === 'slate' ? 'text-white' : ink[tone]
  return (
    <div className={`min-w-0 rounded-xl border px-3 py-2 text-center ${border}`}>
      <p className={`text-xs font-bold leading-snug ${labelInk[tone]}`}>{label}</p>
      <p className={`text-lg font-black tabular-nums ${valueCls}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-slate-500">{hint}</p>}
    </div>
  )
}
