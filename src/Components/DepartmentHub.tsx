import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { HubStatCard, type HubCardAccent } from './HubStatCard'

export type HubCard = {
  key: string
  title: string
  description?: string
  icon: LucideIcon
  tone: string
  onClick: () => void
  kind?: 'page' | 'action'
  accent?: HubCardAccent
  stats?: { label: string; value: string | number }[]
  footerAction?: { label: string; onClick: () => void }
}

export type HubSection = {
  key: string
  title: string
  cards: HubCard[]
}

type Props = {
  title: string
  subtitle?: string
  sections: HubSection[]
  headerAction?: ReactNode
}

function isStatCard(card: HubCard): boolean {
  return Boolean(card.stats?.length)
}

export function DepartmentHub({ title, subtitle, sections, headerAction }: Props) {
  const { t, dir } = useLang()

  return (
    <section className="space-y-6">
      <div className="card-industrial flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black text-white sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
        </div>
        {headerAction}
      </div>

      {sections.map(section => {
        if (section.cards.length === 0) return null
        const statCards = section.cards.filter(isStatCard)
        const regularCards = section.cards.filter(card => !isStatCard(card))

        return (
          <div key={section.key}>
            {section.title && (
              <h3 className="mb-3 px-1 text-sm font-black uppercase tracking-widest text-slate-400">{section.title}</h3>
            )}

            {statCards.length > 0 && (
              <div
                className={`mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 ${
                  statCards.length >= 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3'
                }`}
              >
                {statCards.map(card => (
                  <HubStatCard key={card.key} card={card} />
                ))}
              </div>
            )}

            {regularCards.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {regularCards.map(card => {
                  const Icon = card.icon
                  const isAction = card.kind === 'action'
                  const shellClass = `group flex flex-col items-start gap-3 rounded-2xl border p-4 text-start transition ${
                    isAction
                      ? 'border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-400/50 hover:bg-cyan-500/10'
                      : 'border-slate-700/70 bg-slate-900/70 hover:border-slate-500/50 hover:bg-slate-800/70'
                  }`

                  return (
                    <button key={card.key} type="button" onClick={card.onClick} className={shellClass}>
                      <div className="flex w-full items-start justify-between gap-2">
                        <div className={`rounded-xl p-2.5 ${card.tone}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        {isAction && (
                          <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-200">
                            {t('hub.actionBadge')}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-base font-black text-white">{card.title}</h4>
                        {card.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-slate-400">{card.description}</p>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-500 transition group-hover:text-cyan-300">
                        {dir === 'rtl' ? '←' : '→'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}
