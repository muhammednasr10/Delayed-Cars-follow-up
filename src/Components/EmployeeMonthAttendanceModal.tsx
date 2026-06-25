import { useEffect, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { Modal } from './Modal'
import { inputCls } from './FormField'
import {
  ATTENDANCE_STATUSES,
  DEFAULT_ATTENDANCE_CHECK_IN,
  DEFAULT_ATTENDANCE_CHECK_OUT,
  type AttendanceDayEdit,
  type AttendanceDayStatus,
  type EmployeeAttendanceSummary
} from '../Types/attendance'
import {
  bulkUpsertAttendanceDays,
  dayEditToInput,
  getEmployeeAttendanceMonth,
  isAttendanceDayPersistable,
  pruneFutureAttendanceDays
} from '../services/attendanceService'

type Props = {
  open: boolean
  summary: EmployeeAttendanceSummary | null
  year: number
  month: number
  onClose: () => void
  onSaved: () => void
}

function formatDayLabel(workDate: string, lang: string): string {
  const d = new Date(workDate + 'T12:00:00')
  const weekday = d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short' })
  const dayNum = d.getDate()
  return `${weekday} ${dayNum}`
}

export function EmployeeMonthAttendanceModal({ open, summary, year, month, onClose, onSaved }: Props) {
  const { t, lang } = useLang()
  const [rows, setRows] = useState<AttendanceDayEdit[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open || !summary) return
    setLoading(true)
    setErr('')
    getEmployeeAttendanceMonth(summary.employeeId, year, month)
      .then(setRows)
      .catch(e => setErr(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false))
  }, [open, summary, year, month, t])

  function patchRow(index: number, patch: Partial<AttendanceDayEdit>) {
    setRows(prev =>
      prev.map((r, i) => {
        if (i !== index) return r
        const next = { ...r, ...patch }
        const status = patch.status ?? r.status
        if (status !== 'present') {
          next.checkIn = ''
          next.checkOut = ''
        } else if (r.status !== 'present' || !next.checkIn) {
          next.checkIn = DEFAULT_ATTENDANCE_CHECK_IN
          next.checkOut = DEFAULT_ATTENDANCE_CHECK_OUT
        }
        return next
      })
    )
  }

  function markAllPresent() {
    setRows(prev =>
      prev.map(r => ({
        ...r,
        status: 'present' as AttendanceDayStatus,
        checkIn: DEFAULT_ATTENDANCE_CHECK_IN,
        checkOut: DEFAULT_ATTENDANCE_CHECK_OUT
      }))
    )
  }

  async function save() {
    if (!summary) return
    setBusy(true)
    setErr('')
    try {
      const inputs = rows
        .filter(r => isAttendanceDayPersistable(r.workDate))
        .map(r => dayEditToInput(summary.employeeId, r))
      await bulkUpsertAttendanceDays(inputs)
      await pruneFutureAttendanceDays(summary.employeeId, year, month)
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title={summary ? `${t('attendance.monthEditor')} — ${summary.fullName}` : t('attendance.monthEditor')}
      icon={<CalendarClock className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200">
            {t('common.cancel')}
          </button>
          <button type="button" disabled={busy || loading} onClick={() => void save()} className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 disabled:opacity-50">
            {busy ? t('common.saving') : t('attendance.saveMonth')}
          </button>
        </>
      }
    >
      <p className="mb-3 text-xs text-slate-400">{t('attendance.defaultsHint')}</p>
      {err && <p className="mb-3 text-sm text-red-300">{err}</p>}
      {loading ? (
        <p className="text-slate-500">{t('common.loading')}</p>
      ) : (
        <>
          <div className="mb-3 flex justify-end">
            <button type="button" onClick={markAllPresent} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700">
              {t('attendance.markAllPresent')}
            </button>
          </div>
          <div className="max-h-[min(28rem,60vh)] overflow-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[640px] text-start">
              <thead className="sticky top-0 z-10 bg-slate-950">
                <tr>
                  <th className="table-cell text-xs font-black uppercase text-slate-400">{t('attendance.cols.date')}</th>
                  <th className="table-cell text-xs font-black uppercase text-slate-400">{t('attendance.cols.status')}</th>
                  <th className="table-cell text-xs font-black uppercase text-slate-400">{t('attendance.checkIn')}</th>
                  <th className="table-cell text-xs font-black uppercase text-slate-400">{t('attendance.checkOut')}</th>
                  <th className="table-cell text-xs font-black uppercase text-slate-400">{t('common.notes')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((row, i) => (
                  <tr key={row.workDate} className="bg-slate-900/40 hover:bg-slate-800/50">
                    <td className="table-cell whitespace-nowrap font-bold text-slate-200">
                      {formatDayLabel(row.workDate, lang)}
                      <span className="ms-2 font-mono text-xs text-slate-500" dir="ltr">
                        {row.workDate}
                      </span>
                    </td>
                    <td className="table-cell">
                      <select
                        className={`${inputCls()} min-w-[7rem] py-1.5 text-xs`}
                        value={row.status}
                        onChange={e => patchRow(i, { status: e.target.value as AttendanceDayStatus })}
                      >
                        {ATTENDANCE_STATUSES.map(s => (
                          <option key={s} value={s}>
                            {t(`attendance.status.${s}`)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="table-cell">
                      <input
                        type="time"
                        disabled={row.status !== 'present'}
                        className={`${inputCls()} w-28 py-1.5 text-xs disabled:opacity-40`}
                        value={row.checkIn}
                        onChange={e => patchRow(i, { checkIn: e.target.value })}
                        dir="ltr"
                      />
                    </td>
                    <td className="table-cell">
                      <input
                        type="time"
                        disabled={row.status !== 'present'}
                        className={`${inputCls()} w-28 py-1.5 text-xs disabled:opacity-40`}
                        value={row.checkOut}
                        onChange={e => patchRow(i, { checkOut: e.target.value })}
                        dir="ltr"
                      />
                    </td>
                    <td className="table-cell">
                      <input
                        className={`${inputCls()} min-w-[8rem] py-1.5 text-xs`}
                        value={row.notes}
                        onChange={e => patchRow(i, { notes: e.target.value })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  )
}
