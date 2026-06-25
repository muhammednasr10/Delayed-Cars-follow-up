import { useCallback, useEffect, useMemo, useState } from 'react'
import { Medal, RefreshCcw, Trophy } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useEmployees } from '../../hooks/useEmployees'
import { inputCls } from '../FormField'
import { getTeamMissions } from '../../services/missionService'
import { computeMissionLeaderboard } from '../../Utils/missionLeaderboard'
import type { MissionLeaderboardRow } from '../../Types/mission'

function currentYm() {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function isSchemaMissing(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('schema cache') || m.includes('could not find the table') || m.includes('does not exist')
}

const podiumTones = [
  'border-amber-400/50 bg-gradient-to-b from-amber-500/25 to-amber-500/5 text-amber-100',
  'border-slate-400/40 bg-gradient-to-b from-slate-400/20 to-slate-500/5 text-slate-100',
  'border-orange-600/40 bg-gradient-to-b from-orange-700/25 to-orange-800/5 text-orange-100'
]

const medalIcons = [
  <Medal key="1" className="mx-auto h-8 w-8 text-amber-300" />,
  <Medal key="2" className="mx-auto h-8 w-8 text-slate-300" />,
  <Medal key="3" className="mx-auto h-8 w-8 text-orange-400" />
]

export function MissionsLeaderboardTab() {
  const { t } = useLang()
  const { employees } = useEmployees()
  const init = currentYm()
  const [year, setYear] = useState(init.year)
  const [month, setMonth] = useState(init.month)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [setupRequired, setSetupRequired] = useState(false)
  const [rows, setRows] = useState<MissionLeaderboardRow[]>([])

  const monthValue = `${year}-${String(month).padStart(2, '0')}`

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const missions = await getTeamMissions()
      setRows(computeMissionLeaderboard(missions, employees, year, month))
      setSetupRequired(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error')
      setSetupRequired(isSchemaMissing(msg))
      setError(msg)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [employees, month, t, year])

  useEffect(() => {
    void load()
  }, [load])

  const podium = useMemo(() => rows.slice(0, 3), [rows])
  const rest = useMemo(() => rows.slice(3), [rows])

  return (
    <div className="space-y-4">
      <div className="card-industrial flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-500/15 p-3 text-amber-300">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{t('missions.leaderboardTitle')}</h3>
            <p className="text-sm text-slate-400">{t('missions.leaderboardHint')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            className={inputCls()}
            value={monthValue}
            onChange={e => {
              const [y, m] = e.target.value.split('-').map(Number)
              if (y && m) {
                setYear(y)
                setMonth(m)
              }
            }}
          />
          <button type="button" onClick={() => void load()} className="rounded-xl bg-slate-800 px-3 py-2 text-slate-200 hover:bg-slate-700">
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {setupRequired && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-bold">{t('missions.setupTitle')}</p>
          <p className="mt-1 text-amber-200/80">{t('missions.setupHint')}</p>
        </div>
      )}

      {error && !setupRequired && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      {loading ? (
        <div className="card-industrial p-12 text-center text-slate-500">{t('common.loading')}</div>
      ) : rows.length === 0 ? (
        <div className="card-industrial p-12 text-center text-slate-500">{t('missions.leaderboardEmpty')}</div>
      ) : (
        <>
          {podium.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {podium.map((row, index) => (
                <div key={row.employeeId} className={`card-industrial border p-5 text-center ${podiumTones[index]}`}>
                  {medalIcons[index]}
                  <p className="mt-2 text-xs font-black uppercase tracking-wider text-slate-400">
                    {t('missions.rank', { n: index + 1 })}
                  </p>
                  <p className="mt-1 text-lg font-black">{row.employeeName}</p>
                  <p className="text-xs text-slate-400">{row.employeeCode}</p>
                  <p className="mt-3 text-3xl font-black">{row.completedCount}</p>
                  <p className="text-xs text-slate-400">{t('missions.completedMissions')}</p>
                </div>
              ))}
            </div>
          )}

          <div className="card-industrial overflow-x-auto">
            <table className="w-full text-center text-sm">
              <thead className="bg-slate-950/90">
                <tr>
                  <th className="table-cell px-3 py-2.5 font-black text-slate-400">{t('missions.cols.rank')}</th>
                  <th className="table-cell px-3 py-2.5 font-black text-slate-400">{t('missions.cols.assignee')}</th>
                  <th className="table-cell px-3 py-2.5 font-black text-slate-400">{t('missions.cols.completed')}</th>
                  <th className="table-cell px-3 py-2.5 font-black text-slate-400">{t('missions.cols.active')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((row, index) => (
                  <tr key={row.employeeId} className="bg-slate-900/30">
                    <td className="table-cell px-3 py-2.5 font-black text-amber-300">{index + 1}</td>
                    <td className="table-cell px-3 py-2.5">
                      <p className="font-bold text-slate-200">{row.employeeName}</p>
                      <p className="text-xs text-slate-500">{row.employeeCode}</p>
                    </td>
                    <td className="table-cell px-3 py-2.5 text-lg font-black text-emerald-300">{row.completedCount}</td>
                    <td className="table-cell px-3 py-2.5 text-slate-300">{row.activeCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rest.length === 0 && podium.length > 0 && podium.length < 3 && null}
        </>
      )}
    </div>
  )
}
