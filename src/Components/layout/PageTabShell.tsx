import type { ReactNode } from 'react'

export type PageTab<T extends string> = {
  key: T
  label: string
  icon?: ReactNode
}

type Props<T extends string> = {
  title: string
  subtitle?: string
  icon?: ReactNode
  tabs: PageTab<T>[]
  activeTab: T
  onTabChange: (tab: T) => void
  activeClassName?: string
  headerExtra?: ReactNode
  message?: ReactNode
  children: ReactNode
}

const defaultActive = 'bg-cyan-500 text-slate-950'

export function PageTabShell<T extends string>({
  title,
  subtitle,
  icon,
  tabs,
  activeTab,
  onTabChange,
  activeClassName = defaultActive,
  headerExtra,
  message,
  children
}: Props<T>) {
  return (
    <section className="space-y-4">
      <div className="card-industrial p-3 sm:p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {icon && <div className="rounded-xl bg-cyan-500/15 p-3 text-cyan-300">{icon}</div>}
            <div>
              <h2 className="text-lg font-black text-white">{title}</h2>
              {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
            </div>
          </div>
          {headerExtra}
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map(item => (
            <button
              key={item.key}
              type="button"
              onClick={() => onTabChange(item.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-black sm:px-4 sm:py-2 sm:text-sm ${
                activeTab === item.key ? activeClassName : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {message}
      {children}
    </section>
  )
}
