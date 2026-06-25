import { Fragment, useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import type { TrainingLevel } from '../../Types/enums'
import type { EmployeeStationLevel } from '../../Types/training'
import type { Station } from '../../Types/settings'

const WORK_LEVELS: TrainingLevel[] = ['level_1', 'level_2', 'level_3', 'level_4']
const LEVEL_SHORT = ['L1', 'L2', 'L3', 'L4'] as const

const LEVEL_TONE: Record<TrainingLevel, string> = {
  level_0: 'bg-slate-800/40 text-slate-500',
  level_1: 'bg-amber-500/20 text-amber-200',
  level_2: 'bg-yellow-500/20 text-yellow-200',
  level_3: 'bg-emerald-500/20 text-emerald-200',
  level_4: 'bg-cyan-500/20 text-cyan-200'
}

type TrackDetail = {
  levelTrack: number
  label: string
  workerCount: number
  byLevel: Record<TrainingLevel, number>
}

export type StationWorkforceDetail = {
  stationId: string
  stationNumber: string
  stationName: string
  tracks: TrackDetail[]
  totalUniqueWorkers: number
  totalAssignments: number
}

type Props = {
  open: boolean
  onClose: () => void
  stations: Station[]
  levels: EmployeeStationLevel[]
  activeEmployeeIds: Set<string>
}

function sortStations(a: Station, b: Station) {
  const oa = a.sort_order ?? 0
  const ob = b.sort_order ?? 0
  if (oa !== ob) return oa - ob
  return a.station_number.localeCompare(b.station_number, undefined, { numeric: true })
}

export function buildStationWorkforceDetails(
  stations: Station[],
  levels: EmployeeStationLevel[],
  activeEmployeeIds: Set<string>
): StationWorkforceDetail[] {
  const relevant = levels.filter(l => activeEmployeeIds.has(l.employeeId))

  return stations.map(st => {
    const tracks: TrackDetail[] = LEVEL_SHORT.map((_, idx) => {
      const levelTrack = idx + 1
      const label = `${st.station_number}-${LEVEL_SHORT[idx]}`
      const rows = relevant.filter(l => l.stationId === st.id && l.levelTrack === levelTrack)
      const byLevel: Record<TrainingLevel, number> = {
        level_0: 0,
        level_1: 0,
        level_2: 0,
        level_3: 0,
        level_4: 0
      }
      rows.forEach(r => {
        byLevel[r.level]++
      })
      return { levelTrack, label, workerCount: rows.length, byLevel }
    })

    const stationRows = relevant.filter(l => l.stationId === st.id)
    const unique = new Set(stationRows.map(l => l.employeeId))

    return {
      stationId: st.id,
      stationNumber: st.station_number,
      stationName: st.station_name,
      tracks,
      totalUniqueWorkers: unique.size,
      totalAssignments: stationRows.length
    }
  })
}

export function StationTrainingSummaryModal({ open, onClose, stations, levels, activeEmployeeIds }: Props) {
  const { t } = useLang()

  const details = useMemo(
    () => buildStationWorkforceDetails([...stations].sort(sortStations), levels, activeEmployeeIds),
    [stations, levels, activeEmployeeIds]
  )

  const totals = useMemo(() => {
    let assignments = 0
    const unique = new Set<string>()
    levels.forEach(l => {
      if (!activeEmployeeIds.has(l.employeeId)) return
      assignments++
      unique.add(l.employeeId)
    })
    const withWorkers = details.filter(d => d.totalUniqueWorkers > 0).length
    return { assignments, uniqueWorkers: unique.size, stationsWithWorkers: withWorkers }
  }, [details, levels, activeEmployeeIds])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('training.stationMatrix.detailModal.title')}
      subtitle={t('training.stationMatrix.detailModal.subtitle')}
      icon={<BarChart3 className="h-5 w-5" />}
      maxWidthClass="max-w-5xl"
    >
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm">
          <span className="text-slate-500">{t('training.stationMatrix.detailModal.totalWorkers')}: </span>
          <span className="font-black text-cyan-300">{totals.uniqueWorkers}</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm">
          <span className="text-slate-500">{t('training.stationMatrix.detailModal.totalAssignments')}: </span>
          <span className="font-black text-emerald-300">{totals.assignments}</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm">
          <span className="text-slate-500">{t('training.stationMatrix.detailModal.stationsWithWorkers')}: </span>
          <span className="font-black text-violet-300">{totals.stationsWithWorkers}</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[720px] text-start text-sm">
          <thead className="bg-slate-950/90">
            <tr>
              <th className="px-3 py-2 text-xs font-black uppercase text-slate-400">
                {t('training.stationMatrix.detailModal.colStation')}
              </th>
              <th className="px-3 py-2 text-xs font-black uppercase text-slate-400">
                {t('training.stationMatrix.detailModal.colTrack')}
              </th>
              <th className="px-3 py-2 text-center text-xs font-black uppercase text-slate-400">
                {t('training.stationMatrix.detailModal.colWorkers')}
              </th>
              {WORK_LEVELS.map(l => (
                <th key={l} className="px-2 py-2 text-center text-[10px] font-black uppercase text-slate-400">
                  {t(`training.stationMatrix.lvl.${l}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {details.map(row => (
              <Fragment key={row.stationId}>
                {row.tracks.map((track, idx) => (
                  <tr key={`${row.stationId}-${track.levelTrack}`} className="bg-slate-900/20 hover:bg-slate-800/30">
                    {idx === 0 ? (
                      <td rowSpan={4} className="align-top px-3 py-2">
                        <span className="block font-bold text-slate-100" dir="ltr">
                          {row.stationNumber}
                        </span>
                        <span className="block text-xs text-slate-500">{row.stationName}</span>
                        <span className="mt-1 block text-[11px] text-cyan-300">
                          {t('training.stationMatrix.detailModal.stationTotal', { n: row.totalUniqueWorkers })}
                        </span>
                      </td>
                    ) : null}
                    <td className="px-3 py-2 font-bold text-slate-300" dir="ltr">
                      {track.label}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex min-w-[2rem] justify-center rounded-lg px-2 py-0.5 text-xs font-black ${
                          track.workerCount > 0 ? 'bg-cyan-500/15 text-cyan-200' : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {track.workerCount}
                      </span>
                    </td>
                    {WORK_LEVELS.map(l => (
                      <td key={l} className="px-2 py-2 text-center text-xs text-slate-400">
                        {track.byLevel[l] > 0 ? (
                          <span className={`rounded px-1.5 py-0.5 font-bold ${LEVEL_TONE[l]}`}>{track.byLevel[l]}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
        {totals.assignments === 0 && (
          <p className="p-6 text-center text-sm text-slate-500">{t('training.stationMatrix.detailModal.noData')}</p>
        )}
      </div>
    </Modal>
  )
}
