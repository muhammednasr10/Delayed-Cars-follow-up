import { useCallback, useEffect, useState } from 'react'
import { Save, Users } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { inputCls } from './FormField'
import { StationManpowerAssignCell } from './StationManpowerAssignCell'
import { formatStationWorkerDisplayCode } from '../Utils/stationHierarchy'
import { localTodayIso } from '../services/attendanceService'
import {
  buildStationManpowerDayRows,
  getStationManpowerForDate,
  saveStationManpowerForDate
} from '../services/stationManpowerDailyService'
import { compareEmployees } from '../services/employeesService'
import type { Employee } from '../Types/employee'
import type { Station } from '../Types/settings'
import type { StationManpowerDayEdit } from '../Types/stationManpowerDaily'

type Props = {
  stations: Station[]
  employees: Employee[]
  canManage: boolean
}

export function StationManpowerDailyTab({ stations, employees, canManage }: Props) {
  const { t } = useLang()
  const [workDate, setWorkDate] = useState(localTodayIso())
  const [rows, setRows] = useState<StationManpowerDayEdit[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const activeEmployees = [...employees].filter(e => e.isActive).sort(compareEmployees)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const saved = await getStationManpowerForDate(workDate)
      setRows(buildStationManpowerDayRows(stations, saved))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [workDate, stations, t])

  useEffect(() => {
    void load()
  }, [load])

  function setEmployeeIds(stationId: string, employeeIds: string[]) {
    setRows(prev => prev.map(row => (row.stationId === stationId ? { ...row, employeeIds } : row)))
    setSuccess('')
  }

  async function save() {
    if (!canManage) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await saveStationManpowerForDate(
        workDate,
        rows.map(row => ({ stationId: row.stationId, employeeIds: row.employeeIds }))
      )
      setSuccess(t('manpower.daily.saved'))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{t('manpower.daily.title')}</h3>
            <p className="text-sm text-slate-400">{t('manpower.daily.subtitle')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-400">{t('manpower.date')}</span>
            <input type="date" className={inputCls()} value={workDate} onChange={e => setWorkDate(e.target.value)} />
          </label>
          {canManage && (
            <button
              type="button"
              disabled={saving || loading}
              onClick={() => void save()}
              className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
            >
              <Save className="mr-1 inline h-4 w-4" /> {saving ? t('common.saving') : t('common.save')}
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-500">{t('manpower.daily.hint')}</p>
      {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>}
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        {loading ? (
          <p className="p-8 text-center text-slate-500">{t('common.loading')}</p>
        ) : (
          <table className="w-full min-w-[720px] text-start">
            <thead className="bg-slate-950/90">
              <tr>
                <th className="table-cell text-xs font-black uppercase text-slate-400">{t('manpower.daily.cols.number')}</th>
                <th className="table-cell text-xs font-black uppercase text-slate-400">{t('manpower.daily.cols.name')}</th>
                <th className="table-cell text-xs font-black uppercase text-violet-300">{t('manpower.daily.cols.manpower')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map(row => (
                <tr key={row.stationId} className="bg-slate-900/30 hover:bg-slate-800/40">
                  <td className="table-cell font-mono font-bold text-white" dir="ltr">
                    {formatStationWorkerDisplayCode(row.stationNumber)}
                  </td>
                  <td className="table-cell">
                    <p className="font-bold text-slate-100">{row.stationName}</p>
                    {row.laborSummary && (
                      <p className="mt-1 whitespace-pre-line text-xs text-slate-500">{row.laborSummary}</p>
                    )}
                  </td>
                  <td className="table-cell min-w-[300px]">
                    <StationManpowerAssignCell
                      employees={activeEmployees}
                      selectedIds={row.employeeIds}
                      canManage={canManage}
                      onChange={ids => setEmployeeIds(row.stationId, ids)}
                    />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="table-cell p-8 text-center text-slate-500">
                    {t('manpower.daily.noStations')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
