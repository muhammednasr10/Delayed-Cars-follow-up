import { useEffect, useState } from 'react'
import { Microscope } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import { formatStationReferenceCode } from '../../Utils/stationHierarchy'
import { qualityNote8dFilledCount } from '../../Utils/qualityNote8d'
import {
  EMPTY_QUALITY_NOTE_8D,
  type QualityNote8D,
  type QualityNoteRecord,
  type QualityNoteStatus,
  type QualityNoteStudyPatch
} from '../../Types/qualityNote'
import { QUALITY_NOTE_8D_STEPS, QUALITY_NOTE_STUDY_STATUSES } from './qualityNoteConstants'

type Props = {
  open: boolean
  note: QualityNoteRecord | null
  onClose: () => void
  onSave: (id: string, patch: QualityNoteStudyPatch) => void
  saving?: boolean
}

export function QualityNoteStudyModal({ open, note, onClose, onSave, saving }: Props) {
  const { t } = useLang()
  const [status, setStatus] = useState<QualityNoteStatus>('under_study')
  const [study8d, setStudy8d] = useState<QualityNote8D>(EMPTY_QUALITY_NOTE_8D)
  const [summary, setSummary] = useState('')

  useEffect(() => {
    if (!open || !note) return
    setStatus(note.status === 'closed' ? 'closed' : 'under_study')
    setStudy8d({ ...EMPTY_QUALITY_NOTE_8D, ...note.study8d })
    setSummary(note.studyNotes ?? '')
  }, [open, note])

  if (!note) return null

  const filled = qualityNote8dFilledCount(study8d)

  function setStep(key: keyof QualityNote8D, value: string) {
    setStudy8d(prev => ({ ...prev, [key]: value }))
  }

  function submit() {
    onSave(note.id, {
      status,
      studyNotes: summary.trim() || null,
      study8d
    })
  }

  return (
    <Modal
      open={open}
      title={t('qualityNotes.study8dTitle')}
      subtitle={t('qualityNotes.study8dSubtitle')}
      icon={<Microscope className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold text-slate-400">
            {t('qualityNotes.study8dProgress', { filled, total: 8 })}
          </p>
          <div className="flex gap-2">
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
              onClick={submit}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-white hover:bg-emerald-400 disabled:opacity-60"
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-300">
          <p className="font-bold text-white">{note.description}</p>
          <p className="mt-2 text-xs text-slate-500">
            {note.notedAt}
            {note.stationCode ? ` · ${formatStationReferenceCode(note.stationCode)}` : ''}
            {note.modelNames.length ? ` · ${note.modelNames.join(', ')}` : ''}
            {` · ${t(`qualityNotes.severity.${note.severity}`)}`}
            {` · ${t(`qualityNotes.repairTime.${note.repairTime}`)}`}
          </p>
        </div>

        <Field label={t('qualityNotes.cols.status')} required>
          <select className={inputCls()} value={status} onChange={e => setStatus(e.target.value as QualityNoteStatus)}>
            {QUALITY_NOTE_STUDY_STATUSES.map(key => (
              <option key={key} value={key}>
                {t(`qualityNotes.status.${key}`)}
              </option>
            ))}
          </select>
        </Field>

        <div className="space-y-3">
          <h4 className="text-sm font-black text-cyan-200">{t('qualityNotes.study8dStepsTitle')}</h4>
          {QUALITY_NOTE_8D_STEPS.map(step => (
            <Field
              key={step.key}
              label={`${step.code} — ${t(`qualityNotes.study8d.${step.key}`)}`}
            >
              <textarea
                className={`${inputCls()} min-h-[4.5rem] resize-y`}
                value={study8d[step.key]}
                onChange={e => setStep(step.key, e.target.value)}
                placeholder={t(`qualityNotes.study8dPh.${step.key}`)}
              />
            </Field>
          ))}
        </div>

        <Field label={t('qualityNotes.cols.studyNotes')}>
          <textarea
            className={`${inputCls()} min-h-[4rem] resize-y`}
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder={t('qualityNotes.studyNotesPh')}
          />
        </Field>
      </div>
    </Modal>
  )
}
