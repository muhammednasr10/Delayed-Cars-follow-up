import { UserSearch } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { EmployeeAutocomplete } from './EmployeeAutocomplete'
import { inputCls } from './FormField'
import {
  ATTENDANCE_STATUSES,
  attendanceStatusHasTimes,
  type AttendanceDayStatus
} from '../Types/attendance'
import type { Employee } from '../Types/employee'

type Props = {
  employees: Employee[]
  canManage: boolean
  employeeId: string
  onEmployeeIdChange: (id: string) => void
  status: AttendanceDayStatus
  onStatusChange: (status: AttendanceDayStatus) => void
  checkIn: string
  checkOut: string
  onCheckInChange: (value: string) => void
  onCheckOutChange: (value: string) => void
  onApply?: () => void
}

export function TodayAttendanceQuickEntry({
  employees,
  canManage,
  employeeId,
  onEmployeeIdChange,
  status,
  onStatusChange,
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
  onApply
}: Props) {
  const { t } = useLang()

  if (!canManage) return null

  const timesEnabled = attendanceStatusHasTimes(status)

  return (
    <div className="rounded-2xl border border-violet-500/25 bg-violet-500/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <UserSearch className="h-4 w-4 text-violet-300" />
        <h4 className="text-sm font-black text-violet-200">{t('attendance.today.quickTitle')}</h4>
      </div>
      <p className="mb-3 text-xs text-slate-500">{t('attendance.today.quickHint')}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-xs font-bold text-slate-400">{t('attendance.today.quickSearch')}</span>
          <EmployeeAutocomplete
            employees={employees}
            value={employeeId}
            onChange={onEmployeeIdChange}
            placeholder={t('attendance.today.quickSearchPh')}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-400">{t('attendance.cols.status')}</span>
          <select
            className={`${inputCls()} py-2 text-sm`}
            value={status}
            disabled={!employeeId}
            onChange={e => onStatusChange(e.target.value as AttendanceDayStatus)}
          >
            {ATTENDANCE_STATUSES.map(s => (
              <option key={s} value={s}>
                {t(`attendance.status.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-400">{t('attendance.checkIn')}</span>
            <input
              type="time"
              className={`${inputCls()} py-2 text-sm disabled:opacity-40`}
              value={checkIn}
              disabled={!employeeId || !timesEnabled}
              onChange={e => onCheckInChange(e.target.value)}
              dir="ltr"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-400">{t('attendance.checkOut')}</span>
            <input
              type="time"
              className={`${inputCls()} py-2 text-sm disabled:opacity-40`}
              value={checkOut}
              disabled={!employeeId || !timesEnabled}
              onChange={e => onCheckOutChange(e.target.value)}
              dir="ltr"
            />
          </label>
        </div>
        {employeeId && onApply && (
          <button
            type="button"
            onClick={onApply}
            className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 sm:col-span-2 lg:col-span-4"
          >
            {t('attendance.today.quickApply')}
          </button>
        )}
      </div>
    </div>
  )
}
