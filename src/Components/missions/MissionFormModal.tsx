import { useEffect, useState } from 'react'
import { ListTodo } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import { EmployeeAutocomplete } from '../EmployeeAutocomplete'
import type { Employee } from '../../Types/employee'
import type { MissionPriority, MissionStatus, TeamMission, TeamMissionInput } from '../../Types/mission'
import { MISSION_PRIORITIES, MISSION_STATUSES } from '../../Types/mission'

function todayIsoDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function emptyForm(): TeamMissionInput {
  return {
    title: '',
    description: '',
    assigneeId: '',
    status: 'pending',
    priority: 'normal',
    dueDate: todayIsoDate(),
    notes: ''
  }
}

type Props = {
  open: boolean
  employees: Employee[]
  editing: TeamMission | null
  onClose: () => void
  onSave: (input: TeamMissionInput) => void
  saving?: boolean
}

export function MissionFormModal({ open, employees, editing, onClose, onSave, saving }: Props) {
  const { t } = useLang()
  const [form, setForm] = useState<TeamMissionInput>(emptyForm())
  const [error, setError] = useState('')

  const activeEmployees = employees.filter(e => e.isActive)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        title: editing.title,
        description: editing.description ?? '',
        assigneeId: editing.assigneeId,
        status: editing.status,
        priority: editing.priority,
        dueDate: editing.dueDate ?? todayIsoDate(),
        notes: editing.notes ?? ''
      })
    } else {
      setForm(emptyForm())
    }
    setError('')
  }, [open, editing])

  function validate(): string | null {
    if (!form.title.trim()) return t('missions.errTitle')
    if (!form.assigneeId) return t('missions.errAssignee')
    return null
  }

  function submit() {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    onSave({
      ...form,
      title: form.title.trim(),
      description: form.description?.trim() || undefined,
      dueDate: form.dueDate || null,
      notes: form.notes?.trim() || undefined
    })
  }

  return (
    <Modal
      open={open}
      title={editing ? t('missions.editMission') : t('missions.addMission')}
      subtitle={t('missions.formSubtitle')}
      icon={<ListTodo className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-xl"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:opacity-60"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

        <Field label={t('missions.cols.title')} required>
          <input className={inputCls()} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </Field>

        <Field label={t('missions.cols.description')}>
          <textarea
            className={`${inputCls()} min-h-[4rem] resize-y`}
            value={form.description ?? ''}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </Field>

        <Field label={t('missions.cols.assignee')} required>
          <EmployeeAutocomplete
            employees={activeEmployees}
            value={form.assigneeId}
            onChange={assigneeId => setForm(f => ({ ...f, assigneeId }))}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('missions.cols.priority')}>
            <select
              className={inputCls()}
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value as MissionPriority }))}
            >
              {MISSION_PRIORITIES.map(key => (
                <option key={key} value={key}>
                  {t(`missions.priority.${key}`)}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t('missions.cols.dueDate')}>
            <input
              type="date"
              className={inputCls()}
              value={form.dueDate ?? ''}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
            />
          </Field>
        </div>

        {editing && (
          <Field label={t('missions.cols.status')}>
            <select
              className={inputCls()}
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as MissionStatus }))}
            >
              {MISSION_STATUSES.map(key => (
                <option key={key} value={key}>
                  {t(`missions.status.${key}`)}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label={t('common.notes')}>
          <textarea
            className={`${inputCls()} min-h-[3rem] resize-y`}
            value={form.notes ?? ''}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
        </Field>
      </div>
    </Modal>
  )
}
