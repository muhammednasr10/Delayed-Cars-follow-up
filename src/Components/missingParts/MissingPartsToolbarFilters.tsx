import { useMemo, type ReactNode } from 'react'
import { UserRound } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import type { FactoryOrgUnit } from '../../Types/factoryOrg'
import type { MissingPartDetail, MissingPartFilters, MissingPartsListTab } from '../../Types/missingPart'
import type { Employee } from '../../Types/employee'
import { FilterMultiSelect } from '../FilterMultiSelect'
import { EmployeeAutocomplete } from '../EmployeeAutocomplete'
import { OrgUnitCascadeField } from '../OrgUnitCascadeField'
import { MissingPartSearchAutocomplete } from './MissingPartSearchAutocomplete'
import { MissingPartsDateFilters } from './MissingPartsDateFilters'
import { formatResolvedMonthLabel, isUnassignedFilter, listResolvedMonths, MP_FILTER_UNASSIGNED } from '../../Utils/missingPartPageUtils'

type Props = {
  listTab: MissingPartsListTab
  canUseFilters: boolean
  hasActiveFilter: boolean
  filteredVehicleCount: number
  tabVehicleCount: number
  searchPool: MissingPartDetail[]
  filters: MissingPartFilters
  onFiltersChange: (patch: Partial<MissingPartFilters>) => void
  modelOptions: string[]
  orgUnits: FactoryOrgUnit[]
  employees: Employee[]
  myEmployeeId: string | null
}

export function MissingPartsToolbarFilters({
  listTab,
  canUseFilters,
  hasActiveFilter,
  filteredVehicleCount,
  tabVehicleCount,
  searchPool,
  filters,
  onFiltersChange,
  modelOptions,
  orgUnits,
  employees,
  myEmployeeId
}: Props) {
  const { t, lang } = useLang()
  const modelSelectOptions = useMemo(() => modelOptions.map(m => ({ value: m, label: m })), [modelOptions])
  const isArchiveTab = listTab === 'history' || listTab === 'historySummary'
  const monthOptions = useMemo(() => (isArchiveTab ? listResolvedMonths(searchPool) : []), [isArchiveTab, searchPool])
  const causingUnassigned = isUnassignedFilter(filters.departments)
  const completingUnassigned = isUnassignedFilter(filters.completingDepartments)
  const followUpUnassigned = filters.followUpEmployeeId === MP_FILTER_UNASSIGNED
  const departmentFilterValue = causingUnassigned ? '' : (filters.departments[0] ?? '')
  const completingDepartmentFilterValue = completingUnassigned ? '' : (filters.completingDepartments[0] ?? '')
  const activeOrgUnits = useMemo(() => orgUnits.filter(u => u.isActive), [orgUnits])
  const filterable =
    listTab === 'active' || listTab === 'byFamily' || listTab === 'history' || listTab === 'historySummary'

  if (!canUseFilters || !filterable) return null

  return (
    <div className="space-y-3">
      {hasActiveFilter && (
        <p className="text-xs font-bold text-cyan-300">
          {t('mp.filterVehicleCountFiltered', { n: filteredVehicleCount, total: tabVehicleCount })}
        </p>
      )}
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
          <UnassignedToggle
            active={causingUnassigned}
            onToggle={() => onFiltersChange({ departments: causingUnassigned ? [] : [MP_FILTER_UNASSIGNED] })}
          >
            <OrgUnitCascadeField
              units={activeOrgUnits}
              value={departmentFilterValue}
              onChange={id => onFiltersChange({ departments: id ? [id] : [] })}
              emptyLabel={t('mp.filterCausingDepartmentAll')}
              showPathPreview={false}
            />
          </UnassignedToggle>
        </FilterField>
        <FilterField label={t('mp.cols.completingDepartment')} className="min-w-[14rem] flex-1">
          <UnassignedToggle
            active={completingUnassigned}
            onToggle={() =>
              onFiltersChange({ completingDepartments: completingUnassigned ? [] : [MP_FILTER_UNASSIGNED] })
            }
          >
            <OrgUnitCascadeField
              units={activeOrgUnits}
              value={completingDepartmentFilterValue}
              onChange={id => onFiltersChange({ completingDepartments: id ? [id] : [] })}
              emptyLabel={t('mp.filterCompletingDepartmentAll')}
              showPathPreview={false}
            />
          </UnassignedToggle>
        </FilterField>
        <div className="flex min-w-[18rem] flex-1 flex-col gap-1">
          <span className="text-xs font-bold text-slate-400">{t('mp.cols.followUpEmployee')}</span>
          <div className="flex items-stretch gap-2">
            <div className="min-w-0 flex-1">
              <EmployeeAutocomplete
                employees={employees}
                value={followUpUnassigned ? '' : filters.followUpEmployeeId}
                onChange={followUpEmployeeId => onFiltersChange({ followUpEmployeeId })}
                placeholder={t('mp.filterFollowUpEmployeeAll')}
                activeOnly={false}
              />
            </div>
            <button
              type="button"
              title={t('mp.filterUnassignedHint')}
              onClick={() =>
                onFiltersChange({
                  followUpEmployeeId: followUpUnassigned ? '' : MP_FILTER_UNASSIGNED
                })
              }
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-black ${
                followUpUnassigned
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {t('mp.filterUnassigned')}
            </button>
            <button
              type="button"
              disabled={!myEmployeeId || followUpUnassigned}
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
  )
}

function UnassignedToggle({
  active,
  onToggle,
  children
}: {
  active: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const { t } = useLang()
  return (
    <div className="flex items-stretch gap-2">
      <div className="min-w-0 flex-1">{children}</div>
      <button
        type="button"
        title={t('mp.filterUnassignedHint')}
        onClick={onToggle}
        className={`inline-flex shrink-0 items-center rounded-xl px-3 text-xs font-black ${
          active ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
        }`}
      >
        {t('mp.filterUnassigned')}
      </button>
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
