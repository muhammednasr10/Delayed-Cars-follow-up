import type { ReactNode } from 'react'

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
  const border =
    tone === 'cyan'
      ? 'border-cyan-500/30 bg-cyan-500/10'
      : tone === 'violet'
        ? 'border-violet-500/30 bg-violet-500/10'
        : tone === 'amber'
          ? 'border-amber-500/30 bg-amber-500/10'
          : tone === 'red'
            ? 'border-red-500/30 bg-red-500/10'
            : tone === 'emerald'
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : tone === 'rose'
                ? 'border-rose-500/30 bg-rose-500/10'
                : 'border-slate-600/40 bg-slate-800/40'
  const valueCls =
    tone === 'cyan'
      ? 'text-cyan-300'
      : tone === 'violet'
        ? 'text-violet-300'
        : tone === 'amber'
          ? 'text-amber-300'
          : tone === 'red'
            ? 'text-red-300'
            : tone === 'emerald'
              ? 'text-emerald-300'
              : tone === 'rose'
                ? 'text-rose-300'
                : 'text-slate-200'

  return (
    <div className={`rounded-xl border px-3 py-3 ${border} ${wide ? 'col-span-2' : ''}`}>
      <p className="text-[10px] font-bold text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-black tabular-nums ${valueCls}`}>{value}</p>
    </div>
  )
}

export function MetricPill({
  label,
  value,
  tone = 'violet'
}: {
  label: string
  value: string
  tone?: 'violet' | 'cyan' | 'amber' | 'rose'
}) {
  const borderCls =
    tone === 'cyan'
      ? 'border-cyan-500/30 bg-cyan-500/10'
      : tone === 'amber'
        ? 'border-amber-500/30 bg-amber-500/10'
        : tone === 'rose'
          ? 'border-rose-500/30 bg-rose-500/10'
          : 'border-violet-500/30 bg-violet-500/10'
  const labelCls =
    tone === 'cyan'
      ? 'text-cyan-200'
      : tone === 'amber'
        ? 'text-amber-200'
        : tone === 'rose'
          ? 'text-rose-200'
          : 'text-violet-200'
  const valueCls =
    tone === 'cyan'
      ? 'text-cyan-300'
      : tone === 'amber'
        ? 'text-amber-300'
        : tone === 'rose'
          ? 'text-rose-300'
          : 'text-white'

  return (
    <div className={`rounded-xl border px-3 py-2 ${borderCls}`}>
      <p className={`text-xs font-bold ${labelCls}`}>{label}</p>
      <p className={`text-lg font-black ${valueCls}`}>{value}</p>
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
  tone?: 'violet' | 'cyan' | 'slate' | 'emerald' | 'amber' | 'orange'
}) {
  const borderCls =
    tone === 'cyan'
      ? 'border-cyan-500/30 bg-cyan-500/10'
      : tone === 'slate'
        ? 'border-slate-600 bg-slate-800/50'
        : tone === 'emerald'
          ? 'border-emerald-500/30 bg-emerald-500/10'
          : tone === 'amber'
            ? 'border-amber-500/30 bg-amber-500/10'
            : tone === 'orange'
              ? 'border-orange-500/30 bg-orange-500/10'
              : 'border-violet-500/30 bg-violet-500/10'
  const labelCls =
    tone === 'cyan'
      ? 'text-cyan-200'
      : tone === 'slate'
        ? 'text-slate-300'
        : tone === 'emerald'
          ? 'text-emerald-200'
          : tone === 'amber'
            ? 'text-amber-200'
            : tone === 'orange'
              ? 'text-orange-200'
              : 'text-violet-200'
  const valueCls =
    tone === 'cyan'
      ? 'text-cyan-300'
      : tone === 'slate'
        ? 'text-white'
        : tone === 'emerald'
          ? 'text-emerald-300'
          : tone === 'amber'
            ? 'text-amber-300'
            : tone === 'orange'
              ? 'text-orange-300'
              : 'text-white'

  return (
    <div className={`min-w-0 rounded-xl border px-3 py-2 text-center ${borderCls}`}>
      <p className={`truncate text-xs font-bold ${labelCls}`}>{label}</p>
      <p className={`text-lg font-black tabular-nums ${valueCls}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-slate-500">{hint}</p>}
    </div>
  )
}
