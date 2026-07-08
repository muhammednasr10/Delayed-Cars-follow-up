import { useState } from 'react'
import { CalendarClock, CalendarRange, ClipboardList } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { useNavigation } from '../Context/NavigationContext'
import { EmployeeAttendanceTab } from './EmployeeAttendanceTab'
import { EmployeeYearAttendanceTab } from './EmployeeYearAttendanceTab'
import { TodayAttendanceTab } from './TodayAttendanceTab'
import type { Employee } from '../Types/employee'

type Props = {
  employees: Employee[]
  canManage: boolean
}

export function WorkforceAttendanceSection({ employees, canManage }: Props) {
  const { t } = useLang()
  const { attendanceSubTab, setAttendanceSubTab } = useNavigation()
  const [monthlyRefreshKey, setMonthlyRefreshKey] = useState(0)

  const subTabs = [
    { key: 'monthly' as const, label: t('training.attendanceTabs.monthly'), icon: ClipboardList },
    { key: 'yearly' as const, label: t('training.attendanceTabs.yearly'), icon: CalendarRange },
    { key: 'today' as const, label: t('training.attendanceTabs.today'), icon: CalendarClock }
  ]

  return (
    <section className="space-y-4">
      <nav className="flex flex-wrap gap-2">
        {subTabs.map(item => {
          const Icon = item.icon
          const active = attendanceSubTab === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                if (item.key === 'monthly' || item.key === 'yearly') setMonthlyRefreshKey(k => k + 1)
                setAttendanceSubTab(item.key)
              }}
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

      <div className="card-industrial overflow-hidden">
        {attendanceSubTab === 'monthly' && (
          <EmployeeAttendanceTab employees={employees} canManage={canManage} refreshKey={monthlyRefreshKey} />
        )}
        {attendanceSubTab === 'yearly' && (
          <EmployeeYearAttendanceTab employees={employees} refreshKey={monthlyRefreshKey} />
        )}
        {attendanceSubTab === 'today' && (
          <TodayAttendanceTab
            employees={employees}
            canManage={canManage}
            onSaved={() => setMonthlyRefreshKey(k => k + 1)}
          />
        )}
      </div>
    </section>
  )
}
