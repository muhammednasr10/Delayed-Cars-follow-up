import { useEffect, useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { Modal } from './Modal'
import { ActiveToggle, Field, inputCls } from './FormField'
import type { ResponsibleDepartment } from '../Types/enums'
import type { TrainingSkill, TrainingSkillInput } from '../Types/training'
import type { Station } from '../Types/settings'

const DEPARTMENTS: ResponsibleDepartment[] = ['warehouse', 'purchasing', 'production', 'quality', 'supplier', 'management']

type Props = {
  open: boolean
  editing: TrainingSkill | null
  stations: Station[]
  busy: boolean
  onClose: () => void
  onSubmit: (input: TrainingSkillInput) => Promise<boolean>
}

type State = {
  skillCode: string; skillNameAr: string; skillNameEn: string; description: string
  department: string; stationId: string; validityDays: string; isMandatory: boolean; isActive: boolean
  standardTimeMinutes: string; requiredManpowerCount: string; isCritical: boolean
}

const empty: State = { skillCode: '', skillNameAr: '', skillNameEn: '', description: '', department: '', stationId: '', validityDays: '', isMandatory: false, isActive: true, standardTimeMinutes: '', requiredManpowerCount: '1', isCritical: false }

export function TrainingSkillForm({ open, editing, stations, busy, onClose, onSubmit }: Props) {
  const { t } = useLang()
  const [form, setForm] = useState<State>(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(editing ? {
      skillCode: editing.skillCode, skillNameAr: editing.skillNameAr ?? '', skillNameEn: editing.skillNameEn ?? '',
      description: editing.description ?? '', department: editing.department ?? '', stationId: editing.stationId ?? '',
      validityDays: editing.validityDays != null ? String(editing.validityDays) : '', isMandatory: editing.isMandatory, isActive: editing.isActive,
      standardTimeMinutes: editing.standardTimeMinutes != null ? String(editing.standardTimeMinutes) : '',
      requiredManpowerCount: String(editing.requiredManpowerCount ?? 1), isCritical: editing.isCritical
    } : empty)
  }, [open, editing])

  const set = (k: keyof State, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))

  async function submit() {
    const e: Record<string, string> = {}
    if (!form.skillCode.trim()) e.skillCode = t('training.err.codeRequired')
    if (!form.skillNameAr.trim() && !form.skillNameEn.trim()) e.skillNameAr = t('training.err.nameRequired')
    setErrors(e)
    if (Object.keys(e).length > 0) return

    const ok = await onSubmit({
      skillCode: form.skillCode, skillNameAr: form.skillNameAr || null, skillNameEn: form.skillNameEn || null,
      description: form.description || null, department: (form.department || null) as ResponsibleDepartment | null,
      stationId: form.stationId || null, validityDays: form.validityDays ? Number(form.validityDays) : null,
      isMandatory: form.isMandatory, isActive: form.isActive,
      standardTimeMinutes: form.standardTimeMinutes ? Number(form.standardTimeMinutes) : null,
      requiredManpowerCount: form.requiredManpowerCount ? Number(form.requiredManpowerCount) : 1,
      isCritical: form.isCritical
    })
    if (!ok) setErrors({ skillCode: t('training.err.duplicate') })
  }

  return (
    <Modal open={open} title={editing ? t('training.skill.editTitle') : t('training.skill.addTitle')} icon={<GraduationCap className="h-5 w-5" />} onClose={onClose} maxWidthClass="max-w-3xl"
      footer={
        <>
          <button disabled={busy} onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50">{t('common.cancel')}</button>
          <button disabled={busy} onClick={submit} className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50">{busy ? t('common.saving') : editing ? t('common.saveEdit') : t('common.save')}</button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t('training.skill.code')} required error={errors.skillCode}>
          <input className={inputCls(errors.skillCode)} value={form.skillCode} placeholder="SK-01" onChange={e => set('skillCode', e.target.value)} />
        </Field>
        <Field label={t('training.skill.validity')}>
          <input type="number" min={1} className={inputCls()} value={form.validityDays} onChange={e => set('validityDays', e.target.value)} />
        </Field>
        <Field label={t('training.skill.nameAr')} required error={errors.skillNameAr}>
          <input className={inputCls(errors.skillNameAr)} value={form.skillNameAr} onChange={e => set('skillNameAr', e.target.value)} />
        </Field>
        <Field label={t('training.skill.nameEn')}>
          <input className={inputCls()} value={form.skillNameEn} onChange={e => set('skillNameEn', e.target.value)} dir="ltr" />
        </Field>
        <Field label={t('training.skill.department')}>
          <select className={inputCls()} value={form.department} onChange={e => set('department', e.target.value)}>
            <option value="">—</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{t(`department.${d}`)}</option>)}
          </select>
        </Field>
        <Field label={t('training.skill.station')}>
          <select className={inputCls()} value={form.stationId} onChange={e => set('stationId', e.target.value)}>
            <option value="">—</option>
            {stations.map(s => <option key={s.id} value={s.id}>{s.station_number} - {s.station_name}</option>)}
          </select>
        </Field>
        <Field label={t('training.skill.standardTime')}>
          <input type="number" min={0} step="0.1" className={inputCls()} value={form.standardTimeMinutes} onChange={e => set('standardTimeMinutes', e.target.value)} />
        </Field>
        <Field label={t('training.skill.manpower')}>
          <input type="number" min={1} className={inputCls()} value={form.requiredManpowerCount} onChange={e => set('requiredManpowerCount', e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label={t('training.skill.description')}>
            <textarea className={`${inputCls()} min-h-16`} value={form.description} onChange={e => set('description', e.target.value)} />
          </Field>
        </div>
        <Field label={t('training.skill.mandatory')}>
          <ActiveToggle active={form.isMandatory} activeLabel={t('common.yes')} inactiveLabel={t('common.no')} onChange={v => set('isMandatory', v)} />
        </Field>
        <Field label={t('training.skill.critical')}>
          <ActiveToggle active={form.isCritical} activeLabel={t('common.yes')} inactiveLabel={t('common.no')} onChange={v => set('isCritical', v)} />
        </Field>
        <Field label={t('training.skill.status')}>
          <ActiveToggle active={form.isActive} activeLabel={t('org.f.active')} inactiveLabel={t('org.f.inactive')} onChange={v => set('isActive', v)} />
        </Field>
      </div>
    </Modal>
  )
}
