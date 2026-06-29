import { useEffect, useState } from 'react'
import { MapPin, Wrench } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useStationOperations } from '../../hooks/useStationOperations'
import { getVehicleModels } from '../../services/settingsService'
import { fetchMyStationWork, type MyStationWorkContext } from '../../services/workerProfileService'
import type { VehicleModel } from '../../Types/settings'

export function WorkerProfileStationTab() {
  const { t } = useLang()
  const { parentGroups, loading: opsLoading } = useStationOperations()
  const [models, setModels] = useState<VehicleModel[]>([])
  const [work, setWork] = useState<MyStationWorkContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    getVehicleModels().then(setModels).catch(() => setModels([]))
  }, [])

  useEffect(() => {
    if (opsLoading) return
    setLoading(true)
    setErr('')
    void fetchMyStationWork(parentGroups, models)
      .then(setWork)
      .catch(e => setErr(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false))
  }, [opsLoading, parentGroups, models, t])

  if (loading || opsLoading) {
    return <div className="card-industrial p-8 text-center text-slate-400">{t('common.loading')}</div>
  }

  if (err) {
    return <div className="card-industrial p-6 text-sm text-red-300">{err}</div>
  }

  if (!work) {
    return <div className="card-industrial p-6 text-center text-sm text-amber-200">{t('workerProfile.noEmployeeLink')}</div>
  }

  if (!work.hasAllocation) {
    return (
      <div className="card-industrial space-y-3 p-6 text-center">
        <MapPin className="mx-auto h-8 w-8 text-slate-600" />
        <p className="text-sm text-amber-200">{t('workerProfile.noAllocationToday')}</p>
        <p className="text-xs text-slate-500">{t('workerProfile.noAllocationTodayHint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="card-industrial space-y-3 p-5">
        <div className="flex items-center gap-2 text-violet-300">
          <MapPin className="h-5 w-5" />
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-400">{t('workerProfile.todayStation')}</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3">
            <p className="text-[10px] font-bold uppercase text-slate-500">{t('workerProfile.workerLine')}</p>
            <p className="mt-1 font-mono text-lg font-black text-violet-200" dir="ltr">
              {work.workerLineCode}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {[work.stationNumber, work.stationName].filter(Boolean).join(' — ')}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <p className="text-[10px] font-bold uppercase text-slate-500">{t('workerProfile.allocationDate')}</p>
            <p className="mt-1 font-mono font-bold text-slate-200" dir="ltr">
              {work.allocationDate}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{t('workerProfile.fromManpower')}</p>
          </div>
        </div>
      </section>

      {work.byModel.map(group => (
        <section key={group.modelId ?? group.modelName} className="card-industrial p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Wrench className="h-5 w-5 text-cyan-400" />
            <h3 className="text-base font-black text-white">{group.modelName}</h3>
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-400" dir="ltr">
              {group.workerLineCode}
            </span>
            <span className="ms-auto text-xs text-slate-500">
              {group.operations.length} {t('operations.opsCount')}
            </span>
          </div>

          {group.operations.length === 0 ? (
            <p className="text-sm text-slate-500">{t('workerProfile.noOperationsForModel')}</p>
          ) : (
            <ul className="space-y-2">
              {group.operations.map(op => (
                <li key={op.id} className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-sm">
                  <p className="font-bold text-slate-200">{op.operationNameAr}</p>
                  <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-slate-500">
                    {op.standardTimeMinutes != null && (
                      <span>
                        {op.standardTimeMinutes} {t('operations.minUnit')}
                      </span>
                    )}
                    {op.operationType && <span dir="ltr">{op.operationType}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
