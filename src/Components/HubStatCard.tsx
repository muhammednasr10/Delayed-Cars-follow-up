import { Plus } from 'lucide-react'
import type { HubCard } from './DepartmentHub'
import { useLang } from '../i18n/LanguageContext'

export type HubCardAccent =
  | 'red'
  | 'emerald'
  | 'violet'
  | 'amber'
  | 'cyan'
  | 'blue'
  | 'orange'
  | 'rose'
  | 'sky'
  | 'indigo'
  | 'slate'

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
  },
  blue: {
    shell: 'border-blue-500/30 bg-gradient-to-br from-blue-950/50 via-slate-900/95 to-slate-950 shadow-lg shadow-blue-950/40 hover:border-blue-400/45 hover:shadow-blue-500/15',
    orb: 'bg-blue-500/25',
    icon: 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-400/25',
    statBox: 'bg-blue-500/10 border-blue-500/20',
    statLabel: 'text-blue-300/75',
    statValue: 'text-blue-50',
    hint: 'text-blue-400/90 group-hover:text-blue-300',
    footerBorder: 'border-blue-500/15',
    btn: 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-900/40 hover:from-blue-500 hover:to-blue-400'
  },
  orange: {
    shell: 'border-orange-500/30 bg-gradient-to-br from-orange-950/50 via-slate-900/95 to-slate-950 shadow-lg shadow-orange-950/40 hover:border-orange-400/45 hover:shadow-orange-500/15',
    orb: 'bg-orange-500/25',
    icon: 'bg-orange-500/20 text-orange-300 ring-1 ring-orange-400/25',
    statBox: 'bg-orange-500/10 border-orange-500/20',
    statLabel: 'text-orange-300/75',
    statValue: 'text-orange-50',
    hint: 'text-orange-400/90 group-hover:text-orange-300',
    footerBorder: 'border-orange-500/15',
    btn: 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md shadow-orange-900/40 hover:from-orange-500 hover:to-orange-400'
  },
  rose: {
    shell: 'border-rose-500/30 bg-gradient-to-br from-rose-950/50 via-slate-900/95 to-slate-950 shadow-lg shadow-rose-950/40 hover:border-rose-400/45 hover:shadow-rose-500/15',
    orb: 'bg-rose-500/25',
    icon: 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/25',
    statBox: 'bg-rose-500/10 border-rose-500/20',
    statLabel: 'text-rose-300/75',
    statValue: 'text-rose-50',
    hint: 'text-rose-400/90 group-hover:text-rose-300',
    footerBorder: 'border-rose-500/15',
    btn: 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-md shadow-rose-900/40 hover:from-rose-500 hover:to-rose-400'
  },
  sky: {
    shell: 'border-sky-500/30 bg-gradient-to-br from-sky-950/50 via-slate-900/95 to-slate-950 shadow-lg shadow-sky-950/40 hover:border-sky-400/45 hover:shadow-sky-500/15',
    orb: 'bg-sky-500/25',
    icon: 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/25',
    statBox: 'bg-sky-500/10 border-sky-500/20',
    statLabel: 'text-sky-300/75',
    statValue: 'text-sky-50',
    hint: 'text-sky-400/90 group-hover:text-sky-300',
    footerBorder: 'border-sky-500/15',
    btn: 'bg-gradient-to-r from-sky-600 to-sky-500 text-slate-950 shadow-md shadow-sky-900/40 hover:from-sky-500 hover:to-sky-400'
  },
  indigo: {
    shell: 'border-indigo-500/30 bg-gradient-to-br from-indigo-950/50 via-slate-900/95 to-slate-950 shadow-lg shadow-indigo-950/40 hover:border-indigo-400/45 hover:shadow-indigo-500/15',
    orb: 'bg-indigo-500/25',
    icon: 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-400/25',
    statBox: 'bg-indigo-500/10 border-indigo-500/20',
    statLabel: 'text-indigo-300/75',
    statValue: 'text-indigo-50',
    hint: 'text-indigo-400/90 group-hover:text-indigo-300',
    footerBorder: 'border-indigo-500/15',
    btn: 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-900/40 hover:from-indigo-500 hover:to-indigo-400'
  },
  slate: {
    shell: 'border-slate-500/30 bg-gradient-to-br from-slate-800/60 via-slate-900/95 to-slate-950 shadow-lg shadow-slate-950/40 hover:border-slate-400/45 hover:shadow-slate-500/10',
    orb: 'bg-slate-500/20',
    icon: 'bg-slate-500/20 text-slate-200 ring-1 ring-slate-400/25',
    statBox: 'bg-slate-500/10 border-slate-500/20',
    statLabel: 'text-slate-300/75',
    statValue: 'text-slate-50',
    hint: 'text-slate-400/90 group-hover:text-slate-200',
    footerBorder: 'border-slate-500/15',
    btn: 'bg-gradient-to-r from-slate-600 to-slate-500 text-white shadow-md shadow-slate-900/40 hover:from-slate-500 hover:to-slate-400'
  }
}

