import { useState } from 'react'
import { ChevronDown, Users } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { StationManpowerAssignCell } from './StationManpowerAssignCell'
import { formatStationWorkerDisplayCode } from '../Utils/stationHierarchy'
import type { ManpowerStationGroup } from '../Utils/stationManpowerGroups'
import type { Employee } from '../Types/employee'

type Props = {
  group: ManpowerStationGroup
  employees: Employee[]
  canManage: boolean
  operationsMode?: 'compare' | 'readonly'
  getOperationsComparison?: (stationId: string) => string
  headcount?: number
  onEmployeeIds: (stationId: string, employeeIds: string[]) => void
}

export function StationManpowerParentGroup({
  group,
  employees,
  canManage,
  operationsMode = 'readonly',
  getOperationsComparison,
  headcount,
  onEmployeeIds
}: Props) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const workerCount = headcount ?? group.workers.length

  const operationsHeader =
    operationsMode === 'compare'
      ? t('manpower.daily.cols.operationsCompare')
      : t('manpower.daily.cols.operationsName')

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/30">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-3 border-b border-slate-800 bg-slate-950/80 px-4 py-3 text-start transition hover:bg-slate-900/80"
        aria-expanded={open}
      >
        <ChevronDown className={`h-5 w-5 shrink-0 text-cyan-300 transition-transform ${open ? '' : '-rotate-90'}`} />
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 text-center sm:grid-cols-3">
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-500">{t('manpower.daily.cols.number')}</p>
            <p className="mt-0.5 font-mono text-sm font-black text-cyan-200" dir="ltr">
              {group.displayCode}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-500">{t('settings.cols.stationName')}</p>
            <p className="mt-0.5 text-sm font-bold text-slate-100">{group.parentName || '—'}</p>
          </div>
          <div className="hidden sm:block">
            <p className="text-[10px] font-bold uppercase text-slate-500">{t('operations.totalWorkers')}</p>
            <p className="mt-0.5 inline-flex items-center justify-center gap-1 text-sm font-bold text-slate-300">
              <Users className="h-3.5 w-3.5" />
              {workerCount}
            </p>
          </div>
        </div>
        {!open && (
          <span className="shrink-0 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-400">
            {workerCount} {t('manpower.daily.workerLines')}
          </span>
        )}
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-center">
            <thead className="bg-slate-950/90">
              <tr>
                <th className="table-cell text-xs font-black uppercase text-slate-400">
                  {t('manpower.daily.cols.workerLine')}
                </th>
                <th className="table-cell text-xs font-black uppercase text-slate-400">
                  {operationsHeader}
                </th>
                <th className="table-cell text-xs font-black uppercase text-violet-300">
                  {t('manpower.daily.cols.manpower')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {group.workers.map(worker => (
                <tr key={worker.stationId} className="bg-slate-900/20 hover:bg-slate-800/30">
                  <td className="table-cell font-mono text-sm font-bold text-white" dir="ltr">
                    {formatStationWorkerDisplayCode(worker.stationNumber)}
                  </td>
                  <td className="table-cell">
                    {operationsMode === 'compare' ? (
                      <p className="mx-auto max-w-md px-2 text-sm leading-relaxed text-slate-200">
                        {getOperationsComparison?.(worker.stationId) ?? '—'}
                      </p>
                    ) : (
                      <p className="mx-auto max-w-md px-2 text-sm text-slate-200">
                        {worker.operationsSummary?.trim() || '—'}
                      </p>
                    )}
                  </td>
                  <td className="table-cell min-w-[300px] text-start">
                    <StationManpowerAssignCell
                      employees={employees}
                      selectedIds={worker.employeeIds}
                      canManage={canManage}
                      onChange={ids => onEmployeeIds(worker.stationId, ids)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
