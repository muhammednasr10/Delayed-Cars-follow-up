import { useMemo } from 'react'
import { AlertTriangle, Archive, BarChart3, LayoutGrid, List, PlusCircle } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { mpLookupLabel } from '../../Utils/mpLookupLabel'
import type { MpLookupOption } from '../../Types/mpLookup'
import type { MissingPartDetail, MissingPartFilters } from '../../Types/missingPart'
import { FilterMultiSelect } from '../FilterMultiSelect'
import { MissingPartSearchAutocomplete } from './MissingPartSearchAutocomplete'
import { MissingPartsModelSummaryTable } from './MissingPartsModelSummaryTable'

export type ListTab = 'active' | 'byFamily' | 'summary' | 'history' | 'historySummary'
export type CurrentShortageView = 'active' | 'byFamily'

type TopTabKey = 'current' | 'summary' | 'history' | 'historySummary'

type Props = {
  listTab: ListTab
  visibleTabs: ListTab[]
  canUseFilters: boolean
  onListTabChange: (tab: ListTab) => void
  activeCount: number
  historyCount: number
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

  const modelSelectOptions = useMemo(
    () => modelOptions.map(m => ({ value: m, label: m })),
    [modelOptions]
  )
  const departmentSelectOptions = useMemo(
    () => departmentFilterCodes.map(code => ({ value: code, label: mpLookupLabel(departments, code, lang) })),
    [departmentFilterCodes, departments, lang]
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
            canReport ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400' : 'cursor-not-allowed bg-slate-700 text-slate-500'
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

      {canUseFilters && (listTab === 'active' || listTab === 'byFamily' || listTab === 'history') && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MissingPartSearchAutocomplete
            items={searchPool}
            value={filters.search}
            onChange={search => onFiltersChange({ search })}
          />
          <FilterMultiSelect
            options={modelSelectOptions}
            value={filters.modelNames}
            onChange={modelNames => onFiltersChange({ modelNames })}
            allLabel={t('mp.filterModel')}
            selectedCountLabel={n => t('mp.filterSelectedCount', { n })}
            clearLabel={t('mp.filterClear')}
          />
          <FilterMultiSelect
            options={departmentSelectOptions}
            value={filters.departments}
            onChange={departments => onFiltersChange({ departments })}
            allLabel={t('mp.filterDepartment')}
            selectedCountLabel={n => t('mp.filterSelectedCount', { n })}
            clearLabel={t('mp.filterClear')}
          />
        </div>
      )}
    </div>
  )
}
