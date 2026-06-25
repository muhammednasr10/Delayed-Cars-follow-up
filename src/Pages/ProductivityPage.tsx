import { useState } from 'react'
import { ClipboardList, LogIn, LogOut } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { EntryProductivityPage } from './EntryProductivityPage'
import { ExitProductivityPage } from './ExitProductivityPage'
import { ProductionOrdersPage } from './ProductionOrdersPage'

type ProductivityTab = 'orders' | 'entry' | 'exit'

export function ProductivityPage() {
  const { t } = useLang()
  const [tab, setTab] = useState<ProductivityTab>('orders')

  const tabs: { key: ProductivityTab; label: string; icon: typeof LogIn }[] = [
    { key: 'orders', label: t('productivity.tabs.orders'), icon: ClipboardList },
    { key: 'entry', label: t('productivity.tabs.entry'), icon: LogIn },
    { key: 'exit', label: t('productivity.tabs.exit'), icon: LogOut }
  ]

  return (
    <section className="space-y-4">
      <div className="card-industrial p-3 sm:p-4">
        <div className="mb-3">
          <h2 className="text-lg font-black text-white">{t('productivity.title')}</h2>
          <p className="text-sm text-slate-400">{t('productivity.subtitle')}</p>
        </div>
        <nav className="flex flex-wrap gap-2">
          {tabs.map(item => {
            const Icon = item.icon
            const active = tab === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-black sm:px-4 ${
                  active ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>

      {tab === 'orders' && <ProductionOrdersPage />}
      {tab === 'entry' && <EntryProductivityPage />}
      {tab === 'exit' && <ExitProductivityPage />}
    </section>
  )
}
