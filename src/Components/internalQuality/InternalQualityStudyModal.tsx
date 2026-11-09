import { useEffect, useMemo, useState } from 'react'
import { Microscope } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import { QualityNoteFishboneDiagram } from '../quality/QualityNoteFishboneDiagram'
import { QUALITY_NOTE_8D_STEPS, QUALITY_NOTE_STUDY_STATUSES } from '../quality/qualityNoteConstants'
import { qualityNote8dFilledCount } from '../../Utils/qualityNote8d'
import {
  parseQualityNoteFishbone,
  serializeQualityNoteFishbone
} from '../../Utils/qualityNoteFishbone'
import {
  type InternalQualityIssue,
  type InternalQualityStudyPatch
} from '../../Types/internalQuality'
import { EMPTY_QUALITY_NOTE_8D, type QualityNote8D, type QualityNoteStatus } from '../../Types/qualityNote'

type Props = {
  open: boolean
  issue: InternalQualityIssue | null
  modelLabel?: string
  recurrence?: boolean
  onClose: () => void
  onSave: (id: string, patch: Omit<InternalQualityStudyPatch, 'studyCount' | 'lastStudyAt'>) => void
  saving?: boolean
}

export function InternalQualityStudyModal({
  open,
  issue,
  modelLabel,
  recurrence = false,
  onClose,
  onSave,
  saving
}: Props) {
  const { t } = useLang()
  const [status, setStatus] = useState<QualityNoteStatus>('under_study')
  const [study8d, setStudy8d] = useState<QualityNote8D>(EMPTY_QUALITY_NOTE_8D)
  const [summary, setSummary] = useState('')

  useEffect(() => {
    if (!open || !issue) return
    setStatus(issue.status === 'closed' ? 'closed' : 'under_study')
    const next = { ...EMPTY_QUALITY_NOTE_8D, ...issue.study8d }
    if (!next.d2Problem.trim()) next.d2Problem = issue.problem
    setStudy8d(next)
    setSummary(issue.studyNotes)
  }, [open, issue])

  const filled = qualityNote8dFilledCount(study8d)
  const fishbone = useMemo(() => parseQualityNoteFishbone(study8d.d4RootCause), [study8d.d4RootCause])
  const problemHead = study8d.d2Problem.trim() || issue?.problem || ''

  if (!issue) return null
  const current = issue

  function setStep(key: keyof QualityNote8D, value: string) {
    setStudy8d(prev => ({ ...prev, [key]: value }))
  }

  function submit() {
    onSave(current.id, {
      status,
      studyNotes: summary.trim(),
      study8d
    })
  }

  return (
    <Modal
      open={open}
      title={recurrence ? t('internalQuality.recurrenceTitle') : t('internalQuality.studyTitle')}
      subtitle={current.problemType}
      icon={<Microscope className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-5xl"
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
              className="rounded-xl bg-teal-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-teal-400 disabled:opacity-60"
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        {recurrence && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm font-bold text-amber-100">
            {t('internalQuality.recurrenceHint')}
          </div>
        )}
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-300">
          <p className="font-bold text-white">{current.problem}</p>
          <p className="mt-2 text-xs text-slate-500">
            {[current.reportingWorkshop, modelLabel].filter(Boolean).join(' · ')}
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
          <h4 className="text-sm font-black text-teal-200">{t('qualityNotes.study8dStepsTitle')}</h4>
          {QUALITY_NOTE_8D_STEPS.map(step => {
            const actionStep = recurrence && (step.key === 'd5Corrective' || step.key === 'd6Implement')
            return (
            <div
              key={step.key}
              className={actionStep ? 'rounded-xl border border-amber-400/50 bg-amber-500/10 p-3' : undefined}
            >
            <Field label={`${step.code} — ${t(`qualityNotes.study8d.${step.key}`)}`}>
              {step.key === 'd4RootCause' ? (
                <QualityNoteFishboneDiagram
                  value={fishbone}
                  problem={problemHead}
                  onChange={next => setStep('d4RootCause', serializeQualityNoteFishbone(next))}
                />
              ) : (
                <textarea
                  className={`${inputCls()} min-h-[4.5rem] resize-y`}
                  value={study8d[step.key]}
                  onChange={e => setStep(step.key, e.target.value)}
                  placeholder={t(`qualityNotes.study8dPh.${step.key}`)}
                />
              )}
            </Field>
            </div>
            )
          })}
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
