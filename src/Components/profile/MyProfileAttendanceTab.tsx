import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../../Context/AuthContext'
import { useLang } from '../../i18n/LanguageContext'
import { getEmployeeAttendanceMonth } from '../../services/attendanceService'
import type { AttendanceDayEdit } from '../../Types/attendance'

export function MyProfileAttendanceTab() {
  const { t, lang } = useLang()
  const { profile } = useAuth()
  const employeeId = profile?.employee_id ?? null
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [rows, setRows] = useState<AttendanceDayEdit[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!employeeId) return
    setLoading(true)
    setErr('')
    void getEmployeeAttendanceMonth(employeeId, year, month)
      .then(setRows)
      .catch(e => setErr(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false))
  }, [employeeId, year, month, t])

  const summary = useMemo(() => {
    const s = { present: 0, absent: 0, vacation: 0, sick: 0, permission: 0, late: 0 }
    const today = new Date().toISOString().slice(0, 10)
    for (const r of rows) {
      if (r.workDate > today) continue
      if (r.status in s) s[r.status as keyof typeof s]++
    }
    return s
  }, [rows])

  function shiftMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth() + 1)
  }

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    month: 'long',
    year: 'numeric'
  })

  if (!employeeId) {
    return <p className="text-sm text-slate-500">{t('myProfile.noEmployeeLink')}</p>
  }

  return (
    <section className="card-industrial space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-emerald-300">
          <CalendarDays className="h-5 w-5" />
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-400">{t('myProfile.attendanceSection')}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => shiftMonth(-1)} className="rounded-lg bg-slate-800 p-2 hover:bg-slate-700">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[8rem] text-center text-sm font-bold text-white">{monthLabel}</span>
          <button type="button" onClick={() => shiftMonth(1)} className="rounded-lg bg-slate-800 p-2 hover:bg-slate-700">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {(['present', 'absent', 'vacation', 'sick', 'permission', 'late'] as const).map(key => (
          <span key={key} className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-300">
            {t(`attendance.status.${key}`)}: <strong className="text-white">{summary[key]}</strong>
          </span>
        ))}
      </div>

      {loading && <p className="text-sm text-slate-400">{t('common.loading')}</p>}
      {err && <p className="text-sm text-red-300">{err}</p>}

      {!loading && !err && (
        <div className="max-h-80 overflow-auto rounded-xl border border-slate-800">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-900 text-slate-500">
              <tr>
                <th className="px-3 py-2 text-start">{t('attendance.cols.date')}</th>
                <th className="px-3 py-2 text-start">{t('attendance.cols.status')}</th>
                <th className="px-3 py-2 text-start">{t('attendance.checkIn')}</th>
                <th className="px-3 py-2 text-start">{t('attendance.checkOut')}</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter(r => r.workDate <= new Date().toISOString().slice(0, 10))
                .map(r => (
                  <tr key={r.workDate} className="border-t border-slate-800/80">
                    <td className="px-3 py-2 font-mono text-slate-300" dir="ltr">
                      {r.workDate}
                    </td>
                    <td className="px-3 py-2">{t(`attendance.status.${r.status}`)}</td>
                    <td className="px-3 py-2 font-mono" dir="ltr">
                      {r.checkIn || '—'}
                    </td>
                    <td className="px-3 py-2 font-mono" dir="ltr">
                      {r.checkOut || '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-500">{t('myProfile.attendanceReadOnly')}</p>
    </section>
  )
}
