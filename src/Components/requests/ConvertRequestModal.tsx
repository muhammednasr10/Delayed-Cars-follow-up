import { useEffect, useState } from 'react'
import { ListTodo } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import { EmployeeMultiSelect } from '../EmployeeMultiSelect'
import type { Employee } from '../../Types/employee'
import type { MissionPriority } from '../../Types/mission'
import { MISSION_PRIORITIES } from '../../Types/mission'
import type { TeamRequest } from '../../Types/teamRequest'

function todayIsoDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type Props = {
  open: boolean
  request: TeamRequest | null
  assignableEmployees: Employee[]
  onClose: () => void
  onConvert: (assigneeIds: string[], priority: MissionPriority, dueDate: string | null, notes: string | null) => void
  saving?: boolean
}

export function ConvertRequestModal({ open, request, assignableEmployees, onClose, onConvert, saving }: Props) {
  const { t } = useLang()
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [priority, setPriority] = useState<MissionPriority>('normal')
  const [dueDate, setDueDate] = useState(todayIsoDate())
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && request) {
      setAssigneeIds([])
      setPriority('normal')
      setDueDate(todayIsoDate())
      setNotes('')
      setError('')
    }
  }, [open, request])

  function submit() {
    if (!assigneeIds.length) {
      setError(t('missions.errAssignee'))
      return
    }
    onConvert(assigneeIds, priority, dueDate || null, notes.trim() || null)
  }

  if (!request) return null

  return (
    <Modal
      open={open}
      title={t('requests.convertTitle')}
      subtitle={t('requests.convertSubtitleMulti')}
      icon={<ListTodo className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-lg"
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
            {saving ? t('common.saving') : t('requests.convertAction')}
          </button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-3 text-sm">
          <p className="font-bold text-white">{request.title}</p>
          {request.description && <p className="mt-1 text-slate-400">{request.description}</p>}
          <p className="mt-2 text-xs text-slate-500">
            {t('requests.from')}: {request.requesterName}
          </p>
        </div>
        <Field label={t('missions.cols.assignees')} required>
          <EmployeeMultiSelect employees={assignableEmployees} value={assigneeIds} onChange={setAssigneeIds} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('missions.cols.priority')}>
            <select className={inputCls()} value={priority} onChange={e => setPriority(e.target.value as MissionPriority)}>
              {MISSION_PRIORITIES.map(key => (
                <option key={key} value={key}>
                  {t(`missions.priority.${key}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('missions.cols.dueDate')}>
            <input type="date" className={inputCls()} value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </Field>
        </div>
        <Field label={t('common.notes')}>
          <textarea className={`${inputCls()} min-h-[3rem] resize-y`} value={notes} onChange={e => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
