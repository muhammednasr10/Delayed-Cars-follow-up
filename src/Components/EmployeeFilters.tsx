import { useMemo } from 'react'
import { useLang } from '../i18n/LanguageContext'
import { JOB_ROLES } from '../Types/enums'
import type { JobRole } from '../Types/enums'
import type { FactoryOrgUnit } from '../Types/factoryOrg'
import { orgPathFromLeaf, orgPathLabel } from '../Utils/employeeOrgPicker'

export type EmployeeFilterState = {
  search: string
  role: JobRole | ''
  factoryOrgUnitId: string
  status: '' | 'active' | 'inactive'
}

export const emptyEmployeeFilters: EmployeeFilterState = {
  search: '',
  role: '',
  factoryOrgUnitId: '',
  status: ''
}

type Props = {
  value: EmployeeFilterState
  onChange: (next: EmployeeFilterState) => void
  orgUnits: FactoryOrgUnit[]
}

export function EmployeeFilters({ value, onChange, orgUnits }: Props) {
  const { t } = useLang()
  const set = (patch: Partial<EmployeeFilterState>) => onChange({ ...value, ...patch })

  const orgOptions = useMemo(
    () =>
      orgUnits
        .filter(u => u.isActive)
        .map(u => ({
          id: u.id,
          label: orgPathLabel(orgPathFromLeaf(u.id, orgUnits), orgUnits) ?? u.name
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'ar')),
    [orgUnits]
  )

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <input className="input-dark" placeholder={t('org.filters.search')} value={value.search} onChange={e => set({ search: e.target.value })} />
      <select className="input-dark" value={value.role} onChange={e => set({ role: e.target.value as JobRole | '' })}>
        <option value="">{t('org.filters.role')}</option>
        {JOB_ROLES.map(r => <option key={r} value={r}>{t(`jobRole.${r}`)}</option>)}
      </select>
      <select className="input-dark" value={value.factoryOrgUnitId} onChange={e => set({ factoryOrgUnitId: e.target.value })}>
        <option value="">{t('org.filters.orgUnit')}</option>
        {orgOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <select className="input-dark" value={value.status} onChange={e => set({ status: e.target.value as EmployeeFilterState['status'] })}>
        <option value="">{t('org.filters.status')}</option>
        <option value="active">{t('org.f.active')}</option>
        <option value="inactive">{t('org.f.inactive')}</option>
      </select>
    </div>
  )
}
