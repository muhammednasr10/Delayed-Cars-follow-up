type Tone = 'emerald' | 'sky' | 'violet' | 'slate' | 'amber' | 'red'

const TONES: Record<Tone, string> = {
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
  sky: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
  violet: 'border-violet-500/30 bg-violet-500/10 text-violet-100',
  slate: 'border-slate-600/50 bg-slate-800/50 text-slate-200',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  red: 'border-red-500/30 bg-red-500/10 text-red-100'
}

export function QualityStatPill({
  label,
  value,
  tone = 'emerald'
}: {
  label: string
  value: string
  tone?: Tone
}) {
  return (
    <div className={`rounded-xl border p-4 ${TONES[tone]}`}>
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  )
}
