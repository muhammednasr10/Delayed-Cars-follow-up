import { useState } from 'react'
import { CalendarClock, ClipboardList } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { EmployeeAttendanceTab } from './EmployeeAttendanceTab'
import { TodayAttendanceTab } from './TodayAttendanceTab'
import type { Employee } from '../Types/employee'

type AttendanceSubTab = 'monthly' | 'today'

type Props = {
  employees: Employee[]
  canManage: boolean
}

export function WorkforceAttendanceSection({ employees, canManage }: Props) {
  const { t } = useLang()
  const [subTab, setSubTab] = useState<AttendanceSubTab>('monthly')

  const subTabs: { key: AttendanceSubTab; label: string; icon: typeof ClipboardList }[] = [
    { key: 'monthly', label: t('training.attendanceTabs.monthly'), icon: ClipboardList },
    { key: 'today', label: t('training.attendanceTabs.today'), icon: CalendarClock }
  ]

  return (
    <section className="space-y-4">
      <div className="card-industrial p-3 sm:p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="rounded-xl bg-violet-500/15 p-2.5 text-violet-300">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{t('attendance.title')}</h3>
            <p className="text-sm text-slate-400">{t('attendance.subtitle')}</p>
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
        {subTab === 'monthly' && <EmployeeAttendanceTab employees={employees} canManage={canManage} />}
        {subTab === 'today' && <TodayAttendanceTab employees={employees} canManage={canManage} />}
      </div>
    </section>
  )
}
