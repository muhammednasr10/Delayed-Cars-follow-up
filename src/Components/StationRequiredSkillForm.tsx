import { useEffect, useState } from 'react'
import { ListChecks } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { Modal } from './Modal'
import { ActiveToggle, Field, inputCls } from './FormField'
import { TRAINING_LEVELS } from '../Types/enums'
import type { TrainingLevel } from '../Types/enums'
import type { StationRequiredSkill, StationRequiredSkillInput, TrainingSkill } from '../Types/training'
import type { Station } from '../Types/settings'

type Props = {
  open: boolean
  editing: StationRequiredSkill | null
  defaultStationId?: string
  stations: Station[]
  skills: TrainingSkill[]
  busy: boolean
  onClose: () => void
  onSubmit: (input: StationRequiredSkillInput) => Promise<boolean>
}

type State = { stationId: string; skillId: string; requiredLevel: TrainingLevel; isMandatory: boolean; notes: string; isActive: boolean }

export function StationRequiredSkillForm({ open, editing, defaultStationId, stations, skills, busy, onClose, onSubmit }: Props) {
  const { t } = useLang()
  const [form, setForm] = useState<State>({ stationId: '', skillId: '', requiredLevel: 'level_3', isMandatory: true, notes: '', isActive: true })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(editing
      ? { stationId: editing.stationId, skillId: editing.skillId, requiredLevel: editing.requiredLevel, isMandatory: editing.isMandatory, notes: editing.notes ?? '', isActive: editing.isActive }
      : { stationId: defaultStationId ?? '', skillId: '', requiredLevel: 'level_3', isMandatory: true, notes: '', isActive: true })
  }, [open, editing, defaultStationId])

  const set = (k: keyof State, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))

  async function submit() {
    const e: Record<string, string> = {}
    if (!form.stationId || !form.skillId) e.skillId = t('training.err.stationSkillRequired')
    setErrors(e)
    if (Object.keys(e).length > 0) return
    const ok = await onSubmit({ stationId: form.stationId, skillId: form.skillId, requiredLevel: form.requiredLevel, isMandatory: form.isMandatory, notes: form.notes || null, isActive: form.isActive })
    if (!ok) setErrors({ skillId: t('training.err.dupReq') })
  }

  return (
    <Modal open={open} title={editing ? t('training.srs.editTitle') : t('training.srs.addTitle')} icon={<ListChecks className="h-5 w-5" />} onClose={onClose} maxWidthClass="max-w-3xl"
      footer={
        <>
          <button disabled={busy} onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50">{t('common.cancel')}</button>
          <button disabled={busy} onClick={submit} className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50">{busy ? t('common.saving') : editing ? t('common.saveEdit') : t('common.save')}</button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Row 1: station + skill */}
        <Field label={t('training.srs.station')} required>
          <select className={inputCls()} value={form.stationId} onChange={e => set('stationId', e.target.value)} disabled={Boolean(editing)}>
            <option value="">—</option>
            {stations.map(s => <option key={s.id} value={s.id}>{s.station_number} - {s.station_name}</option>)}
          </select>
        </Field>
        <Field label={t('training.srs.skill')} required error={errors.skillId}>
          <select className={inputCls(errors.skillId)} value={form.skillId} onChange={e => set('skillId', e.target.value)} disabled={Boolean(editing)}>
            <option value="">—</option>
            {skills.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.skillCode} - {s.skillNameAr || s.skillNameEn}</option>)}
          </select>
        </Field>
        {/* Row 2: required level + mandatory */}
        <Field label={t('training.srs.level')} required>
          <select className={inputCls()} value={form.requiredLevel} onChange={e => set('requiredLevel', e.target.value as TrainingLevel)}>
            {TRAINING_LEVELS.map(l => <option key={l} value={l}>{t(`trainingLevel.${l}`)}</option>)}
          </select>
        </Field>
        <Field label={t('training.srs.mandatory')} required>
          <ActiveToggle active={form.isMandatory} activeLabel={t('common.yes')} inactiveLabel={t('common.no')} onChange={v => set('isMandatory', v)} />
        </Field>
        {/* Row 3: status + notes */}
        <Field label={t('training.srs.status')}>
          <ActiveToggle active={form.isActive} activeLabel={t('org.f.active')} inactiveLabel={t('org.f.inactive')} onChange={v => set('isActive', v)} />
        </Field>
        <Field label={t('training.srs.notes')}>
          <textarea className={`${inputCls()} min-h-[42px]`} rows={1} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
