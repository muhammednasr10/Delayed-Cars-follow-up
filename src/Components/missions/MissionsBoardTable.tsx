import { useLang } from '../../i18n/LanguageContext'
import type { MissionFilterQuery } from '../../Utils/missionFilters'
import { missionListEmptyI18nKey } from '../../Utils/missionFilters'
import { isMissionOverdue } from '../../Utils/missionDue'
import {
  formatMissionDateTime,
  missionRecurrenceLabel,
  missionRowClass
} from '../../Utils/missionDisplay'
import { missionCreatorLabel } from '../../Utils/missionPeople'
import type { MissionStatus, TeamMission } from '../../Types/mission'
import { ExportableTable } from '../ExportableTable'
import {
  MissionAssigneesCell,
  MissionDueCell,
  MissionPriorityBadge,
  MissionStatusBadge,
  MissionStatusSelect,
  MissionTitleCell
} from './MissionTableBits'
import { MissionRowActions } from './MissionRowActions'

const cell = 'table-cell text-center align-middle px-3 py-2.5'
const nowrap = `${cell} whitespace-nowrap`

type Props = {
  query: MissionFilterQuery
  filtered: TeamMission[]
  loading: boolean
  saving: boolean
  canAssignMissions: boolean
  onOpenDetail: (row: TeamMission) => void
  onChangeStatus: (row: TeamMission, status: MissionStatus) => void
  canRespond: (row: TeamMission) => boolean
  canReassign: (row: TeamMission) => boolean
  onRespond: (row: TeamMission) => void
  onReassign: (row: TeamMission) => void
  onEdit: (row: TeamMission) => void
  onDelete: (row: TeamMission) => void
  emptyKey?: string
}

export function MissionsBoardTable({
  query,
  filtered,
  loading,
  saving,
  canAssignMissions,
  onOpenDetail,
  onChangeStatus,
  canRespond,
  canReassign,
  onRespond,
  onReassign,
  onEdit,
  onDelete,
  emptyKey = 'missions.empty'
}: Props) {
  const { t, lang } = useLang()
  const colCount = canAssignMissions ? 9 : 8

  return (
    <div className="card-industrial overflow-hidden">
      <ExportableTable filename="missions" title={t('missions.title')} rowCount={filtered.length}>
        <p className="border-b border-slate-800 px-4 py-2 text-xs text-slate-500">{t('missions.my.rowHint')}</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-center text-sm">
            <thead className="bg-slate-950/90">
              <tr>
                <th className={`${nowrap} font-black text-slate-400`}>{t('missions.cols.createdAt')}</th>
                <th className={`${nowrap} font-black text-slate-400`}>{t('missions.cols.createdBy')}</th>
                <th className={`${cell} min-w-[14rem] max-w-[18rem] font-black text-slate-400`}>{t('missions.cols.title')}</th>
                <th className={`${cell} min-w-[9rem] font-black text-slate-400`}>{t('missions.cols.assignee')}</th>
                <th className={`${nowrap} font-black text-slate-400`}>{t('missions.cols.priority')}</th>
                <th className={`${nowrap} font-black text-slate-400`}>{t('missions.cols.dueDate')}</th>
                <th className={`${nowrap} font-black text-slate-400`}>{t('missions.cols.recurrence')}</th>
                <th className={`${nowrap} font-black text-slate-400`}>{t('missions.cols.status')}</th>
                {canAssignMissions && (
                  <th data-export-skip className={`${nowrap} font-black text-slate-400`}>
                    {t('common.actions')}
                  </th>
                )}
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
                    {t(missionListEmptyI18nKey(query, emptyKey))}
                  </td>
                </tr>
              ) : (
                filtered.map(row => {
                  const overdue = isMissionOverdue(row)
                  return (
                    <tr key={row.id} className={missionRowClass(overdue, row.status)} onClick={() => onOpenDetail(row)}>
                      <td className={`${nowrap} text-slate-300`} dir="ltr">
                        {formatMissionDateTime(row.createdAt, lang)}
                      </td>
                      <td className={`${nowrap} text-slate-300`}>{missionCreatorLabel(row.createdByName)}</td>
                      <MissionTitleCell
                        row={row}
                        showDescription
                        className={`${cell} min-w-[14rem] max-w-[18rem] whitespace-normal break-words text-start`}
                      />
                      <MissionAssigneesCell row={row} className={`${cell} min-w-[9rem] whitespace-normal`} />
                      <td className={nowrap}>
                        <MissionPriorityBadge priority={row.priority} />
                      </td>
                      <MissionDueCell row={row} className={nowrap} />
                      <td className={`${nowrap} text-slate-300`} title={missionRecurrenceLabel(row, t)}>
                        {missionRecurrenceLabel(row, t)}
                      </td>
                      <td className={nowrap} onClick={e => e.stopPropagation()}>
                        {canAssignMissions ? (
                          <MissionStatusSelect
                            row={row}
                            disabled={saving}
                            onChange={status => void onChangeStatus(row, status)}
                          />
                        ) : (
                          <MissionStatusBadge status={row.status} />
                        )}
                      </td>
                      {canAssignMissions && (
                        <td data-export-skip className={cell} onClick={e => e.stopPropagation()}>
                          <MissionRowActions
                            showRespond={canRespond(row)}
                            showDelegate={canReassign(row)}
                            showEdit
                            showDelete
                            onRespond={() => onRespond(row)}
                            onDelegate={() => onReassign(row)}
                            onEdit={() => onEdit(row)}
                            onDelete={() => onDelete(row)}
                          />
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </ExportableTable>
    </div>
  )
}
