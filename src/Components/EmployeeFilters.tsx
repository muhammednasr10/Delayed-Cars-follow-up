import { useLang } from '../i18n/LanguageContext'
import { JOB_ROLES } from '../Types/enums'
import type { JobRole } from '../Types/enums'
import type { WorkArea } from '../Types/settings'

export type EmployeeFilterState = {
  search: string
  role: JobRole | ''
  department: string
  workAreaId: string
  status: '' | 'active' | 'inactive'
}

export const emptyEmployeeFilters: EmployeeFilterState = {
  search: '',
  role: '',
  department: '',
  workAreaId: '',
  status: ''
}

const DEPARTMENTS = ['warehouse', 'purchasing', 'production', 'quality', 'supplier', 'management']

type Props = {
  value: EmployeeFilterState
  onChange: (next: EmployeeFilterState) => void
  areas: WorkArea[]
}

export function EmployeeFilters({ value, onChange, areas }: Props) {
  const { t } = useLang()
  const set = (patch: Partial<EmployeeFilterState>) => onChange({ ...value, ...patch })

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <input className="input-dark" placeholder={t('org.filters.search')} value={value.search} onChange={e => set({ search: e.target.value })} />
      <select className="input-dark" value={value.role} onChange={e => set({ role: e.target.value as JobRole | '' })}>
        <option value="">{t('org.filters.role')}</option>
        {JOB_ROLES.map(r => <option key={r} value={r}>{t(`jobRole.${r}`)}</option>)}
      </select>
      <select className="input-dark" value={value.department} onChange={e => set({ department: e.target.value })}>
        <option value="">{t('org.filters.department')}</option>
        {DEPARTMENTS.map(d => <option key={d} value={d}>{t(`department.${d}`)}</option>)}
      </select>
      <select className="input-dark" value={value.workAreaId} onChange={e => set({ workAreaId: e.target.value })}>
        <option value="">{t('org.filters.area')}</option>
        {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <select className="input-dark" value={value.status} onChange={e => set({ status: e.target.value as EmployeeFilterState['status'] })}>
        <option value="">{t('org.filters.status')}</option>
        <option value="active">{t('org.f.active')}</option>
        <option value="inactive">{t('org.f.inactive')}</option>
      </select>
    </div>
  )
}
