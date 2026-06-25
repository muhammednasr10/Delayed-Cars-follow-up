import { Mail, Pencil, Phone, Power, PowerOff } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { ActiveBadge, JobRoleBadge } from './EmployeeBadges'
import type { Employee } from '../Types/employee'

type Props = {
  employees: Employee[]
  canManage: boolean
  onEdit: (e: Employee) => void
  onToggleActive: (e: Employee) => void
}

export function EmployeeTable({ employees, canManage, onEdit, onToggleActive }: Props) {
  const { t } = useLang()

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1000px] text-start">
        <thead className="bg-slate-950/90">
          <tr>
            {['code', 'name', 'role', 'assignmentStatus', 'department', 'workArea', 'manager', 'contact', 'status'].map(c => (
              <th key={c} className="table-cell text-xs font-black uppercase text-slate-400">{t(`org.f.${c === 'contact' ? 'phone' : c}`)}</th>
            ))}
            {canManage && <th className="table-cell text-xs font-black uppercase text-slate-400">{t('common.actions')}</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {employees.map(e => (
            <tr key={e.id} className="bg-slate-900/30 hover:bg-slate-800/40">
              <td className="table-cell font-black text-white" dir="ltr">{e.employeeCode}</td>
              <td className="table-cell font-bold text-slate-100">{e.fullName}</td>
              <td className="table-cell"><JobRoleBadge role={e.jobRole} /></td>
              <td className="table-cell text-slate-300">
                {e.assignmentStatus ? t(`org.assignmentStatus.${e.assignmentStatus}`) : '-'}
              </td>
              <td className="table-cell text-slate-300">{e.department ? t(`department.${e.department}`) : '-'}</td>
              <td className="table-cell text-slate-300">{e.workAreaName ?? '-'}</td>
              <td className="table-cell text-slate-300">{e.directManagerName ?? t('org.f.noManager')}</td>
              <td className="table-cell">
                <div className="flex flex-col gap-1 text-xs text-slate-300">
                  {e.phone && <span className="inline-flex items-center gap-1" dir="ltr"><Phone className="h-3 w-3 text-slate-500" />{e.phone}</span>}
                  {e.email && <span className="inline-flex items-center gap-1" dir="ltr"><Mail className="h-3 w-3 text-slate-500" />{e.email}</span>}
                  {!e.phone && !e.email && '-'}
                </div>
              </td>
              <td className="table-cell"><ActiveBadge active={e.isActive} /></td>
              {canManage && (
                <td className="table-cell">
                  <div className="flex gap-2">
                    <button onClick={() => onEdit(e)} title={t('org.edit')} className="rounded-lg bg-orange-500/15 p-2 text-orange-200 hover:bg-orange-500/25">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => onToggleActive(e)} title={e.isActive ? t('org.deactivate') : t('org.activate')} className={`rounded-lg p-2 ${e.isActive ? 'bg-red-500/15 text-red-200 hover:bg-red-500/25' : 'bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'}`}>
                      {e.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
