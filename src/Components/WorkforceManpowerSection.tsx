import { useState } from 'react'
import { ClipboardList, History, Users } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { StationManpowerDailyTab } from './StationManpowerDailyTab'
import { StationManpowerHistoryTab } from './StationManpowerHistoryTab'
import type { Employee } from '../Types/employee'
import type { Station, VehicleModel } from '../Types/settings'

type ManpowerSubTab = 'daily' | 'history'

type Props = {
  stations: Station[]
  employees: Employee[]
  models: VehicleModel[]
  canManage: boolean
}

export function WorkforceManpowerSection({ stations, employees, models, canManage }: Props) {
  const { t } = useLang()
  const [subTab, setSubTab] = useState<ManpowerSubTab>('daily')

  const subTabs: { key: ManpowerSubTab; label: string; icon: typeof ClipboardList }[] = [
    { key: 'daily', label: t('manpower.tabs.daily'), icon: ClipboardList },
    { key: 'history', label: t('manpower.tabs.history'), icon: History }
  ]

  return (
    <section className="space-y-4">
      <div className="card-industrial p-3 sm:p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="rounded-xl bg-violet-500/15 p-2.5 text-violet-300">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{t('training.tabs.manpower')}</h3>
            <p className="text-sm text-slate-400">{t('manpower.sectionSubtitle')}</p>
          </div>
        </div>
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

      <div className="card-industrial overflow-hidden">
        {subTab === 'daily' && (
          <StationManpowerDailyTab stations={stations} employees={employees} models={models} canManage={canManage} />
        )}
        {subTab === 'history' && <StationManpowerHistoryTab />}
      </div>
    </section>
  )
}
