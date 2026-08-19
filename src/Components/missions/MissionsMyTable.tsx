import { useLang } from '../../i18n/LanguageContext'
import type { MissionFilterQuery } from '../../Utils/missionFilters'
import { missionListEmptyI18nKey } from '../../Utils/missionFilters'
import { isMissionOverdue } from '../../Utils/missionDue'
import {
  formatMissionDateTime,
  missionDetailsPreview,
  missionRecurrenceLabel,
  missionRowClass
} from '../../Utils/missionDisplay'
import { missionCreatorLabel } from '../../Utils/missionPeople'
import type { MissionStatus, TeamMission } from '../../Types/mission'
import { MissionDueCell, MissionPriorityBadge, MissionStatusSelect, MissionTitleCell } from './MissionTableBits'
import { MissionRowActions } from './MissionRowActions'

const cell = 'table-cell align-middle px-3 py-2.5'

type Props = {
  query: MissionFilterQuery
  filtered: TeamMission[]
  loading: boolean
  saving: boolean
  onOpenDetail: (row: TeamMission) => void
  onChangeStatus: (row: TeamMission, status: MissionStatus) => void
  canRespond: (row: TeamMission) => boolean
  canDelegate: (row: TeamMission) => boolean
  onRespond: (row: TeamMission) => void
  onDelegate: (row: TeamMission) => void
}

export function MissionsMyTable({
  query,
  filtered,
  loading,
  saving,
  onOpenDetail,
  onChangeStatus,
  canRespond,
  canDelegate,
  onRespond,
  onDelegate
}: Props) {
  const { t, lang } = useLang()
  const colCount = 9

  return (
    <div className="card-industrial overflow-x-auto">
      <p className="border-b border-slate-800 px-4 py-2 text-xs text-slate-500">{t('missions.my.rowHint')}</p>
      <table className="w-full text-center text-sm">
        <thead className="bg-slate-950/90">
          <tr>
            <th className={`${cell} whitespace-nowrap text-center font-black text-slate-400`}>
              {t('missions.cols.createdAt')}
            </th>
            <th className={`${cell} whitespace-nowrap text-center font-black text-slate-400`}>
              {t('missions.cols.createdBy')}
            </th>
            <th className={`${cell} text-center font-black text-slate-400`}>{t('missions.cols.title')}</th>
            <th className={`${cell} min-w-[10rem] text-center font-black text-slate-400`}>
              {t('missions.cols.description')}
            </th>
            <th className={`${cell} whitespace-nowrap text-center font-black text-slate-400`}>
              {t('missions.cols.priority')}
            </th>
            <th className={`${cell} whitespace-nowrap text-center font-black text-slate-400`}>
              {t('missions.cols.dueDate')}
            </th>
            <th className={`${cell} whitespace-nowrap text-center font-black text-slate-400`}>
              {t('missions.cols.recurrence')}
            </th>
            <th className={`${cell} whitespace-nowrap text-center font-black text-slate-400`}>
              {t('missions.cols.status')}
            </th>
            <th className={`${cell} font-black text-slate-400`} data-export-skip>
              {t('common.actions')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {loading ? (
            <tr>
              <td colSpan={colCount} className="px-4 py-12 text-slate-500">
                {t('common.loading')}
              </td>
            </tr>
          ) : filtered.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="px-4 py-12 text-slate-500">
                {t(missionListEmptyI18nKey(query, 'missions.my.empty'))}
              </td>
            </tr>
          ) : (
            filtered.map(row => {
              const overdue = isMissionOverdue(row)
              return (
                <tr key={row.id} className={missionRowClass(overdue, row.status)} onClick={() => onOpenDetail(row)}>
                  <td className={`${cell} whitespace-nowrap text-slate-300`} dir="ltr">
                    {formatMissionDateTime(row.createdAt, lang)}
                  </td>
                  <td className={`${cell} whitespace-nowrap text-slate-300`}>
                    {missionCreatorLabel(row.createdByName)}
                  </td>
                  <MissionTitleCell row={row} className={`${cell} max-w-[14rem] text-start`} />
                  <td className={`${cell} max-w-[18rem] text-start`}>
                    <p className="line-clamp-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-300">
                      {missionDetailsPreview(row)}
                    </p>
                  </td>
                  <td className={`${cell} whitespace-nowrap`}>
                    <MissionPriorityBadge priority={row.priority} />
                  </td>
                  <MissionDueCell row={row} className={`${cell} whitespace-nowrap`} />
                  <td className={`${cell} whitespace-nowrap text-slate-300`} title={missionRecurrenceLabel(row, t)}>
                    {missionRecurrenceLabel(row, t)}
                  </td>
                  <td className={`${cell} whitespace-nowrap`} onClick={e => e.stopPropagation()}>
                    <MissionStatusSelect
                      row={row}
                      disabled={saving}
                      onChange={status => void onChangeStatus(row, status)}
                    />
                  </td>
                  <td className={cell} onClick={e => e.stopPropagation()}>
                    <MissionRowActions
                      showRespond={canRespond(row)}
                      showDelegate={canDelegate(row)}
                      onRespond={() => onRespond(row)}
                      onDelegate={() => onDelegate(row)}
                    />
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
