import { Field, inputCls } from '../FormField'
import { useLang } from '../../i18n/LanguageContext'
import type { MissionListFilter, MissionPerson, MissionPriority } from '../../Types/mission'
import { MISSION_PRIORITIES, MISSION_STATUSES } from '../../Types/mission'
import {
  EMPTY_MISSION_FILTER_QUERY,
  hasActiveMissionFilters,
  type MissionFilterQuery
} from '../../Utils/missionFilters'

type Props = {
  query: MissionFilterQuery
  onChange: (query: MissionFilterQuery) => void
  assignees?: MissionPerson[]
  shownCount: number
  totalCount: number
}

export function MissionsFilterBar({ query, onChange, assignees, shownCount, totalCount }: Props) {
  const { t } = useLang()
  const active = hasActiveMissionFilters(query)
  const showAssignee = Boolean(assignees)

  return (
    <div className="card-industrial space-y-3 p-4">
      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${showAssignee ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        <Field label={t('common.search')}>
          <input
            type="search"
            className={inputCls()}
            value={query.search}
            onChange={e => onChange({ ...query, search: e.target.value })}
            placeholder={t('missions.searchPh')}
          />
        </Field>
        <Field label={t('missions.filterStatus')}>
          <select
            className={inputCls()}
            value={query.listFilter}
            onChange={e => onChange({ ...query, listFilter: e.target.value as MissionListFilter })}
          >
            <option value="all">{t('common.all')}</option>
            <option value="overdue">{t('missions.overdue')}</option>
            {MISSION_STATUSES.map(key => (
              <option key={key} value={key}>
                {t(`missions.status.${key}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('missions.filterPriority')}>
          <select
            className={inputCls()}
            value={query.priority}
            onChange={e => onChange({ ...query, priority: e.target.value as MissionPriority | 'all' })}
          >
            <option value="all">{t('common.all')}</option>
            {MISSION_PRIORITIES.map(key => (
              <option key={key} value={key}>
                {t(`missions.priority.${key}`)}
              </option>
            ))}
          </select>
        </Field>
        {showAssignee && (
          <Field label={t('missions.filterAssignee')}>
            <select
              className={inputCls()}
              value={query.assigneeId}
              onChange={e => onChange({ ...query, assigneeId: e.target.value })}
            >
              <option value="">{t('common.all')}</option>
              {(assignees ?? []).map(person => (
                <option key={person.id} value={person.id}>
                  {person.name} · {person.code}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
      {active && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold text-slate-400">
            {t('missions.filterResultCount', { shown: shownCount, total: totalCount })}
          </p>
          <button
            type="button"
            onClick={() => onChange(EMPTY_MISSION_FILTER_QUERY)}
            className="text-xs font-bold text-cyan-300 hover:text-cyan-200"
          >
            {t('missions.filterClear')}
          </button>
        </div>
      )}
    </div>
  )
}
