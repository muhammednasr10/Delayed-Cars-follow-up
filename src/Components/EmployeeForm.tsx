import { useEffect, useState, type ReactNode } from 'react'
import { Users } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { Modal } from './Modal'
import { ALLOWED_MANAGER_ROLES, JOB_ROLES } from '../Types/enums'
import type { JobRole, ResponsibleDepartment } from '../Types/enums'
import { ASSIGNMENT_STATUSES, type AssignmentStatus, type Employee, type EmployeeInput } from '../Types/employee'
import type { Station, WorkArea } from '../Types/settings'

const DEPARTMENTS: ResponsibleDepartment[] = ['warehouse', 'purchasing', 'production', 'quality', 'supplier', 'management']

type Props = {
  open: boolean
  editing: Employee | null
  employees: Employee[]
  areas: WorkArea[]
  stations: Station[]
  busy: boolean
  onClose: () => void
  onSubmit: (input: EmployeeInput) => Promise<boolean>
}

type FormState = {
  employeeCode: string
  fullName: string
  jobRole: JobRole | ''
  department: string
  workAreaId: string
  stationId: string
  lineName: string
  directManagerIds: string[]
  phone: string
  email: string
  notes: string
  assignmentStatus: string
  isActive: boolean
}

const emptyState: FormState = {
  employeeCode: '', fullName: '', jobRole: '', department: '', workAreaId: '',
  stationId: '', lineName: '', directManagerIds: [], phone: '', email: '', notes: '',
  assignmentStatus: '', isActive: true
}

