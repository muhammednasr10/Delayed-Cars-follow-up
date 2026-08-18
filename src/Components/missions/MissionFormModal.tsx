import { useEffect, useState } from 'react'
import { ListTodo } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import { EmployeeMultiSelect } from '../EmployeeMultiSelect'
import type { Employee } from '../../Types/employee'
import type { MissionPriority, MissionRecurrenceType, MissionStatus, TeamMission, TeamMissionInput } from '../../Types/mission'
import { MISSION_PRIORITIES, MISSION_RECURRENCE_TYPES, MISSION_STATUSES } from '../../Types/mission'

function todayIsoDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function emptyForm(): TeamMissionInput {
  return {
    title: '',
    description: '',
    assigneeIds: [],
    status: 'pending',
    priority: 'normal',
    dueDate: todayIsoDate(),
    recurrenceType: 'none',
    recurrenceCustom: '',
    notes: ''
  }
}

type Props = {
  open: boolean
  employees: Employee[]
  editing: TeamMission | null
  defaultTitle?: string
  onClose: () => void
  onSave: (input: TeamMissionInput) => void | Promise<void>
  saving?: boolean
  zIndexClass?: string
}

export function MissionFormModal({
  open,
  employees,
  editing,
  defaultTitle,
  onClose,
  onSave,
  saving,
  zIndexClass
}: Props) {
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
        assigneeIds: editing.assigneeIds,
        status: editing.status,
        priority: editing.priority,
        dueDate: editing.dueDate ?? todayIsoDate(),
        recurrenceType: editing.recurrenceType ?? 'none',
        recurrenceCustom: editing.recurrenceCustom ?? '',
        notes: editing.notes ?? ''
      })
    } else {
      setForm({ ...emptyForm(), title: defaultTitle?.trim() ?? '' })
    }
    setError('')
  }, [open, editing, defaultTitle])

  function validate(): string | null {
    if (!form.title.trim()) return t('missions.errTitle')
    if (!form.assigneeIds.length) return t('missions.errAssignee')
    return null
  }

  async function submit() {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setError('')
    try {
      await onSave({
        ...form,
        title: form.title.trim(),
        description: form.description?.trim() || undefined,
        dueDate: form.dueDate || null,
        recurrenceType: form.recurrenceType ?? 'none',
        recurrenceCustom: form.recurrenceType === 'custom' ? form.recurrenceCustom?.trim() || null : null,
        notes: form.notes?.trim() || undefined
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    }
  }

  return (
    <Modal
      open={open}
      title={editing ? t('missions.editMission') : t('missions.addMission')}
      subtitle={t('missions.formSubtitleMulti')}
      icon={<ListTodo className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-xl"
      zIndexClass={zIndexClass}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:opacity-60"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}

        <Field label={t('missions.cols.title')} required>
          <input
            className={inputCls()}
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
        </Field>

        <Field label={t('missions.cols.description')}>
          <textarea
            className={`${inputCls()} min-h-[4rem] resize-y`}
            value={form.description ?? ''}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </Field>

        <Field label={t('missions.cols.assignees')} required>
          <EmployeeMultiSelect
            employees={activeEmployees}
            value={form.assigneeIds}
            onChange={assigneeIds => setForm(f => ({ ...f, assigneeIds }))}
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

          <Field label={t('missions.cols.recurrence')}>
            <select
              className={inputCls()}
              value={(form.recurrenceType ?? 'none') as MissionRecurrenceType}
              onChange={e =>
                setForm(f => ({
                  ...f,
                  recurrenceType: e.target.value as MissionRecurrenceType
                }))
              }
            >
              {MISSION_RECURRENCE_TYPES.map(key => (
                <option key={key} value={key}>
                  {t(`missions.recurrence.${key}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {form.recurrenceType === 'custom' && (
          <Field label={t('missions.recurrenceCustom')}>
            <textarea
              className={`${inputCls()} min-h-[3rem] resize-y`}
              value={form.recurrenceCustom ?? ''}
              onChange={e => setForm(f => ({ ...f, recurrenceCustom: e.target.value }))}
            />
          </Field>
        )}

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
