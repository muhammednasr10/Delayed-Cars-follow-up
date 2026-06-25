import { useCallback, useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { inputCls } from './FormField'
import { getStationManpowerHistory } from '../services/stationManpowerDailyService'
import type { StationManpowerHistoryEntry } from '../Types/stationManpowerDaily'

function currentYm(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function StationManpowerHistoryTab() {
  const { t } = useLang()
  const init = currentYm()
  const [year, setYear] = useState(init.year)
  const [month, setMonth] = useState(init.month)
  const [rows, setRows] = useState<StationManpowerHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const monthValue = `${year}-${String(month).padStart(2, '0')}`

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRows(await getStationManpowerHistory(year, month))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [year, month, t])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{t('manpower.history.title')}</h3>
            <p className="text-sm text-slate-400">{t('manpower.history.subtitle')}</p>
          </div>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-400">{t('attendance.month')}</span>
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
        </label>
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full min-w-[800px] text-start">
          <thead className="bg-slate-950/90">
            <tr>
              <th className="table-cell text-xs font-black uppercase text-slate-400">{t('manpower.history.cols.date')}</th>
              <th className="table-cell text-xs font-black uppercase text-slate-400">{t('manpower.daily.cols.number')}</th>
              <th className="table-cell text-xs font-black uppercase text-slate-400">{t('manpower.daily.cols.name')}</th>
              <th className="table-cell text-xs font-black uppercase text-violet-300">{t('manpower.history.cols.employee')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading && (
              <tr>
                <td colSpan={4} className="table-cell p-8 text-center text-slate-500">
                  {t('common.loading')}
                </td>
              </tr>
            )}
            {!loading &&
              rows.map(row => (
                <tr key={row.id} className="bg-slate-900/30 hover:bg-slate-800/40">
                  <td className="table-cell font-mono text-slate-300" dir="ltr">
                    {row.workDate}
                  </td>
                  <td className="table-cell font-mono font-bold text-white" dir="ltr">
                    {row.stationNumber}
                  </td>
                  <td className="table-cell font-bold text-slate-100">{row.stationName}</td>
                  <td className="table-cell">
                    <span className="font-bold text-violet-200">{row.employeeName}</span>
                    <span className="ms-2 font-mono text-xs text-slate-500" dir="ltr">
                      {row.employeeCode}
                    </span>
                  </td>
                </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="table-cell p-8 text-center text-slate-500">
                  {t('common.noData')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
