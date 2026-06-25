import { useState } from 'react'
import { CalendarDays, CalendarRange } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { VehiclesPage } from './VehiclesPage'
import { EntryProductivityMonthlyTab } from '../../Components/EntryProductivityMonthlyTab'

type EntrySubTab = 'daily' | 'monthly'

export function EntryProductivityPage() {
  const { t } = useLang()
  const [subTab, setSubTab] = useState<EntrySubTab>('daily')

  const subTabs: { key: EntrySubTab; label: string; icon: typeof CalendarRange }[] = [
    { key: 'daily', label: t('productivity.entrySubTabs.daily'), icon: CalendarRange },
    { key: 'monthly', label: t('productivity.entrySubTabs.monthly'), icon: CalendarDays }
  ]

  return (
    <section className="space-y-4">
      <div className="card-industrial p-3">
        <nav className="flex flex-wrap gap-2">
          {subTabs.map(item => {
            const Icon = item.icon
            const active = subTab === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setSubTab(item.key)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-black sm:px-4 ${
                  active ? 'bg-violet-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>

      {subTab === 'daily' && <VehiclesPage mode="entry" />}
      {subTab === 'monthly' && <EntryProductivityMonthlyTab />}
    </section>
  )
}
