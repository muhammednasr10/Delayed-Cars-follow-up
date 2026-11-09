import { useMemo, type ReactNode } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import type { FactoryOrgUnit } from '../../Types/factoryOrg'
import type { MissingPartDetail, MissingPartFilters, MissingPartsListTab } from '../../Types/missingPart'
import type { MpLookupOption } from '../../Types/mpLookup'
import { FilterMultiSelect } from '../FilterMultiSelect'
import { MissingPartSearchAutocomplete } from './MissingPartSearchAutocomplete'
import { MissingPartsDateFilters } from './MissingPartsDateFilters'
import { administrationOnlyUnits } from '../../Utils/employeeOrgPicker'
import { mpLookupLabel } from '../../Utils/mpLookupLabel'
import {
  countVehiclesWithUnassignedField,
  formatResolvedMonthLabel,
  isUnassignedFilter,
  listResolvedMonths,
  MP_FILTER_UNASSIGNED
} from '../../Utils/missingPartPageUtils'

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
  reasons: MpLookupOption[]
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
  reasons
}: Props) {
  const { t, lang } = useLang()
  const modelSelectOptions = useMemo(() => modelOptions.map(m => ({ value: m, label: m })), [modelOptions])
  const isArchiveTab = listTab === 'history' || listTab === 'historySummary'
  const monthOptions = useMemo(() => (isArchiveTab ? listResolvedMonths(searchPool) : []), [isArchiveTab, searchPool])
  const causingUnassigned = isUnassignedFilter(filters.departments)
  const completingUnassigned = isUnassignedFilter(filters.completingDepartments)
  const reasonUnassigned = isUnassignedFilter(filters.reasons ?? [])
  const departmentFilterValue = causingUnassigned ? MP_FILTER_UNASSIGNED : (filters.departments[0] ?? '')
  const completingDepartmentFilterValue = completingUnassigned
    ? MP_FILTER_UNASSIGNED
    : (filters.completingDepartments[0] ?? '')
  const reasonFilterValue = reasonUnassigned ? MP_FILTER_UNASSIGNED : (filters.reasons?.[0] ?? '')
  const adminUnits = useMemo(
    () => administrationOnlyUnits(orgUnits).filter(u => u.isActive),
    [orgUnits]
  )
  const reasonOptions = useMemo(
    () => reasons.filter(r => r.isActive || r.code === reasonFilterValue),
    [reasons, reasonFilterValue]
  )
  const unassignedCounts = useMemo(
    () => ({
      causing: countVehiclesWithUnassignedField(searchPool, i => i.department),
      completing: countVehiclesWithUnassignedField(searchPool, i => i.completingDepartment),
      reason: countVehiclesWithUnassignedField(searchPool, i => i.reason)
    }),
    [searchPool]
  )
  const filterable =
    listTab === 'active' ||
    listTab === 'byFamily' ||
    listTab === 'reportList' ||
    listTab === 'reportDaily' ||
    listTab === 'reportCustom' ||
    listTab === 'reportStoppage' ||
    listTab === 'history' ||
    listTab === 'historySummary'

  if (!canUseFilters || !filterable) return null

  function onListFilterChange(
    key: 'departments' | 'completingDepartments' | 'reasons',
    raw: string
  ) {
    if (!raw) onFiltersChange({ [key]: [] })
    else if (raw === MP_FILTER_UNASSIGNED) onFiltersChange({ [key]: [MP_FILTER_UNASSIGNED] })
    else onFiltersChange({ [key]: [raw] })
  }

  return (
    <div className="space-y-2">
      {hasActiveFilter && (
        <p className="text-xs font-bold text-cyan-300">
          {t('mp.filterVehicleCountFiltered', { n: filteredVehicleCount, total: tabVehicleCount })}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-2">
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
        <FilterField
          label={t('mp.cols.causingDepartment')}
          badge={unassignedCounts.causing}
          badgeTitle={t('mp.filterUnassignedVehiclesHint')}
          className="min-w-[10rem] flex-1"
        >
          <select
            className="input-dark w-full"
            value={departmentFilterValue}
            onChange={e => onListFilterChange('departments', e.target.value)}
            aria-label={t('mp.cols.causingDepartment')}
          >
            <option value="">{t('mp.filterCausingDepartmentAll')}</option>
            <option value={MP_FILTER_UNASSIGNED}>{t('mp.filterUnassigned')}</option>
            {adminUnits.map(unit => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField
          label={t('mp.cols.completingDepartment')}
          badge={unassignedCounts.completing}
          badgeTitle={t('mp.filterUnassignedVehiclesHint')}
          className="min-w-[10rem] flex-1"
        >
          <select
            className="input-dark w-full"
            value={completingDepartmentFilterValue}
            onChange={e => onListFilterChange('completingDepartments', e.target.value)}
            aria-label={t('mp.cols.completingDepartment')}
          >
            <option value="">{t('mp.filterCompletingDepartmentAll')}</option>
            <option value={MP_FILTER_UNASSIGNED}>{t('mp.filterUnassigned')}</option>
            {adminUnits.map(unit => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField
          label={t('mp.cols.reasonClass')}
          badge={unassignedCounts.reason}
          badgeTitle={t('mp.filterUnassignedVehiclesHint')}
          className="min-w-[10rem] flex-1"
        >
          <select
            className="input-dark w-full"
            value={reasonFilterValue}
            onChange={e => onListFilterChange('reasons', e.target.value)}
            aria-label={t('mp.cols.reasonClass')}
          >
            <option value="">{t('mp.filterReasonClassAll')}</option>
            <option value={MP_FILTER_UNASSIGNED}>{t('mp.filterUnassigned')}</option>
            {reasonOptions.map(option => (
              <option key={option.code} value={option.code}>
                {mpLookupLabel(reasons, option.code, lang)}
              </option>
            ))}
          </select>
        </FilterField>
      </div>
    </div>
  )
}

function FilterField({
  label,
  badge,
  badgeTitle,
  className,
  children
}: {
  label: string
  badge?: number
  badgeTitle?: string
  className?: string
  children: ReactNode
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ''}`}>
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
        {label}
        {badge != null && (
          <span
            title={badgeTitle}
            className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-black leading-none text-cyan-200 ring-1 ring-cyan-400/30"
          >
            {badge}
          </span>
        )}
      </span>
      {children}
    </label>
  )
}
