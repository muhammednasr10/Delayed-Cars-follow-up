import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarRange, Download, RefreshCw, Search } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { JobRoleBadge } from './EmployeeBadges'
import { inputCls } from './FormField'
import { getAttendanceDaysForYear, getYearlyAttendanceSummaries } from '../services/attendanceService'
import { exportAttendanceYearExcel } from '../Utils/attendanceExcel'
import type { EmployeeAttendanceSummary } from '../Types/attendance'
import type { Employee } from '../Types/employee'
import { compareEmployees } from '../services/employeesService'
import { findEmployeesByQuery } from '../Utils/employeeLookup'

type Props = {
  employees: Employee[]
  refreshKey?: number
}

function currentYear(): number {
  return new Date().getFullYear()
}

export function EmployeeYearAttendanceTab({ employees, refreshKey = 0 }: Props) {
  const { t } = useLang()
  const [year, setYear] = useState(currentYear())
  const [summaries, setSummaries] = useState<EmployeeAttendanceSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const empIds = new Set(employees.filter(e => e.isActive).map(e => e.id))
      const data = (await getYearlyAttendanceSummaries(year, true)).filter(s => empIds.has(s.employeeId))
      const order = new Map(employees.map((e, i) => [e.id, i]))
      data.sort((a, b) => {
        const ea = employees.find(e => e.id === a.employeeId)
        const eb = employees.find(e => e.id === b.employeeId)
        if (ea && eb) return compareEmployees(ea, eb)
        return (order.get(a.employeeId) ?? 0) - (order.get(b.employeeId) ?? 0)
      })
      setSummaries(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [year, employees, t, refreshKey])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const id = window.setInterval(() => void load(), 45_000)
    return () => window.clearInterval(id)
  }, [load])

  const [searchQuery, setSearchQuery] = useState('')

  const sortedByIssues = useMemo(
    () => [...summaries].sort((a, b) => b.issueDays - a.issueDays || b.absentDays - a.absentDays),
    [summaries]
  )

  const filteredSummaries = useMemo(() => {
    const q = searchQuery.trim()
    if (!q) return sortedByIssues
    const matchedIds = new Set(findEmployeesByQuery(employees, q, 500).map(e => e.id))
    return sortedByIssues.filter(s => matchedIds.has(s.employeeId))
  }, [sortedByIssues, searchQuery, employees])

  const totals = useMemo(
    () =>
      filteredSummaries.reduce(
        (acc, s) => ({
          present: acc.present + s.presentDays,
          absent: acc.absent + s.absentDays,
          vacation: acc.vacation + s.vacationDays,
          sick: acc.sick + s.sickDays,
          issues: acc.issues + s.issueDays
        }),
        { present: 0, absent: 0, vacation: 0, sick: 0, issues: 0 }
      ),
    [filteredSummaries]
  )

  async function handleExport() {
    try {
      const days = await getAttendanceDaysForYear(year)
      const empById = new Map(employees.map(e => [e.id, e]))
      const rows = days.map(d => {
        const e = empById.get(d.employeeId)
        return {
          employeeCode: e?.employeeCode ?? '',
          fullName: e?.fullName ?? '',
          workDate: d.workDate,
          status: d.status,
          checkIn: d.checkIn,
          checkOut: d.checkOut,
          notes: d.notes
        }
      })
      exportAttendanceYearExcel(year, rows, summaries)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
            <CalendarRange className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{t('attendance.yearly.title')}</h3>
            <p className="text-sm text-slate-400">{t('attendance.yearly.subtitle')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-400">{t('attendance.year')}</span>
            <input
              type="number"
              className={`${inputCls()} w-28`}
              value={year}
              min={2020}
              max={2100}
              onChange={e => {
                const y = Number(e.target.value)
                if (y >= 2020 && y <= 2100) setYear(y)
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
          >
            <RefreshCw className={`mr-1 inline h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> {t('common.refresh')}
          </button>
          <button
            type="button"
            onClick={() => void handleExport()}
            className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-200 hover:bg-cyan-500/20"
          >
            <Download className="mr-1 inline h-4 w-4" /> {t('attendance.export')}
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      <p className="text-xs text-slate-500">{t('attendance.yearly.hint')}</p>

      <label className="block space-y-1.5">
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
          <Search className="h-3.5 w-3.5" />
          {t('attendance.monthly.search')}
        </span>
        <input
          className={inputCls()}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t('attendance.monthly.searchPh')}
        />
      </label>

      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full min-w-[720px] text-start">
          <thead className="bg-slate-950/90">
            <tr>
              {['code', 'name', 'role', 'present', 'absent', 'vacation', 'sick', 'total'].map(c => (
                <th key={c} className="table-cell text-xs font-black uppercase text-slate-400">
                  {t(`attendance.cols.${c}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading && (
              <tr>
                <td colSpan={8} className="table-cell text-center text-slate-500">
                  {t('common.loading')}
                </td>
              </tr>
            )}
            {!loading && filteredSummaries.length === 0 && (
              <tr>
                <td colSpan={8} className="table-cell text-center text-slate-500">
                  {t('common.noData')}
                </td>
              </tr>
            )}
            {!loading &&
              filteredSummaries.map(s => (
                <tr key={s.employeeId} className="bg-slate-900/30 hover:bg-slate-800/40">
                  <td className="table-cell font-mono font-bold text-white" dir="ltr">
                    {s.employeeCode}
                  </td>
                  <td className="table-cell font-bold text-slate-100">{s.fullName}</td>
                  <td className="table-cell">
                    <JobRoleBadge role={s.jobRole as Employee['jobRole']} />
                  </td>
                  <td className="table-cell text-emerald-300">{s.presentDays || '—'}</td>
                  <td className="table-cell text-red-300">{s.absentDays || '—'}</td>
                  <td className="table-cell text-amber-300">{s.vacationDays || '—'}</td>
                  <td className="table-cell text-orange-300">{s.sickDays || '—'}</td>
                  <td className="table-cell font-black text-white">{s.issueDays || '—'}</td>
                </tr>
              ))}
            {!loading && filteredSummaries.length > 0 && (
              <tr className="bg-slate-950/80 font-black">
                <td colSpan={3} className="table-cell text-slate-300">
                  {t('attendance.yearly.totalRow', { year: String(year) })}
                </td>
                <td className="table-cell text-emerald-300">{totals.present || '—'}</td>
                <td className="table-cell text-red-300">{totals.absent || '—'}</td>
                <td className="table-cell text-amber-300">{totals.vacation || '—'}</td>
                <td className="table-cell text-orange-300">{totals.sick || '—'}</td>
                <td className="table-cell text-white">{totals.issues || '—'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
