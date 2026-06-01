import type { ReactNode } from 'react'

type StatCardProps = {
  title: string
  value: number | string
  subtitle: string
  icon: ReactNode
  tone?: 'red' | 'orange' | 'green' | 'cyan'
}

const toneClasses = {
  red: 'from-red-500/20 to-red-950/40 text-red-300 border-red-500/30',
  orange: 'from-orange-500/20 to-orange-950/40 text-orange-300 border-orange-500/30',
  green: 'from-emerald-500/20 to-emerald-950/40 text-emerald-300 border-emerald-500/30',
  cyan: 'from-cyan-500/20 to-cyan-950/40 text-cyan-300 border-cyan-500/30'
}

export function StatCard({ title, value, subtitle, icon, tone = 'cyan' }: StatCardProps) {
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-5 ${toneClasses[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-300">{title}</p>
          <p className="mt-2 text-3xl font-black text-white">{value}</p>
        </div>
        <div className="rounded-xl bg-white/10 p-3">{icon}</div>
      </div>
      <p className="mt-3 text-xs text-slate-400">{subtitle}</p>
    </div>
  )
}
