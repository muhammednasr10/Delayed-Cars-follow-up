import { useMemo } from 'react'
import { AlertTriangle, Archive, BarChart3, CalendarDays, ClipboardCheck, LayoutGrid, List, PlusCircle } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { mpLookupLabel } from '../../Utils/mpLookupLabel'
import type { MpLookupOption } from '../../Types/mpLookup'
import type { MissingPartDetail, MissingPartFilters } from '../../Types/missingPart'
import { FilterMultiSelect } from '../FilterMultiSelect'
import { MissingPartSearchAutocomplete } from './MissingPartSearchAutocomplete'
import { MissingPartsModelSummaryTable } from './MissingPartsModelSummaryTable'
import { formatResolvedMonthLabel, listResolvedMonths, todayLocalDayKey } from '../../Utils/missingPartPageUtils'

export type ListTab = 'active' | 'byFamily' | 'summary' | 'history' | 'historySummary' | 'historyDiary' | 'approvals'
export type CurrentShortageView = 'active' | 'byFamily'

type TopTabKey = 'current' | 'summary' | 'history' | 'historySummary' | 'historyDiary' | 'approvals'

type Props = {
  listTab: ListTab
  visibleTabs: ListTab[]
  canUseFilters: boolean
  onListTabChange: (tab: ListTab) => void
  activeCount: number
  historyCount: number
  approvalsCount?: number
  searchPool: MissingPartDetail[]
  filters: MissingPartFilters
  onFiltersChange: (patch: Partial<MissingPartFilters>) => void
  modelOptions: string[]
  departmentFilterCodes: string[]
  departments: MpLookupOption[]
  canReport: boolean
  role: string
  onReport: () => void
  summaryItems?: MissingPartDetail[] | null
}

function isCurrentShortageTab(tab: ListTab): tab is CurrentShortageView {
  return tab === 'active' || tab === 'byFamily'
}

