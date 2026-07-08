import { LogOut, Mail, Pencil, Phone, Power, PowerOff } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { ActiveBadge, EmploymentStatusBadge, JobRoleBadge } from './EmployeeBadges'
import { isFormerEmployee } from '../Utils/employeeRoster'
import type { Employee } from '../Types/employee'

type Props = {
  employees: Employee[]
  rosterVariant?: 'current' | 'former'
  canEdit: boolean
  canToggle: boolean
  canLeaveWork: boolean
  onEdit: (e: Employee) => void
  onToggleActive: (e: Employee) => void
  onLeaveWork: (e: Employee) => void
}

function formatDepartureDate(value: string | null, lang: string): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value.slice(0, 10)
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function EmployeeTable({
  employees,
  rosterVariant = 'current',
  canEdit,
  canToggle,
  canLeaveWork,
  onEdit,
  onToggleActive,
  onLeaveWork
}: Props) {
  const { t, lang } = useLang()
  const isFormerView = rosterVariant === 'former'
  const showActions = canEdit || canToggle || (canLeaveWork && !isFormerView)

  const baseCols = ['code', 'name', 'role', 'assignmentStatus', 'orgUnit', 'manager', 'contact'] as const
  const formerCols = ['employmentStatus', 'departureDate', 'departureReason'] as const
  const currentCols = ['status'] as const
  const columns = isFormerView ? [...baseCols, ...formerCols] : [...baseCols, ...currentCols]

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1000px] text-start">
        <thead className="bg-slate-950/90">
          <tr>
            {columns.map(c => (
              <th key={c} className="table-cell text-xs font-black uppercase text-slate-400">
                {t(`org.f.${c === 'contact' ? 'phone' : c}`)}
              </th>
            ))}
            {showActions && (
              <th data-export-skip className="table-cell text-xs font-black uppercase text-slate-400">
                {t('common.actions')}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {employees.map(e => (
            <tr key={e.id} className="bg-slate-900/30 hover:bg-slate-800/40">
              <td className="table-cell font-black text-white" dir="ltr">
                {e.employeeCode}
              </td>
              <td className="table-cell font-bold text-slate-100">{e.fullName}</td>
              <td className="table-cell">
                <JobRoleBadge role={e.jobRole} />
              </td>
              <td className="table-cell text-slate-300">
                {e.assignmentStatus ? t(`org.assignmentStatus.${e.assignmentStatus}`) : '-'}
              </td>
              <td className="table-cell text-slate-300">{e.orgUnitLabel ?? '-'}</td>
              <td className="table-cell text-slate-300">
                {e.directManagerNames.length > 0 ? e.directManagerNames.join('، ') : t('org.f.noManager')}
              </td>
              <td className="table-cell">
                <div className="flex flex-col gap-1 text-xs text-slate-300">
                  {e.phone && (
                    <span className="inline-flex items-center gap-1" dir="ltr">
                      <Phone className="h-3 w-3 text-slate-500" />
                      {e.phone}
                    </span>
                  )}
                  {e.email && (
                    <span className="inline-flex items-center gap-1" dir="ltr">
                      <Mail className="h-3 w-3 text-slate-500" />
                      {e.email}
                    </span>
                  )}
                  {!e.phone && !e.email && '-'}
                </div>
              </td>
              {isFormerView ? (
                <>
                  <td className="table-cell">
                    <EmploymentStatusBadge status={e.employmentStatus} />
                  </td>
                  <td className="table-cell text-slate-300">{formatDepartureDate(e.stoppedAt, lang)}</td>
                  <td className="table-cell max-w-[14rem] truncate text-slate-400" title={e.stoppedReason ?? ''}>
                    {e.stoppedReason || '—'}
                  </td>
                </>
              ) : (
                <td className="table-cell">
                  <ActiveBadge active={e.isActive} />
                </td>
              )}
              {showActions && (
                <td data-export-skip className="table-cell">
                  <div className="flex gap-2">
                    {canEdit && (
                      <button
                        onClick={() => onEdit(e)}
                        title={t('org.edit')}
                        className="rounded-lg bg-orange-500/15 p-2 text-orange-200 hover:bg-orange-500/25"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {canToggle && !isFormerView && e.isActive && (
                      <button
                        onClick={() => onToggleActive(e)}
                        title={t('permissions.suspendEmployee')}
                        className="rounded-lg bg-red-500/15 p-2 text-red-200 hover:bg-red-500/25"
                      >
                        <PowerOff className="h-4 w-4" />
                      </button>
                    )}
                    {canToggle && !isFormerView && !e.isActive && !isFormerEmployee(e) && (
                      <button
                        onClick={() => onToggleActive(e)}
                        title={t('permissions.reactivateEmployee')}
                        className="rounded-lg bg-emerald-500/15 p-2 text-emerald-200 hover:bg-emerald-500/25"
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    )}
                    {canToggle && isFormerView && isFormerEmployee(e) && (
                      <button
                        onClick={() => onToggleActive(e)}
                        title={t('permissions.reactivateEmployee')}
                        className="rounded-lg bg-emerald-500/15 p-2 text-emerald-200 hover:bg-emerald-500/25"
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    )}
                    {canLeaveWork && !isFormerView && e.isActive && !isFormerEmployee(e) && (
                      <button
                        onClick={() => onLeaveWork(e)}
                        title={t('org.leaveWork')}
                        className="rounded-lg bg-violet-500/15 p-2 text-violet-200 hover:bg-violet-500/25"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    )}
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
