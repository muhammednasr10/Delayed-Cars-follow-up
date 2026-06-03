import { useLang } from '../i18n/LanguageContext'
import type { TrainingStatus } from '../Types/enums'
import type { Employee } from '../Types/employee'
import type { EmployeeTraining, TrainingSkill } from '../Types/training'

type Props = {
  employees: Employee[]
  skills: TrainingSkill[]
  records: EmployeeTraining[]
  canManage: boolean
  onCell: (employee: Employee, skill: TrainingSkill, record: EmployeeTraining | null) => void
}

const CELL_TONE: Record<TrainingStatus, string> = {
  qualified: 'bg-emerald-500/20 text-emerald-100',
  in_training: 'bg-yellow-500/20 text-yellow-100',
  not_trained: 'bg-red-500/20 text-red-100',
  expired: 'bg-orange-500/25 text-orange-100',
  suspended: 'bg-slate-700 text-slate-300'
}

const LEVEL_SHORT = ['L0', 'L1', 'L2', 'L3', 'L4']

export function MatrixGrid({ employees, skills, records, canManage, onCell }: Props) {
  const { t } = useLang()
  const activeSkills = skills.filter(s => s.isActive)
  const map = new Map<string, EmployeeTraining>()
  records.forEach(r => map.set(`${r.employeeId}:${r.skillId}`, r))

  if (employees.length === 0 || activeSkills.length === 0) {
    return <div className="p-8 text-center text-slate-400">{t('training.empty')}</div>
  }

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-start text-sm">
        <thead className="bg-slate-950/90">
          <tr>
            <th className="sticky start-0 z-10 bg-slate-950/90 px-3 py-2 text-start text-xs font-black uppercase text-slate-400">{t('training.rec.employee')}</th>
            {activeSkills.map(s => (
              <th key={s.id} className="px-2 py-2 text-center text-[11px] font-bold text-slate-300" title={s.skillNameAr || s.skillNameEn || s.skillCode}>
                {s.skillCode}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => (
            <tr key={emp.id} className="border-t border-slate-800">
              <td className="sticky start-0 z-10 bg-slate-900 px-3 py-2 font-bold text-slate-100">
                <span className="block">{emp.fullName}</span>
                <span className="block text-[10px] text-slate-500" dir="ltr">{emp.employeeCode}</span>
              </td>
              {activeSkills.map(s => {
                const rec = map.get(`${emp.id}:${s.id}`) ?? null
                const tone = rec ? CELL_TONE[rec.effectiveStatus] : 'bg-slate-800/40 text-slate-600'
                return (
                  <td key={s.id} className="p-1 text-center">
                    <button
                      type="button"
                      disabled={!canManage}
                      onClick={() => onCell(emp, s, rec)}
                      className={`min-w-12 rounded-lg px-2 py-1 text-xs font-bold ${tone} ${canManage ? 'cursor-pointer hover:ring-1 hover:ring-cyan-400/50' : 'cursor-default'}`}
                      title={rec ? t(`trainingStatus.${rec.effectiveStatus}`) : t('training.notRequired')}
                    >
                      {rec ? LEVEL_SHORT[rec.levelRank] : '—'}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
