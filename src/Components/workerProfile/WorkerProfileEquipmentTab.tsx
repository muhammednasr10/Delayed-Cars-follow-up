import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Wrench } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { getLineEquipment } from '../../services/equipmentService'
import { fetchMyEmployeeProfile } from '../../services/workerProfileService'
import type { LineEquipment } from '../../Types/equipment'

function matchesLocation(item: LineEquipment, stationNumber: string | null, stationName: string | null, lineName: string | null): boolean {
  const loc = (item.location ?? '').toLowerCase()
  if (!loc) return false
  const tokens = [stationNumber, stationName, lineName].filter(Boolean).map(s => s!.toLowerCase())
  return tokens.some(t => loc.includes(t))
}

export function WorkerProfileEquipmentTab() {
  const { t } = useLang()
  const [all, setAll] = useState<LineEquipment[]>([])
  const [stationNumber, setStationNumber] = useState<string | null>(null)
  const [stationName, setStationName] = useState<string | null>(null)
  const [lineName, setLineName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    setLoading(true)
    setErr('')
    Promise.all([getLineEquipment(), fetchMyEmployeeProfile()])
      .then(([items, profile]) => {
        setAll(items)
        setStationNumber(profile?.stationNumber ?? null)
        setStationName(profile?.stationName ?? null)
        setLineName(profile?.lineName ?? null)
      })
      .catch(e => setErr(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false))
  }, [t])

  const items = useMemo(
    () => all.filter(i => matchesLocation(i, stationNumber, stationName, lineName)),
    [all, stationNumber, stationName, lineName]
  )

  if (loading) {
    return <div className="card-industrial p-8 text-center text-slate-400">{t('common.loading')}</div>
  }

  if (err) {
    return <div className="card-industrial p-6 text-sm text-red-300">{err}</div>
  }

  return (
    <section className="card-industrial space-y-4 p-5">
      <div className="flex items-center gap-2 text-sky-300">
        <Wrench className="h-5 w-5" />
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-400">{t('workerProfile.tabs.equipment')}</h3>
      </div>
      <p className="text-xs text-slate-500">{t('workerProfile.equipmentHint')}</p>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">{t('workerProfile.noEquipment')}</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-black text-sky-200" dir="ltr">
                    {item.equipmentCode}
                  </p>
                  <p className="text-sm text-slate-200">{item.name || t('common.unknown')}</p>
                  {item.location && <p className="text-xs text-slate-500">{item.location}</p>}
                </div>
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-300">
                  {t(`equipment.status.${item.status}`)}
                </span>
              </div>
              {item.status === 'calibration_due' && (
                <p className="mt-2 flex items-center gap-1 text-xs text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t('workerProfile.calibrationDue')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
