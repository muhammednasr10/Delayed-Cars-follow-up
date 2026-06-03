import { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, Clock, GraduationCap, Users } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { StatCard } from '../StatCard'
import { TrainingStatusBadge } from '../TrainingBadges'
import type { Employee } from '../../Types/employee'
import type { EmployeeTraining } from '../../Types/training'

type Props = {
  employees: Employee[]
  records: EmployeeTraining[]
}

export function TrainingExpiryDashboard({ employees, records }: Props) {
  const { t } = useLang()

  const stats = useMemo(() => {
    const qualifiedEmp = new Set(records.filter(r => r.effectiveStatus === 'qualified').map(r => r.employeeId))
    const inTrainingEmp = new Set(records.filter(r => r.effectiveStatus === 'in_training').map(r => r.employeeId))
    return {
      total: employees.filter(e => e.isActive).length,
      qualified: qualifiedEmp.size,
      inTraining: inTrainingEmp.size,
      expired: records.filter(r => r.isExpired).length,
      near: records.filter(r => r.isNearExpiry).length
    }
  }, [employees, records])

  const expiredList = records.filter(r => r.isExpired)
  const nearList = records.filter(r => r.isNearExpiry)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard title={t('training.dash.totalEmp')} value={stats.total} tone="cyan" icon={<Users className="h-6 w-6" />} />
        <StatCard title={t('training.dash.qualified')} value={stats.qualified} tone="cyan" icon={<CheckCircle2 className="h-6 w-6" />} />
        <StatCard title={t('training.dash.inTraining')} value={stats.inTraining} tone="orange" icon={<GraduationCap className="h-6 w-6" />} />
        <StatCard title={t('training.dash.expired')} value={stats.expired} tone="red" icon={<AlertTriangle className="h-6 w-6" />} />
        <StatCard title={t('training.dash.near')} value={stats.near} tone="orange" icon={<Clock className="h-6 w-6" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ExpiryList title={t('training.dash.expiredList')} rows={expiredList} />
        <ExpiryList title={t('training.dash.nearList')} rows={nearList} />
      </div>
    </div>
  )
}

function ExpiryList({ title, rows }: { title: string; rows: EmployeeTraining[] }) {
  const { t } = useLang()
  return (
    <div className="card-industrial overflow-hidden">
      <div className="border-b border-slate-800 p-4 font-black text-white">{title} ({rows.length})</div>
      <div className="divide-y divide-slate-800">
        {rows.length === 0 && <div className="p-4 text-sm text-slate-400">{t('training.empty')}</div>}
        {rows.map(r => (
          <div key={r.id} className="flex items-center justify-between gap-2 p-3">
            <div>
              <span className="font-bold text-slate-100">{r.employeeName}</span>
              <span className="block text-xs text-slate-500">{r.skillName}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrainingStatusBadge status={r.effectiveStatus} />
              <span className="text-xs text-slate-400" dir="ltr">{r.expiryDate}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