export function MissingPartsToolbar({
  listTab,
  visibleTabs,
  canUseFilters,
  onListTabChange,
  activeCount,
  historyCount,
  approvalsCount = 0,
  searchPool,
  filters,
  onFiltersChange,
  modelOptions,
  departmentFilterCodes,
  departments,
  canReport,
  role,
  onReport,
  summaryItems = null
}: Props) {
  const { t, lang } = useLang()

  const modelSelectOptions = useMemo(() => modelOptions.map(m => ({ value: m, label: m })), [modelOptions])
  const departmentSelectOptions = useMemo(
    () => departmentFilterCodes.map(code => ({ value: code, label: mpLookupLabel(departments, code, lang) })),
    [departmentFilterCodes, departments, lang]
  )
  const isArchiveTab = listTab === 'history' || listTab === 'historySummary'
  const todayKey = todayLocalDayKey()
  const todayActive = filters.dateFrom === todayKey && filters.dateTo === todayKey
  const monthOptions = useMemo(
    () => (isArchiveTab ? listResolvedMonths(searchPool) : []),
    [isArchiveTab, searchPool]
  )

  const showCurrentGroup = visibleTabs.includes('active') || visibleTabs.includes('byFamily')

  const topTabs: {
    key: TopTabKey
    className: (active: boolean) => string
    icon?: typeof Archive
    count?: number | null
    visible: boolean
  }[] = [
    {
      key: 'current',
      className: active => (active ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'),
      count: activeCount,
      visible: showCurrentGroup
    },
    {
      key: 'summary',
      className: active => (active ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'),
      icon: BarChart3,
      visible: visibleTabs.includes('summary')
    },
    {
      key: 'history',
      className: active => (active ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'),
      icon: Archive,
      count: historyCount,
      visible: visibleTabs.includes('history')
    },
    {
      key: 'historySummary',
      className: active => (active ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'),
      icon: BarChart3,
      visible: visibleTabs.includes('historySummary')
    },
    {
      key: 'historyDiary',
      className: active => (active ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'),
      icon: CalendarDays,
      visible: visibleTabs.includes('historyDiary')
    },
    {
      key: 'approvals',
      className: active => (active ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'),
      icon: ClipboardCheck,
      count: approvalsCount,
      visible: visibleTabs.includes('approvals')
    }
  ]

  const currentViewTabs: { key: CurrentShortageView; icon: typeof List }[] = [
    { key: 'active', icon: List },
    { key: 'byFamily', icon: LayoutGrid }
  ]

  const onCurrentGroup = isCurrentShortageTab(listTab)

  function selectTopTab(key: TopTabKey) {
    if (key === 'current') {
      if (!onCurrentGroup) onListTabChange(visibleTabs.includes('active') ? 'active' : 'byFamily')
      return
    }
    onListTabChange(key)
  }

  return (
    <div className="border-b border-slate-800 p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-red-500/15 p-3 text-red-300">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">{t('mp.title')}</h2>
          </div>
        </div>
        <button
          type="button"
          onClick={() => canReport && onReport()}
          disabled={!canReport}
          title={!canReport ? t('mp.noReportPermHint', { role }) : t('mp.report')}
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black sm:px-5 ${
            canReport
              ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
              : 'cursor-not-allowed bg-slate-700 text-slate-500'
          }`}
        >
          <PlusCircle className="h-6 w-6 shrink-0" />
          <span>{t('mp.report')}</span>
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {topTabs
          .filter(item => item.visible)
          .map(item => {
            const active = item.key === 'current' ? onCurrentGroup : listTab === item.key
            const Icon = item.icon
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => selectTopTab(item.key)}
                className={`rounded-xl px-4 py-2 text-sm font-black ${item.className(active)}`}
              >
                {Icon && <Icon className="mr-1 inline h-4 w-4" />}
                {t(`mp.tabs.${item.key}`)}
                {item.count != null ? ` (${item.count})` : ''}
              </button>
            )
          })}
      </div>

      {onCurrentGroup && (
        <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-800/80 pb-3">
          {currentViewTabs
            .filter(item => visibleTabs.includes(item.key))
            .map(item => {
              const active = listTab === item.key
              const Icon = item.icon
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onListTabChange(item.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-black ${
                    active
                      ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Icon className="mr-1 inline h-3.5 w-3.5" />
                  {t(`mp.tabs.${item.key}`)}
                </button>
              )
            })}
        </div>
      )}

      {!canReport && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {t('mp.noReportPermHint', { role })}
        </div>
      )}

      {summaryItems && summaryItems.length > 0 && listTab === 'active' && (
        <MissingPartsModelSummaryTable items={summaryItems} />
      )}

      {canUseFilters &&
        (listTab === 'active' ||
          listTab === 'byFamily' ||
          listTab === 'history' ||
          listTab === 'historySummary') && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1">
            <MissingPartSearchAutocomplete
              items={searchPool}
              value={filters.search}
              onChange={search => onFiltersChange({ search })}
            />
          </div>
          <div className="min-w-[10rem] flex-1">
            <FilterMultiSelect
              options={modelSelectOptions}
              value={filters.modelNames}
              onChange={modelNames => onFiltersChange({ modelNames })}
              allLabel={t('mp.filterModel')}
              selectedCountLabel={n => t('mp.filterSelectedCount', { n })}
              clearLabel={t('mp.filterClear')}
            />
          </div>
          <div className="min-w-[10rem] flex-1">
            <FilterMultiSelect
              options={departmentSelectOptions}
              value={filters.departments}
              onChange={departments => onFiltersChange({ departments })}
              allLabel={t('mp.filterDepartment')}
              selectedCountLabel={n => t('mp.filterSelectedCount', { n })}
              clearLabel={t('mp.filterClear')}
            />
          </div>
          {isArchiveTab && (
            <select
              className="input-dark min-w-[9rem]"
              value={filters.resolvedMonth ?? ''}
              onChange={e => onFiltersChange({ resolvedMonth: e.target.value || null })}
              aria-label={t('mp.filterMonthLabel')}
              title={t('mp.filterMonthLabel')}
            >
              <option value="">{t('mp.filterMonth')}</option>
              {monthOptions.map(key => (
                <option key={key} value={key}>
                  {formatResolvedMonthLabel(key, lang)}
                </option>
              ))}
            </select>
          )}
          <label className="flex min-w-[9.5rem] flex-col gap-1">
            <span className="text-xs font-bold text-slate-400">{t('mp.filterDateFrom')}</span>
            <input
              type="date"
              className="input-dark"
              value={filters.dateFrom}
              max={filters.dateTo || undefined}
              onChange={e => {
                const dateFrom = e.target.value
                const dateTo = filters.dateTo && dateFrom && dateFrom > filters.dateTo ? dateFrom : filters.dateTo
                onFiltersChange({ dateFrom, dateTo })
              }}
              aria-label={t('mp.filterDateFrom')}
            />
          </label>
          <label className="flex min-w-[9.5rem] flex-col gap-1">
            <span className="text-xs font-bold text-slate-400">{t('mp.filterDateTo')}</span>
            <input
              type="date"
              className="input-dark"
              value={filters.dateTo}
              min={filters.dateFrom || undefined}
              onChange={e => {
                const dateTo = e.target.value
                const dateFrom = filters.dateFrom && dateTo && dateTo < filters.dateFrom ? dateTo : filters.dateFrom
                onFiltersChange({ dateFrom, dateTo })
              }}
              aria-label={t('mp.filterDateTo')}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              onFiltersChange(todayActive ? { dateFrom: '', dateTo: '' } : { dateFrom: todayKey, dateTo: todayKey })
            }}
            className={`mb-0.5 rounded-xl px-3 py-2.5 text-sm font-black ${
              todayActive ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {t('mp.filterToday')}
          </button>
        </div>
      )}
    </div>
  )
}
