import { useLang } from '../i18n/LanguageContext'
import type { JobRole } from '../Types/enums'
import type { EmploymentStatus } from '../Types/permissions'

const base = 'inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 whitespace-nowrap'

const ROLE_CLASSES: Record<JobRole, string> = {
  general_manager: 'bg-purple-500/15 text-purple-200 ring-purple-400/30',
  manager: 'bg-blue-500/15 text-blue-200 ring-blue-400/30',
  engineer: 'bg-cyan-500/15 text-cyan-200 ring-cyan-400/30',
  supervisor: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30',
  data_entry: 'bg-teal-500/15 text-teal-200 ring-teal-400/30',
  assistant_supervisor: 'bg-amber-500/15 text-amber-200 ring-amber-400/30',
  leader: 'bg-orange-500/15 text-orange-200 ring-orange-400/30',
  technician: 'bg-slate-500/15 text-slate-200 ring-slate-400/30'
}

export function JobRoleBadge({ role }: { role: JobRole }) {
  const { t } = useLang()
  return <span className={`${base} ${ROLE_CLASSES[role]}`}>{t(`jobRole.${role}`)}</span>
}

export function ActiveBadge({ active }: { active: boolean }) {
  const { t } = useLang()
  const cls = active ? 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30' : 'bg-slate-600/20 text-slate-300 ring-slate-500/30'
  return <span className={`${base} ${cls}`}>{active ? t('org.f.active') : t('org.f.inactive')}</span>
}

const EMPLOYMENT_STATUS_CLASSES: Record<EmploymentStatus, string> = {
  active: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30',
  suspended: 'bg-amber-500/15 text-amber-200 ring-amber-400/30',
  resigned: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
  terminated: 'bg-red-500/15 text-red-200 ring-red-400/30',
  on_leave: 'bg-sky-500/15 text-sky-200 ring-sky-400/30'
}

export function EmploymentStatusBadge({ status }: { status: EmploymentStatus }) {
  const { t } = useLang()
  return (
    <span className={`${base} ${EMPLOYMENT_STATUS_CLASSES[status]}`}>
      {t(`org.employmentStatus.${status}`)}
    </span>
  )
}