function fromEmployee(e: Employee): FormState {
  return {
    employeeCode: e.employeeCode,
    fullName: e.fullName,
    jobRole: e.jobRole,
    department: e.department ?? '',
    workAreaId: e.workAreaId ?? '',
    stationId: e.stationId ?? '',
    lineName: e.lineName ?? '',
    directManagerIds: e.directManagerIds.length > 0 ? e.directManagerIds : (e.directManagerId ? [e.directManagerId] : []),
    phone: e.phone ?? '',
    email: e.email ?? '',
    notes: e.notes ?? '',
    assignmentStatus: e.assignmentStatus ?? '',
    isActive: e.isActive
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function EmployeeForm({ open, editing, employees, areas, stations, busy, onClose, onSubmit }: Props) {
  const { t } = useLang()
  const [form, setForm] = useState<FormState>(emptyState)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setForm(editing ? fromEmployee(editing) : emptyState)
    setErrors({})
  }, [open, editing])

  function set(key: keyof FormState, value: string | boolean) {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  // Managers must be active, not the employee being edited, and (when a role is
  // chosen) hold an allowed parent role per the hierarchy rules.
  const allowedRoles = form.jobRole ? ALLOWED_MANAGER_ROLES[form.jobRole] : []
  const managerOptions = employees.filter(e => {
    if (!e.isActive) return false
    if (editing && e.id === editing.id) return false
    if (form.jobRole && allowedRoles.length > 0) return allowedRoles.includes(e.jobRole)
    return true
  })

  function toggleManager(managerId: string) {
    setForm(prev => ({
      ...prev,
      directManagerIds: prev.directManagerIds.includes(managerId)
        ? prev.directManagerIds.filter(id => id !== managerId)
        : [...prev.directManagerIds, managerId]
    }))
    setErrors(prev => {
      if (!prev.directManagerId) return prev
      const next = { ...prev }
      delete next.directManagerId
      return next
    })
  }

  function validate(): EmployeeInput | null {
    const e: Record<string, string> = {}
    if (!form.employeeCode.trim()) e.employeeCode = t('org.err.codeRequired')
    if (!form.fullName.trim()) e.fullName = t('org.err.nameRequired')
    if (!form.jobRole) e.jobRole = t('org.err.roleRequired')
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) e.email = t('org.err.email')
    for (const managerId of form.directManagerIds) {
      if (editing && managerId === editing.id) {
        e.directManagerId = t('org.err.selfManager')
        break
      }
      const mgr = employees.find(m => m.id === managerId)
      if (mgr && !mgr.isActive) {
        e.directManagerId = t('org.err.managerInactive')
        break
      }
    }
    setErrors(e)
    if (Object.keys(e).length > 0) return null

    return {
      employeeCode: form.employeeCode,
      fullName: form.fullName,
      jobRole: form.jobRole as JobRole,
      department: (form.department || null) as ResponsibleDepartment | null,
      workAreaId: form.workAreaId || null,
      stationId: form.stationId || null,
      lineName: form.lineName || null,
      directManagerIds: form.directManagerIds,
      phone: form.phone || null,
      email: form.email || null,
      notes: form.notes || null,
      assignmentStatus: (form.assignmentStatus || null) as AssignmentStatus | null,
      isActive: form.isActive
    }
  }

  async function submit() {
    const input = validate()
    if (!input) return
    const ok = await onSubmit(input)
    if (!ok) setErrors(prev => ({ ...prev, employeeCode: t('org.err.duplicateCode') }))
  }

  return (
    <Modal
      open={open}
      title={editing ? t('org.edit') : t('org.add')}
      icon={<Users className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      footer={
        <>
          <button disabled={busy} onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50">{t('common.cancel')}</button>
          <button disabled={busy} onClick={submit} className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50">
            {busy ? t('common.saving') : editing ? t('common.saveEdit') : t('org.add')}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <Section title={t('org.steps.basic')}>
          <Field label={t('org.f.code')} required error={errors.employeeCode}>
            <input className={cls(errors.employeeCode)} value={form.employeeCode} placeholder="EMP-001" onChange={e => set('employeeCode', e.target.value)} />
          </Field>
          <Field label={t('org.f.name')} required error={errors.fullName}>
            <input className={cls(errors.fullName)} value={form.fullName} onChange={e => set('fullName', e.target.value)} />
          </Field>
          <Field label={t('org.f.role')} required error={errors.jobRole}>
            <select className={cls(errors.jobRole)} value={form.jobRole} onChange={e => set('jobRole', e.target.value)}>
              <option value="">—</option>
              {JOB_ROLES.map(r => <option key={r} value={r}>{t(`jobRole.${r}`)}</option>)}
            </select>
          </Field>
          <Field label={t('org.f.assignmentStatus')} hint={t('org.f.assignmentStatusHint')}>
            <select className={cls()} value={form.assignmentStatus} onChange={e => set('assignmentStatus', e.target.value)}>
              <option value="">—</option>
              {ASSIGNMENT_STATUSES.map(s => (
                <option key={s} value={s}>{t(`org.assignmentStatus.${s}`)}</option>
              ))}
            </select>
          </Field>
          <Field label={t('org.f.recordActive')}>
            <div className="flex gap-2">
              <Toggle active={form.isActive} label={t('org.f.active')} onClick={() => set('isActive', true)} tone="emerald" />
              <Toggle active={!form.isActive} label={t('org.f.inactive')} onClick={() => set('isActive', false)} tone="slate" />
            </div>
          </Field>
        </Section>

        <Section title={t('org.steps.location')}>
          <Field label={t('org.f.department')}>
            <select className={cls()} value={form.department} onChange={e => set('department', e.target.value)}>
              <option value="">—</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{t(`department.${d}`)}</option>)}
            </select>
          </Field>
          <Field label={t('org.f.workArea')}>
            <select className={cls()} value={form.workAreaId} onChange={e => set('workAreaId', e.target.value)}>
              <option value="">—</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label={t('org.f.line')}>
            <input className={cls()} value={form.lineName} onChange={e => set('lineName', e.target.value)} />
          </Field>
          <Field label={t('org.f.station')}>
            <select className={cls()} value={form.stationId} onChange={e => set('stationId', e.target.value)}>
              <option value="">—</option>
              {stations.map(s => <option key={s.id} value={s.id}>{s.station_number} - {s.station_name}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label={t('org.f.managers')} error={errors.directManagerId} hint={t('org.f.managersHint')}>
              <div className={`max-h-44 overflow-y-auto rounded-xl border bg-slate-900/50 p-2 space-y-1 ${errors.directManagerId ? 'border-red-500/60' : 'border-slate-700'}`}>
                {managerOptions.length === 0 ? (
                  <p className="px-2 py-1.5 text-sm text-slate-500">{t('org.f.noManager')}</p>
                ) : (
                  managerOptions.map(m => {
                    const checked = form.directManagerIds.includes(m.id)
                    return (
                      <label
                        key={m.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition ${checked ? 'bg-cyan-500/10 text-cyan-100' : 'text-slate-300 hover:bg-slate-800'}`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500"
                          checked={checked}
                          onChange={() => toggleManager(m.id)}
                        />
                        <span>{m.fullName} — {t(`jobRole.${m.jobRole}`)}</span>
                      </label>
                    )
                  })
                )}
              </div>
            </Field>
          </div>
        </Section>

        <Section title={t('org.steps.contact')}>
          <Field label={t('org.f.phone')}>
            <input className={cls()} value={form.phone} onChange={e => set('phone', e.target.value)} dir="ltr" />
          </Field>
          <Field label={t('org.f.email')} error={errors.email}>
            <input className={cls(errors.email)} value={form.email} onChange={e => set('email', e.target.value)} dir="ltr" />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t('org.f.notes')}>
              <textarea className={`${cls()} min-h-20`} value={form.notes} onChange={e => set('notes', e.target.value)} />
            </Field>
          </div>
        </Section>
      </div>
    </Modal>
  )
}

function cls(error?: string) {
  return `input-dark ${error ? 'border-red-500/60' : ''}`
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-black uppercase tracking-wide text-cyan-300">{title}</h4>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}

function Field({ label, required, error, hint, children }: { label: string; required?: boolean; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-bold text-slate-300">{label}{required && <span className="text-red-400"> *</span>}</span>
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      {children}
      {error && <span className="block text-xs font-semibold text-red-400">{error}</span>}
    </label>
  )
}

function Toggle({ active, label, onClick, tone }: { active: boolean; label: string; onClick: () => void; tone: 'emerald' | 'slate' }) {
  const activeCls = tone === 'emerald' ? 'border-emerald-500 bg-emerald-500/15 text-emerald-100' : 'border-slate-500 bg-slate-500/15 text-slate-100'
  return (
    <button type="button" onClick={onClick} className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${active ? activeCls : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
      {label}
    </button>
  )
}
