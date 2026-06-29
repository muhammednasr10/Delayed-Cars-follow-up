import { useEffect, useState } from 'react'
import { Microscope } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import { formatStationReferenceCode } from '../../Utils/stationHierarchy'
import type { QualityNoteRecord, QualityNoteStatus, QualityNoteStudyPatch } from '../../Types/qualityNote'

const STATUSES: QualityNoteStatus[] = ['open', 'under_study', 'closed']

type Props = {
  open: boolean
  note: QualityNoteRecord | null
  onClose: () => void
  onSave: (id: string, patch: QualityNoteStudyPatch) => void
  saving?: boolean
}

export function QualityNoteStudyModal({ open, note, onClose, onSave, saving }: Props) {
  const { t } = useLang()
  const [status, setStatus] = useState<QualityNoteStatus>('open')
  const [studyNotes, setStudyNotes] = useState('')

  useEffect(() => {
    if (!open || !note) return
    setStatus(note.status)
    setStudyNotes(note.studyNotes ?? '')
  }, [open, note])

  if (!note) return null

  const noteId = note.id

  function submit() {
    onSave(noteId, { status, studyNotes: studyNotes.trim() || null })
  }

  return (
    <Modal
      open={open}
      title={t('qualityNotes.studyTitle')}
      subtitle={t('qualityNotes.studySubtitle')}
      icon={<Microscope className="h-5 w-5" />}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700">
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
      }
    >
      <div className="space-y-4 p-5">
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-300">
          <p className="font-bold text-white">{note.description}</p>
          <p className="mt-2 text-xs text-slate-500">
            {note.notedAt}
            {note.stationCode ? ` · ${formatStationReferenceCode(note.stationCode)}` : ''}
            {note.modelNames.length ? ` · ${note.modelNames.join(', ')}` : ''}
          </p>
        </div>

        <Field label={t('qualityNotes.cols.status')} required>
          <select className={inputCls()} value={status} onChange={e => setStatus(e.target.value as QualityNoteStatus)}>
            {STATUSES.map(key => (
              <option key={key} value={key}>
                {t(`qualityNotes.status.${key}`)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('qualityNotes.cols.studyNotes')}>
          <textarea
            className={`${inputCls()} min-h-[6rem] resize-y`}
            value={studyNotes}
            onChange={e => setStudyNotes(e.target.value)}
            placeholder={t('qualityNotes.studyNotesPh')}
          />
        </Field>
      </div>
    </Modal>
  )
}
