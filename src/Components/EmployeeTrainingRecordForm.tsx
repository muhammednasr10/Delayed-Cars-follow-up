import { useEffect, useState } from 'react'
import { Award } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { Modal } from './Modal'
import { ActiveToggle, Field, inputCls } from './FormField'
import { TRAINING_LEVELS, TRAINING_STATUSES } from '../Types/enums'
import type { TrainingLevel, TrainingStatus } from '../Types/enums'
import type { EmployeeTraining, EmployeeTrainingInput, TrainingSkill } from '../Types/training'
import type { Employee } from '../Types/employee'

type Props = {
  open: boolean
  editing: EmployeeTraining | null
  preset?: { employeeId?: string; skillId?: string } | null
  employees: Employee[]
  skills: TrainingSkill[]
  busy: boolean
  onClose: () => void
  onSubmit: (input: EmployeeTrainingInput) => Promise<boolean>
}

type State = {
  employeeId: string; skillId: string; level: TrainingLevel; rating: string; status: TrainingStatus
  trainingDate: string; expiryDate: string; lastEvaluationDate: string; trainerId: string; notes: string; attachmentUrl: string; isActive: boolean
}

const empty: State = { employeeId: '', skillId: '', level: 'level_0', rating: '', status: 'not_trained', trainingDate: '', expiryDate: '', lastEvaluationDate: '', trainerId: '', notes: '', attachmentUrl: '', isActive: true }

export function EmployeeTrainingRecordForm({ open, editing, preset, employees, skills, busy, onClose, onSubmit }: Props) {
  const { t } = useLang()
  const [form, setForm] = useState<State>(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(editing ? {
      employeeId: editing.employeeId, skillId: editing.skillId, level: editing.level, rating: editing.rating != null ? String(editing.rating) : '', status: editing.status,
      trainingDate: editing.trainingDate ?? '', expiryDate: editing.expiryDate ?? '', lastEvaluationDate: editing.lastEvaluationDate ?? '', trainerId: editing.trainerId ?? '',
      notes: editing.notes ?? '', attachmentUrl: editing.attachmentUrl ?? '', isActive: true
    } : { ...empty, employeeId: preset?.employeeId ?? '', skillId: preset?.skillId ?? '' })
  }, [open, editing, preset])

  const set = (k: keyof State, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))

  async function submit() {
    const e: Record<string, string> = {}
    if (!form.employeeId || !form.skillId) e.skillId = t('training.err.empSkillRequired')
    setErrors(e)
    if (Object.keys(e).length > 0) return
    const ok = await onSubmit({
      employeeId: form.employeeId, skillId: form.skillId, level: form.level, rating: form.rating ? Number(form.rating) : null, status: form.status,
      trainingDate: form.trainingDate || null, expiryDate: form.expiryDate || null, lastEvaluationDate: form.lastEvaluationDate || null, trainerId: form.trainerId || null,
      notes: form.notes || null, attachmentUrl: form.attachmentUrl || null, isActive: form.isActive
    })
    if (!ok) setErrors({ skillId: t('training.err.dupReq') })
  }

  return (
    <Modal open={open} title={editing ? t('training.rec.editTitle') : t('training.rec.addTitle')} icon={<Award className="h-5 w-5" />} onClose={onClose} maxWidthClass="max-w-3xl"
      footer={
        <>
          <button disabled={busy} onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50">{t('common.cancel')}</button>
          <button disabled={busy} onClick={submit} className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50">{busy ? t('common.saving') : editing ? t('common.saveEdit') : t('common.save')}</button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t('training.rec.employee')} required>
          <select className={inputCls()} value={form.employeeId} onChange={e => set('employeeId', e.target.value)} disabled={Boolean(editing)}>
            <option value="">—</option>
            {employees.filter(e => e.isActive).map(e => <option key={e.id} value={e.id}>{e.employeeCode} - {e.fullName}</option>)}
          </select>
        </Field>
        <Field label={t('training.rec.skill')} required error={errors.skillId}>
          <select className={inputCls(errors.skillId)} value={form.skillId} onChange={e => set('skillId', e.target.value)} disabled={Boolean(editing)}>
            <option value="">—</option>
            {skills.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.skillCode} - {s.skillNameAr || s.skillNameEn}</option>)}
          </select>
        </Field>
        <Field label={t('training.rec.level')}>
          <select className={inputCls()} value={form.level} onChange={e => set('level', e.target.value as TrainingLevel)}>
            {TRAINING_LEVELS.map(l => <option key={l} value={l}>{t(`trainingLevel.${l}`)}</option>)}
          </select>
        </Field>
        <Field label={t('training.rec.status')}>
          <select className={inputCls()} value={form.status} onChange={e => set('status', e.target.value as TrainingStatus)}>
            {TRAINING_STATUSES.map(s => <option key={s} value={s}>{t(`trainingStatus.${s}`)}</option>)}
          </select>
        </Field>
        <Field label={t('training.rec.rating')}>
          <select className={inputCls()} value={form.rating} onChange={e => set('rating', e.target.value)}>
            <option value="">{t('training.rec.noRating')}</option>
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{'★'.repeat(n)} ({n}/5)</option>)}
          </select>
        </Field>
        <Field label={t('training.rec.lastEval')}>
          <input type="date" className={inputCls()} value={form.lastEvaluationDate} onChange={e => set('lastEvaluationDate', e.target.value)} />
        </Field>
        <Field label={t('training.rec.trainingDate')}>
          <input type="date" className={inputCls()} value={form.trainingDate} onChange={e => set('trainingDate', e.target.value)} />
        </Field>
        <Field label={t('training.rec.expiry')}>
          <input type="date" className={inputCls()} value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} />
        </Field>
        <Field label={t('training.rec.trainer')}>
          <select className={inputCls()} value={form.trainerId} onChange={e => set('trainerId', e.target.value)}>
            <option value="">{t('training.rec.noTrainer')}</option>
            {employees.filter(e => e.isActive).map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </select>
        </Field>
        <Field label={t('training.rec.attachment')}>
          <input className={inputCls()} value={form.attachmentUrl} onChange={e => set('attachmentUrl', e.target.value)} dir="ltr" placeholder="https://" />
        </Field>
        <div className="sm:col-span-2">
          <Field label={t('training.rec.notes')}>
            <textarea className={`${inputCls()} min-h-16`} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  )
}
