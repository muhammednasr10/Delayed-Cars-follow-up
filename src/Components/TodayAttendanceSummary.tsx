import { useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { ATTENDANCE_STATUSES, type AttendanceDayStatus } from '../Types/attendance'
import type { Employee } from '../Types/employee'
import {
  ATTENDANCE_AREA_KEYS,
  employeeAttendanceArea,
  type AttendanceAreaKey
} from '../Utils/attendanceAreaBreakdown'
import { Modal } from './Modal'

type Row = { employeeId: string; status: AttendanceDayStatus }
type CardKey = 'total' | AttendanceDayStatus

const STATUS_STYLE: Record<AttendanceDayStatus, { card: string; value: string; dot: string }> = {
  present: {
    card: 'border-emerald-500/25 bg-emerald-500/10',
    value: 'text-emerald-300',
    dot: 'bg-emerald-400'
  },
  absent: {
    card: 'border-red-500/25 bg-red-500/10',
    value: 'text-red-300',
    dot: 'bg-red-400'
  },
  vacation: {
    card: 'border-sky-500/25 bg-sky-500/10',
    value: 'text-sky-300',
    dot: 'bg-sky-400'
  },
  sick: {
    card: 'border-orange-500/25 bg-orange-500/10',
    value: 'text-orange-300',
    dot: 'bg-orange-400'
  },
  permission: {
    card: 'border-violet-500/25 bg-violet-500/10',
    value: 'text-violet-300',
    dot: 'bg-violet-400'
  },
  late: {
    card: 'border-amber-500/25 bg-amber-500/10',
    value: 'text-amber-300',
    dot: 'bg-amber-400'
  }
}

type Props = {
  rows: Row[]
  employees: Employee[]
  loading?: boolean
}

export function TodayAttendanceSummary({ rows, employees, loading }: Props) {
  const { t } = useLang()
  const [openKey, setOpenKey] = useState<CardKey | null>(null)

  const employeeById = useMemo(() => new Map(employees.map(employee => [employee.id, employee])), [employees])

  const counts = useMemo(() => {
    const byStatus = Object.fromEntries(ATTENDANCE_STATUSES.map(s => [s, 0])) as Record<AttendanceDayStatus, number>
    for (const row of rows) {
      byStatus[row.status] = (byStatus[row.status] ?? 0) + 1
    }
    const total = rows.length
    const onSite = byStatus.present + byStatus.late + byStatus.permission
    const away = byStatus.absent + byStatus.vacation + byStatus.sick
    return { total, onSite, away, byStatus }
  }, [rows])

  const areaCounts = useMemo(() => {
    const scoped = openKey == null || openKey === 'total' ? rows : rows.filter(row => row.status === openKey)
    const byArea = { trimA: 0, trimB: 0, chassis: 0, final: 0, other: 0 } satisfies Record<AttendanceAreaKey, number>
    for (const row of scoped) {
      const area = employeeAttendanceArea(employeeById.get(row.employeeId))
      byArea[area] += 1
    }
    return byArea
  }, [rows, openKey, employeeById])

  const cards: {
    key: CardKey
    label: string
    value: number
    style?: (typeof STATUS_STYLE)[AttendanceDayStatus]
    highlight?: boolean
  }[] = [
    {
      key: 'total',
      label: t('attendance.today.summary.total'),
      value: counts.total,
      highlight: true
    },
    ...ATTENDANCE_STATUSES.map(status => ({
      key: status,
      label: t(`attendance.status.${status}`),
      value: counts.byStatus[status],
      style: STATUS_STYLE[status]
    }))
  ]

  const openCard = cards.find(card => card.key === openKey) ?? null

  return (
    <section className="rounded-2xl border border-slate-700/80 bg-slate-900/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-4 w-4 text-violet-300" />
        <h4 className="text-sm font-black text-violet-200">{t('attendance.today.summary.title')}</h4>
        {loading && <span className="text-xs text-slate-500">{t('common.loading')}</span>}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        {cards.map(card => {
          const style = card.style
          const selected = openKey === card.key
          return (
            <button
              key={card.key}
              type="button"
              disabled={loading}
              onClick={() => setOpenKey(card.key)}
              className={`rounded-xl border px-3 py-2.5 text-start transition hover:brightness-125 disabled:cursor-wait ${
                card.highlight
                  ? 'border-cyan-500/30 bg-cyan-500/10'
                  : (style?.card ?? 'border-slate-700 bg-slate-950/50')
              } ${selected ? 'ring-2 ring-white/70' : ''}`}
            >
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {style && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />}
                {card.label}
              </p>
              <p
                className={`mt-1 text-2xl font-black tabular-nums ${
                  card.highlight ? 'text-cyan-200' : (style?.value ?? 'text-slate-100')
                }`}
              >
                {loading ? '—' : card.value}
              </p>
            </button>
          )
        })}
      </div>
      {!loading && counts.total > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          {t('attendance.today.summary.footnote', {
            onSite: counts.onSite,
            away: counts.away,
            total: counts.total
          })}
        </p>
      )}

      <Modal
        open={openCard != null && !loading}
        title={openCard?.label ?? ''}
        subtitle={t('attendance.today.summary.detailHint')}
        onClose={() => setOpenKey(null)}
        maxWidthClass="max-w-xl"
      >
        <div className="grid grid-cols-2 gap-3">
          {ATTENDANCE_AREA_KEYS.map(area => (
            <div key={area} className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3">
              <p className="text-xs font-bold text-slate-400">{t(`attendance.today.summary.areas.${area}`)}</p>
              <p className="mt-1 text-3xl font-black tabular-nums text-white">{areaCounts[area]}</p>
            </div>
          ))}
          {areaCounts.other > 0 && (
            <div className="col-span-2 rounded-xl border border-slate-700 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-bold text-slate-400">{t('attendance.today.summary.other')}</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-slate-200">{areaCounts.other}</p>
            </div>
          )}
        </div>
      </Modal>
    </section>
  )
}
