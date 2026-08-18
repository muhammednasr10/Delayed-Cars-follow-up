import { useMemo, type ReactNode } from 'react'
import {
  AlertTriangle,
  Archive,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  LayoutGrid,
  List,
  PlusCircle,
  UserRound
} from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import type { FactoryOrgUnit } from '../../Types/factoryOrg'
import type { MissingPartDetail, MissingPartFilters, MissingPartsListTab } from '../../Types/missingPart'
import { FilterMultiSelect } from '../FilterMultiSelect'
import { EmployeeAutocomplete } from '../EmployeeAutocomplete'
import { OrgUnitCascadeField } from '../OrgUnitCascadeField'
import { MissingPartSearchAutocomplete } from './MissingPartSearchAutocomplete'
import { MissingPartsModelSummaryTable } from './MissingPartsModelSummaryTable'
import { formatResolvedMonthLabel, listResolvedMonths } from '../../Utils/missingPartPageUtils'
import { MissingPartsDateFilters } from './MissingPartsDateFilters'
import type { Employee } from '../../Types/employee'

export type ListTab = MissingPartsListTab
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
  orgUnits: FactoryOrgUnit[]
  employees: Employee[]
  myEmployeeId: string | null
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
  orgUnits,
  employees,
  myEmployeeId,
  canReport,
  role,
  onReport,
  summaryItems = null
}: Props) {
  const { t, lang } = useLang()

  const modelSelectOptions = useMemo(() => modelOptions.map(m => ({ value: m, label: m })), [modelOptions])
  const isArchiveTab = listTab === 'history' || listTab === 'historySummary'
  const monthOptions = useMemo(() => (isArchiveTab ? listResolvedMonths(searchPool) : []), [isArchiveTab, searchPool])
  const departmentFilterValue = filters.departments[0] ?? ''
  const completingDepartmentFilterValue = filters.completingDepartments[0] ?? ''
  const activeOrgUnits = useMemo(() => orgUnits.filter(u => u.isActive), [orgUnits])

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
        (listTab === 'active' || listTab === 'byFamily' || listTab === 'history' || listTab === 'historySummary') && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <FilterField label={t('mp.filterSearch')} className="min-w-[12rem] flex-[2]">
                <MissingPartSearchAutocomplete
                  items={searchPool}
                  value={filters.search}
                  onChange={search => onFiltersChange({ search })}
                />
              </FilterField>
              <FilterField label={t('mp.filterModelLabel')} className="min-w-[10rem] flex-1">
                <FilterMultiSelect
                  options={modelSelectOptions}
                  value={filters.modelNames}
                  onChange={modelNames => onFiltersChange({ modelNames })}
                  allLabel={t('mp.filterModel')}
                  selectedCountLabel={n => t('mp.filterSelectedCount', { n })}
                  clearLabel={t('mp.filterClear')}
                />
              </FilterField>
              <MissingPartsDateFilters
                dateFrom={filters.dateFrom}
                dateTo={filters.dateTo}
                onChange={patch => onFiltersChange(patch)}
              />
              {isArchiveTab && (
                <FilterField label={t('mp.filterMonthLabel')} className="min-w-[9rem]">
                  <select
                    className="input-dark w-full"
                    value={filters.resolvedMonth ?? ''}
                    onChange={e => onFiltersChange({ resolvedMonth: e.target.value || null })}
                    aria-label={t('mp.filterMonthLabel')}
                  >
                    <option value="">{t('mp.filterMonth')}</option>
                    {monthOptions.map(key => (
                      <option key={key} value={key}>
                        {formatResolvedMonthLabel(key, lang)}
                      </option>
                    ))}
                  </select>
                </FilterField>
              )}
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <FilterField label={t('mp.cols.causingDepartment')} className="min-w-[14rem] flex-1">
                <OrgUnitCascadeField
                  units={activeOrgUnits}
                  value={departmentFilterValue}
                  onChange={id => onFiltersChange({ departments: id ? [id] : [] })}
                  emptyLabel={t('mp.filterCausingDepartmentAll')}
                  showPathPreview={false}
                />
              </FilterField>
              <FilterField label={t('mp.cols.completingDepartment')} className="min-w-[14rem] flex-1">
                <OrgUnitCascadeField
                  units={activeOrgUnits}
                  value={completingDepartmentFilterValue}
                  onChange={id => onFiltersChange({ completingDepartments: id ? [id] : [] })}
                  emptyLabel={t('mp.filterCompletingDepartmentAll')}
                  showPathPreview={false}
                />
              </FilterField>
              <div className="flex min-w-[18rem] flex-1 flex-col gap-1">
                <span className="text-xs font-bold text-slate-400">{t('mp.cols.followUpEmployee')}</span>
                <div className="flex items-stretch gap-2">
                  <div className="min-w-0 flex-1">
                    <EmployeeAutocomplete
                      employees={employees}
                      value={filters.followUpEmployeeId}
                      onChange={followUpEmployeeId => onFiltersChange({ followUpEmployeeId })}
                      placeholder={t('mp.filterFollowUpEmployeeAll')}
                      activeOnly={false}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!myEmployeeId}
                    title={!myEmployeeId ? t('mp.filterFollowUpMineNoEmployee') : t('mp.filterFollowUpMineHint')}
                    onClick={() => {
                      if (!myEmployeeId) return
                      onFiltersChange({
                        followUpEmployeeId: filters.followUpEmployeeId === myEmployeeId ? '' : myEmployeeId
                      })
                    }}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-black ${
                      myEmployeeId && filters.followUpEmployeeId === myEmployeeId
                        ? 'bg-cyan-500 text-slate-950'
                        : myEmployeeId
                          ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                          : 'cursor-not-allowed bg-slate-800 text-slate-500'
                    }`}
                  >
                    <UserRound className="h-4 w-4" />
                    {t('mp.filterFollowUpMine')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

function FilterField({
  label,
  className,
  children
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ''}`}>
      <span className="text-xs font-bold text-slate-400">{label}</span>
      {children}
    </label>
  )
}
