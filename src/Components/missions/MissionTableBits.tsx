import { useLang } from '../../i18n/LanguageContext'
import type { MissionPriority, MissionStatus, TeamMission } from '../../Types/mission'
import { MISSION_STATUSES } from '../../Types/mission'
import { isMissionOverdue } from '../../Utils/missionDue'
import { formatMissionDate } from '../../Utils/missionDisplay'
import { missionShortageLabel } from '../../Utils/missionPeople'

export function MissionPriorityBadge({ priority }: { priority: MissionPriority }) {
  const { t } = useLang()
  const tones = {
    low: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    normal: 'bg-cyan-500/15 text-cyan-200 border-cyan-500/30',
    high: 'bg-red-500/15 text-red-200 border-red-500/30'
  }
  return (
    <span className={`inline-block rounded-lg border px-2 py-0.5 text-xs font-bold ${tones[priority]}`}>
      {t(`missions.priority.${priority}`)}
    </span>
  )
}

export function MissionStatusBadge({ status }: { status: MissionStatus }) {
  const { t } = useLang()
  const tones: Record<MissionStatus, string> = {
    pending: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
    in_progress: 'bg-blue-500/15 text-blue-200 border-blue-500/30',
    completed: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
    cancelled: 'bg-slate-500/15 text-slate-400 border-slate-600/40'
  }
  return (
    <span className={`inline-block rounded-lg border px-2 py-0.5 text-xs font-bold ${tones[status]}`}>
      {t(`missions.status.${status}`)}
    </span>
  )
}

export function MissionDueCell({ row, className }: { row: TeamMission; className: string }) {
  const { t, lang } = useLang()
  const overdue = isMissionOverdue(row)
  return (
    <td className={`${className} ${overdue ? 'text-red-200' : 'text-slate-300'}`}>
      <p className={overdue ? 'font-bold' : ''}>{formatMissionDate(row.dueDate, lang)}</p>
      {overdue && (
        <span className="mt-1 inline-block rounded-lg border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-200">
          {t('missions.overdue')}
        </span>
      )}
    </td>
  )
}

export function MissionAssigneesCell({ row, className }: { row: TeamMission; className: string }) {
  return (
    <td className={className}>
      {row.assignees.length > 1 ? (
        <div className="space-y-0.5">
          {row.assignees.map(a => (
            <p key={a.id} className="font-bold text-slate-200">
              {a.name}
              <span className="ms-1 font-mono text-[10px] text-slate-500" dir="ltr">
                {a.code}
              </span>
            </p>
          ))}
        </div>
      ) : (
        <>
          <p className="font-bold text-slate-200">{row.assigneeName}</p>
          <p className="text-xs text-slate-500">{row.assigneeCode}</p>
        </>
      )}
    </td>
  )
}

export function MissionTitleCell({
  row,
  showDescription,
  className
}: {
  row: TeamMission
  showDescription?: boolean
  className: string
}) {
  const { t } = useLang()
  const shortage = missionShortageLabel(row.sourceVin, row.sourceModelName)
  return (
    <td className={className}>
      <p className="font-bold text-white">{row.title}</p>
      {shortage && (
        <p className="mt-0.5 font-mono text-[11px] text-amber-200/90" dir="ltr">
          {shortage}
        </p>
      )}
      {showDescription && row.description ? (
        <p className="mt-0.5 truncate text-xs text-slate-500">{row.description}</p>
      ) : null}
      {row.responseCount > 0 && (
        <p className="mt-0.5 text-[11px] font-bold text-cyan-300">{t('missions.respond.count', { n: row.responseCount })}</p>
      )}
    </td>
  )
}

export function MissionStatusSelect({
  row,
  disabled,
  onChange
}: {
  row: TeamMission
  disabled?: boolean
  onChange: (status: MissionStatus) => void
}) {
  const { t } = useLang()
  return (
    <select
      className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-bold text-slate-200"
      value={row.status}
      disabled={disabled}
      onChange={e => onChange(e.target.value as MissionStatus)}
    >
      {MISSION_STATUSES.map(key => (
        <option key={key} value={key}>
          {t(`missions.status.${key}`)}
        </option>
      ))}
    </select>
  )
}
