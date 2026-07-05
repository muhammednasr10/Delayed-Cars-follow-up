import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
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
  /** كارت عريض (مثل حضور اليوم بعدة أرقام) */
  wide?: boolean
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

function isWideCard(card: HubCard): boolean {
  return Boolean(card.wide || (card.stats && card.stats.length > 4))
}

export function DepartmentHub({ title, subtitle, sections, headerAction }: Props) {
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

        return (
          <div key={section.key}>
            {section.title && (
              <h3 className="mb-3 px-1 text-sm font-black uppercase tracking-widest text-slate-400">{section.title}</h3>
            )}

            <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {section.cards.map(card => (
                <div
                  key={card.key}
                  className={isWideCard(card) ? 'sm:col-span-2 xl:col-span-2 2xl:col-span-2' : ''}
                >
                  <HubStatCard card={card} />
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}