type Props = {
  card: HubCard
}

export function HubStatCard({ card }: Props) {
  const { t, dir } = useLang()
  const accent = card.accent && card.accent in themes ? card.accent : 'cyan'
  const theme = themes[accent] ?? themes.cyan
  const Icon = card.icon
  const stats = card.stats ?? []
  const compactStats = stats.length > 4
  const isAction = card.kind === 'action'

  if (!Icon) return null

  return (
    <article className={`relative flex h-full flex-col overflow-hidden rounded-2xl border transition duration-300 ${theme.shell}`}>
      <div className={`pointer-events-none absolute -end-10 -top-10 h-36 w-36 rounded-full blur-3xl ${theme.orb}`} />
      <div className={`pointer-events-none absolute -bottom-12 -start-8 h-28 w-28 rounded-full blur-3xl opacity-60 ${theme.orb}`} />

      <button type="button" onClick={card.onClick} className="group relative flex min-h-0 flex-1 flex-col p-5 text-start">
        <div className="flex items-start gap-3">
          <div className={`shrink-0 rounded-2xl p-3 ${theme.icon}`}>
            <Icon className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-base font-black leading-tight text-white sm:text-lg">{card.title}</h4>
              {isAction && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/90">
                  {t('hub.actionBadge')}
                </span>
              )}
            </div>
            {card.description && stats.length > 0 && (
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-400 sm:text-xs">{card.description}</p>
            )}
          </div>
        </div>

        {stats.length > 0 ? (
          <div
            className={`mt-5 grid flex-1 content-start gap-2.5 ${
              compactStats
                ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                : stats.length > 1
                  ? 'grid-cols-2'
                  : 'grid-cols-1'
            }`}
          >
            {stats.map(stat => (
              <div key={stat.label} className={`rounded-xl border px-3 py-3 text-center ${theme.statBox}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.statLabel}`}>{stat.label}</p>
                <p
                  className={`mt-1 font-black tabular-nums leading-none tracking-tight ${theme.statValue} ${
                    compactStats ? 'text-xl sm:text-2xl' : 'text-3xl'
                  }`}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        ) : card.description ? (
          <div className={`mt-5 flex flex-1 items-center rounded-xl border px-4 py-4 ${theme.statBox}`}>
            <p className={`text-sm font-bold leading-relaxed ${theme.statLabel}`}>{card.description}</p>
          </div>
        ) : (
          <div className={`mt-5 flex min-h-[4.5rem] flex-1 items-center justify-center rounded-xl border ${theme.statBox}`}>
            <Icon className={`h-10 w-10 opacity-40 ${theme.statValue}`} strokeWidth={1.75} />
          </div>
        )}

        <p className={`mt-4 flex items-center gap-1.5 text-xs font-bold transition ${theme.hint}`}>
          <span>{t('hub.statCardOpen')}</span>
          <span className="transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
            {dir === 'rtl' ? '←' : '→'}
          </span>
        </p>
      </button>

      {card.footerAction && (
        <div className={`relative border-t px-3 pb-3 pt-0 ${theme.footerBorder}`}>
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
