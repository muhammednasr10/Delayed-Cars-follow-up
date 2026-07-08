import { Settings2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLang } from '../i18n/LanguageContext'
import { Modal } from './Modal'
import { inputCls } from './FormField'
import {
  attendanceStatusHasTimes,
  type AttendanceDayStatus
} from '../Types/attendance'
import type { PlanDayType } from '../Types/productionPlanWorkDayDaily'
import {
  attendanceDefaultsFromPlanDay,
  allowedAttendanceStatusesForPlanDay,
  isHolidayPlanDay,
  type AttendanceBulkDefaults
} from '../Utils/attendanceDefaults'
import { dayTypeBadgeClass } from '../Utils/productionPlanWorkDayDaily'

type Props = {
  open: boolean
  planDayType: PlanDayType | null
  savedDefaults: AttendanceBulkDefaults
  onClose: () => void
  onApply: (defaults: AttendanceBulkDefaults) => void
}

export function TodayAttendanceDefaultsModal({
  open,
  planDayType,
  savedDefaults,
  onClose,
  onApply
}: Props) {
  const { t } = useLang()
  const [status, setStatus] = useState<AttendanceDayStatus>('present')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')

  useEffect(() => {
    if (!open) return
    const initial = attendanceDefaultsFromPlanDay(planDayType, savedDefaults)
    setStatus(initial.status)
    setCheckIn(initial.checkIn)
    setCheckOut(initial.checkOut)
  }, [open, planDayType, savedDefaults])

  function onStatusChange(next: AttendanceDayStatus) {
    setStatus(next)
    if (!attendanceStatusHasTimes(next)) {
      setCheckIn('')
      setCheckOut('')
    }
  }

  function apply() {
    onApply({
      status,
      checkIn: attendanceStatusHasTimes(status) ? checkIn : '',
      checkOut: attendanceStatusHasTimes(status) ? checkOut : ''
    })
    onClose()
  }

  const timesEnabled = attendanceStatusHasTimes(status)
  const holiday = isHolidayPlanDay(planDayType)
  const allowedStatuses = allowedAttendanceStatusesForPlanDay(planDayType)

  return (
    <Modal
      open={open}
      title={t('attendance.today.defaultsTitle')}
      icon={<Settings2 className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-md"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200">
            {t('common.cancel')}
          </button>
          <button type="button" onClick={apply} className="rounded-xl bg-violet-500 px-5 py-2 font-black text-slate-950">
            {t('attendance.today.defaultsApply')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {planDayType && (
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
            <p className="text-xs font-bold text-slate-400">{t('attendance.today.planDayLabel')}</p>
            <p className={`mt-1 inline-block rounded-lg px-2.5 py-1 text-sm font-black ${dayTypeBadgeClass(planDayType)}`}>
              {t(`productionOrders.workDaysTab.dayTypes.${planDayType}`)}
            </p>
          </div>
        )}
        {holiday ? (
          <p className="text-sm leading-relaxed text-amber-200/90">{t('attendance.today.holidayDefaultsHint')}</p>
        ) : (
          <p className="text-sm text-slate-400">{t('attendance.today.defaultsHint')}</p>
        )}
        <label className="block space-y-1.5">
          <span className="text-sm font-bold text-slate-300">{t('attendance.cols.status')}</span>
          <select
            className={`${inputCls()} py-2 text-sm`}
            value={status}
            onChange={e => onStatusChange(e.target.value as AttendanceDayStatus)}
          >
            {allowedStatuses.map(s => (
              <option key={s} value={s}>
                {t(`attendance.status.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-slate-300">{t('attendance.checkIn')}</span>
            <input
              type="time"
              className={`${inputCls()} py-2 text-sm disabled:opacity-40`}
              value={checkIn}
              disabled={!timesEnabled}
              onChange={e => setCheckIn(e.target.value)}
              dir="ltr"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-slate-300">{t('attendance.checkOut')}</span>
            <input
              type="time"
              className={`${inputCls()} py-2 text-sm disabled:opacity-40`}
              value={checkOut}
              disabled={!timesEnabled}
              onChange={e => setCheckOut(e.target.value)}
              dir="ltr"
            />
          </label>
        </div>
      </div>
    </Modal>
  )
}
