import { AlertOctagon } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { stopDurationMinutes } from '../../services/productionStopService'
import type { ProductionLineStop } from '../../Types/productionStop'

type Props = {
  workDate: string
  stops: ProductionLineStop[]
  compact?: boolean
}

export function ProductivityDailyStopsSummary({ workDate, stops, compact }: Props) {
  const { t } = useLang()
  const dayStops = stops.filter(s => s.startedAt.slice(0, 10) === workDate)
  const totalMinutes = dayStops.reduce((sum, s) => sum + stopDurationMinutes(s.startedAt, s.endedAt), 0)
  const totalLost = dayStops.reduce((sum, s) => sum + s.lostVehicles, 0)

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-200">
          <AlertOctagon className="h-4 w-4 text-amber-400" />
          {t('productivity.dailyStopsSummary')}
        </h3>
        <div className="flex flex-wrap gap-3 text-xs text-slate-400">
          <span>
            {t('productivity.dailyStopsCount')}: <strong className="text-slate-200">{dayStops.length}</strong>
          </span>
          <span>
            {t('productivity.dailyStopsMinutes')}: <strong className="text-slate-200">{totalMinutes}</strong>
          </span>
          <span>
            {t('productivity.dailyStopsLost')}: <strong className="text-slate-200">{totalLost}</strong>
          </span>
        </div>
      </div>

      {dayStops.length === 0 ? (
        <p className="text-sm text-slate-500">{t('productivity.dailyStopsEmpty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase text-slate-500">
                <th className="px-2 py-2 text-start">{t('productivity.stops.cols.reason')}</th>
                <th className="px-2 py-2 text-center">{t('productivity.stops.cols.department')}</th>
                <th className="px-2 py-2 text-center">{t('productivity.stops.cols.duration')}</th>
                {!compact && <th className="px-2 py-2 text-center">{t('productivity.stops.cols.lost')}</th>}
              </tr>
            </thead>
            <tbody>
              {dayStops.map(stop => (
                <tr key={stop.id} className="border-b border-slate-900/80">
                  <td className="px-2 py-2 text-start text-slate-200">{stop.stopReason || '—'}</td>
                  <td className="px-2 py-2 text-center text-slate-300">{stop.department || '—'}</td>
                  <td className="px-2 py-2 text-center text-slate-300">
                    {stopDurationMinutes(stop.startedAt, stop.endedAt)} {t('productivity.stops.minutesShort')}
                  </td>
                  {!compact && (
                    <td className="px-2 py-2 text-center text-slate-300">{stop.lostVehicles}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
