import { useMemo, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { TrainingLevelBadge } from '../TrainingBadges'
import { computeStationQualifications } from '../../services/trainingService'
import type { Employee } from '../../Types/employee'
import type { EmployeeTraining, StationRequiredSkill } from '../../Types/training'
import type { Station } from '../../Types/settings'

type Props = {
  employees: Employee[]
  required: StationRequiredSkill[]
  records: EmployeeTraining[]
  stations: Station[]
}

export function StationQualificationTab({ employees, required, records, stations }: Props) {
  const { t } = useLang()
  const [stationId, setStationId] = useState('')

  const station = stations.find(s => s.id === stationId)
  const stationRequired = useMemo(() => required.filter(r => r.isActive && r.stationId === stationId), [required, stationId])
  const mandatoryCount = stationRequired.filter(r => r.isMandatory).length

  const quals = useMemo(() => {
    if (!stationId) return []
    return computeStationQualifications(
      stationId,
      required,
      records,
      employees.map(e => ({ id: e.id, employeeCode: e.employeeCode, fullName: e.fullName, jobRole: e.jobRole, isActive: e.isActive }))
    )
  }, [stationId, required, records, employees])

  const qualified = quals.filter(q => q.qualified)
  const notQualified = quals.filter(q => !q.qualified)

  return (
    <div className="space-y-4">
      <div className="card-industrial p-4">
        <select className="input-dark max-w-md" value={stationId} onChange={e => setStationId(e.target.value)}>
          <option value="">{t('training.qual.pick')}</option>
          {stations.map(s => <option key={s.id} value={s.id}>{s.station_number} - {s.station_name}</option>)}
        </select>
      </div>

      {!stationId ? (
        <div className="card-industrial p-8 text-center text-slate-400">{t('training.qual.pick')}</div>
      ) : (
        <>
          <div className="card-industrial p-4">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="font-black text-white">{station?.station_number} - {station?.station_name}</span>
              {station?.line_name && <span className="text-sm text-slate-400">{t('station.line')}: {station.line_name}</span>}
              {station?.work_areas?.name && <span className="text-sm text-slate-400">{t('station.area')}: {station.work_areas.name}</span>}
            </div>
            <h4 className="mb-2 text-sm font-black uppercase text-cyan-300">{t('training.qual.required')}</h4>
            {stationRequired.length === 0 ? (
              <p className="text-sm text-amber-300">{t('training.qual.noReq')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {stationRequired.map(r => (
                  <span key={r.id} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-sm">
                    <span className="font-bold text-slate-100">{r.skillName}</span>
                    <TrainingLevelBadge level={r.requiredLevel} />
                    {!r.isMandatory && <span className="text-[10px] text-slate-500">({t('common.no')})</span>}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card-industrial overflow-hidden">
              <div className="flex items-center gap-2 border-b border-slate-800 p-4 text-emerald-300"><CheckCircle2 className="h-5 w-5" /><span className="font-black">{t('training.qual.qualified')} ({qualified.length})</span></div>
              <div className="divide-y divide-slate-800">
                {mandatoryCount === 0 && <div className="p-4 text-sm text-slate-400">{t('training.qual.noReq')}</div>}
                {mandatoryCount > 0 && qualified.length === 0 && <div className="p-4 text-sm text-slate-400">{t('training.qual.none')}</div>}
                {qualified.map(q => (
                  <div key={q.employeeId} className="flex items-center justify-between p-3">
                    <span className="font-bold text-slate-100">{q.employeeName}</span>
                    <span className="text-xs text-slate-500" dir="ltr">{q.employeeCode}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-industrial overflow-hidden">
              <div className="flex items-center gap-2 border-b border-slate-800 p-4 text-red-300"><XCircle className="h-5 w-5" /><span className="font-black">{t('training.qual.notQualified')} ({notQualified.length})</span></div>
              <div className="divide-y divide-slate-800">
                {notQualified.map(q => (
                  <div key={q.employeeId} className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100">{q.employeeName}</span>
                      <span className="text-xs text-slate-500" dir="ltr">{q.employeeCode}</span>
                    </div>
                    <ul className="mt-1 space-y-0.5">
                      {q.gaps.map(g => (
                        <li key={g.skillId} className="text-xs text-slate-400">
                          <span className="text-slate-300">{g.skillName}</span> — {t(`qualReason.${g.reason}`)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
