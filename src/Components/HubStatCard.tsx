import { Plus } from 'lucide-react'
import type { HubCard } from './DepartmentHub'
import { useLang } from '../i18n/LanguageContext'

export type HubCardAccent = 'red' | 'emerald' | 'violet' | 'amber' | 'cyan'

const themes: Record<
  HubCardAccent,
  {
    shell: string
    orb: string
    icon: string
    statBox: string
    statLabel: string
    statValue: string
    hint: string
    footerBorder: string
    btn: string
  }
> = {
  red: {
    shell: 'border-red-500/30 bg-gradient-to-br from-red-950/50 via-slate-900/95 to-slate-950 shadow-lg shadow-red-950/40 hover:border-red-400/45 hover:shadow-red-500/15',
    orb: 'bg-red-500/25',
    icon: 'bg-red-500/20 text-red-300 ring-1 ring-red-400/25',
    statBox: 'bg-red-500/10 border-red-500/20',
    statLabel: 'text-red-300/75',
    statValue: 'text-red-50',
    hint: 'text-red-400/90 group-hover:text-red-300',
    footerBorder: 'border-red-500/15',
    btn: 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md shadow-red-900/40 hover:from-red-500 hover:to-red-400'
  },
  emerald: {
    shell: 'border-emerald-500/30 bg-gradient-to-br from-emerald-950/50 via-slate-900/95 to-slate-950 shadow-lg shadow-emerald-950/40 hover:border-emerald-400/45 hover:shadow-emerald-500/15',
    orb: 'bg-emerald-500/25',
    icon: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/25',
    statBox: 'bg-emerald-500/10 border-emerald-500/20',
    statLabel: 'text-emerald-300/75',
    statValue: 'text-emerald-50',
    hint: 'text-emerald-400/90 group-hover:text-emerald-300',
    footerBorder: 'border-emerald-500/15',
    btn: 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-900/40 hover:from-emerald-500 hover:to-emerald-400'
  },
  violet: {
    shell: 'border-violet-500/30 bg-gradient-to-br from-violet-950/50 via-slate-900/95 to-slate-950 shadow-lg shadow-violet-950/40 hover:border-violet-400/45 hover:shadow-violet-500/15',
    orb: 'bg-violet-500/25',
    icon: 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-400/25',
    statBox: 'bg-violet-500/10 border-violet-500/20',
    statLabel: 'text-violet-300/75',
    statValue: 'text-violet-50',
    hint: 'text-violet-400/90 group-hover:text-violet-300',
    footerBorder: 'border-violet-500/15',
    btn: 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-md shadow-violet-900/40 hover:from-violet-500 hover:to-violet-400'
  },
  amber: {
    shell: 'border-amber-500/30 bg-gradient-to-br from-amber-950/50 via-slate-900/95 to-slate-950 shadow-lg shadow-amber-950/40 hover:border-amber-400/45 hover:shadow-amber-500/15',
    orb: 'bg-amber-500/25',
    icon: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/25',
    statBox: 'bg-amber-500/10 border-amber-500/20',
    statLabel: 'text-amber-300/75',
    statValue: 'text-amber-50',
    hint: 'text-amber-400/90 group-hover:text-amber-300',
    footerBorder: 'border-amber-500/15',
    btn: 'bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 shadow-md shadow-amber-900/40 hover:from-amber-500 hover:to-amber-400'
  },
  cyan: {
    shell: 'border-cyan-500/30 bg-gradient-to-br from-cyan-950/50 via-slate-900/95 to-slate-950 shadow-lg shadow-cyan-950/40 hover:border-cyan-400/45 hover:shadow-cyan-500/15',
    orb: 'bg-cyan-500/25',
    icon: 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/25',
    statBox: 'bg-cyan-500/10 border-cyan-500/20',
    statLabel: 'text-cyan-300/75',
    statValue: 'text-cyan-50',
    hint: 'text-cyan-400/90 group-hover:text-cyan-300',
    footerBorder: 'border-cyan-500/15',
    btn: 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-slate-950 shadow-md shadow-cyan-900/40 hover:from-cyan-500 hover:to-cyan-400'
  }
}

type Props = {
  card: HubCard
}

export function HubStatCard({ card }: Props) {
  const { t, dir } = useLang()
  const accent = card.accent ?? 'emerald'
  const theme = themes[accent]
  const Icon = card.icon
  const stats = card.stats ?? []

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border transition duration-300 ${theme.shell}`}
    >
      <div className={`pointer-events-none absolute -end-10 -top-10 h-36 w-36 rounded-full blur-3xl ${theme.orb}`} />
      <div className={`pointer-events-none absolute -bottom-12 -start-8 h-28 w-28 rounded-full blur-3xl opacity-60 ${theme.orb}`} />

      <button type="button" onClick={card.onClick} className="group relative flex w-full flex-col p-5 text-start">
        <div className="flex items-start gap-3">
          <div className={`shrink-0 rounded-2xl p-3 ${theme.icon}`}>
            <Icon className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h4 className="text-base font-black leading-tight text-white sm:text-lg">{card.title}</h4>
            {card.description && (
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-400 sm:text-xs">{card.description}</p>
            )}
          </div>
        </div>

        <div className={`mt-5 grid gap-2.5 ${stats.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {stats.map(stat => (
            <div key={stat.label} className={`rounded-xl border px-3 py-3 ${theme.statBox}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.statLabel}`}>{stat.label}</p>
              <p className={`mt-1 text-3xl font-black tabular-nums leading-none tracking-tight ${theme.statValue}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <p className={`mt-4 flex items-center gap-1.5 text-xs font-bold transition ${theme.hint}`}>
          <span>{t('hub.statCardOpen')}</span>
          <span className="transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
            {dir === 'rtl' ? '←' : '→'}
          </span>
        </p>
      </button>

      {card.footerAction && (
        <div className={`border-t px-3 pb-3 pt-0 ${theme.footerBorder}`}>
          <button
            type="button"
            onClick={card.footerAction.onClick}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${theme.btn}`}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            {card.footerAction.label}
          </button>
        </div>
      )}
    </article>
  )
}
