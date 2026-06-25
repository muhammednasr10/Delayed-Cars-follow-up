import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarClock, Download, FileUp, Pencil } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { JobRoleBadge } from './EmployeeBadges'
import { Modal } from './Modal'
import { inputCls } from './FormField'
import {
  bulkUpsertAttendanceDays,
  getAttendanceDaysForMonth,
  getMonthlyAttendanceSummaries,
} from '../services/attendanceService'
import { EmployeeMonthAttendanceModal } from './EmployeeMonthAttendanceModal'
import { exportAttendanceMonthExcel, parseAttendanceImportFile } from '../Utils/attendanceExcel'
import type { EmployeeAttendanceSummary } from '../Types/attendance'
import type { Employee } from '../Types/employee'
import { compareEmployees } from '../services/employeesService'

type Props = {
  employees: Employee[]
  canManage: boolean
}

function currentYm(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function EmployeeAttendanceTab({ employees, canManage }: Props) {
  const { t } = useLang()
  const init = currentYm()
  const [year, setYear] = useState(init.year)
  const [month, setMonth] = useState(init.month)
  const [summaries, setSummaries] = useState<EmployeeAttendanceSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editRow, setEditRow] = useState<EmployeeAttendanceSummary | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const monthValue = `${year}-${String(month).padStart(2, '0')}`

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getMonthlyAttendanceSummaries(year, month, true)
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
  }, [year, month, employees, t])

  useEffect(() => {
    void load()
  }, [load])

  const sortedByIssues = useMemo(
    () => [...summaries].sort((a, b) => b.issueDays - a.issueDays || b.absentDays - a.absentDays),
    [summaries]
  )

  async function handleExport() {
    try {
      const days = await getAttendanceDaysForMonth(year, month)
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
      exportAttendanceMonthExcel(year, month, rows, summaries)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    }
  }

  async function onImportFile(file: File | null) {
    if (!file) return
    setError('')
    try {
      const parsed = await parseAttendanceImportFile(file, employees)
      const valid = parsed.filter(r => r.input).map(r => r.input!)
      if (valid.length === 0) {
        setError(t('attendance.import.noneValid'))
        return
      }
      await bulkUpsertAttendanceDays(valid)
      setSuccess(t('attendance.import.done', { n: valid.length }))
      setImportOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{t('attendance.monthly.title')}</h3>
            <p className="text-sm text-slate-400">{t('attendance.monthly.subtitle')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
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
          <button type="button" onClick={() => void handleExport()} className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-200 hover:bg-cyan-500/20">
            <Download className="mr-1 inline h-4 w-4" /> {t('attendance.export')}
          </button>
          {canManage && (
            <button type="button" onClick={() => setImportOpen(true)} className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700">
              <FileUp className="mr-1 inline h-4 w-4" /> {t('attendance.import')}
            </button>
          )}
        </div>
      </div>

      {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>}
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      <p className="text-xs text-slate-500">{t('attendance.monthly.hint')}</p>

      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full min-w-[720px] text-start">
          <thead className="bg-slate-950/90">
            <tr>
              {['code', 'name', 'role', 'present', 'absent', 'vacation', 'sick', 'total'].map(c => (
                <th key={c} className="table-cell text-xs font-black uppercase text-slate-400">
                  {t(`attendance.cols.${c}`)}
                </th>
              ))}
              {canManage && <th className="table-cell text-xs font-black uppercase text-slate-400">{t('common.actions')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading && (
              <tr>
                <td colSpan={canManage ? 9 : 8} className="table-cell text-center text-slate-500">
                  {t('common.loading')}
                </td>
              </tr>
            )}
            {!loading &&
              sortedByIssues.map(s => (
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
                  {canManage && (
                    <td className="table-cell">
                      <button
                        type="button"
                        onClick={() => setEditRow(s)}
                        className="rounded-lg bg-orange-500/15 p-2 text-orange-200 hover:bg-orange-500/25"
                        title={t('attendance.monthEditor')}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <EmployeeMonthAttendanceModal
        open={Boolean(editRow)}
        summary={editRow}
        year={year}
        month={month}
        onClose={() => setEditRow(null)}
        onSaved={async () => {
          setEditRow(null)
          setSuccess(t('settings.updated'))
          await load()
        }}
      />

      <Modal open={importOpen} title={t('attendance.importTitle')} onClose={() => setImportOpen(false)} maxWidthClass="max-w-lg">
        <p className="mb-3 text-sm text-slate-400">{t('attendance.importHint')}</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={e => {
            void onImportFile(e.target.files?.[0] ?? null)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 py-8 font-bold text-cyan-300"
        >
          <FileUp className="h-5 w-5" /> {t('attendance.chooseFile')}
        </button>
      </Modal>
    </div>
  )
}
