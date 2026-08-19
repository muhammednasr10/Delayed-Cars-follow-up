import { FilePlus, MessageSquareReply } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { Field, inputCls } from '../FormField'
import { Modal } from '../Modal'
import { MissionResponseFileTile } from './MissionResponseFileTile'
import type { TeamMission } from '../../Types/mission'
import {
  appendMissionResponseFiles,
  MISSION_RESPONSE_ACCEPT,
  MISSION_RESPONSE_MAX_FILES,
  missionResponseResolvedMime
} from '../../Utils/missionResponseFiles'

type Props = {
  open: boolean
  mission: TeamMission | null
  saving?: boolean
  onClose: () => void
  onRespond: (response: string, files: File[]) => void | Promise<void>
}

export function MissionRespondModal({ open, mission, saving, onClose, onRespond }: Props) {
  const { t } = useLang()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [response, setResponse] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setResponse('')
    setFiles([])
    setError('')
  }, [open, mission?.id])

  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file))
    setPreviews(urls)
    return () => {
      for (const url of urls) URL.revokeObjectURL(url)
    }
  }, [files])

  function pickFiles(list: FileList | null) {
    if (!list?.length) return
    const next = appendMissionResponseFiles(files, [...list])
    setFiles(next.files)
    if (next.error === 'too_many') setError(t('missions.respond.errTooMany'))
    else if (next.error === 'too_large') setError(t('missions.respond.errTooLarge'))
    else if (next.error === 'invalid_type') setError(t('missions.respond.errInvalidType'))
    else setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setError('')
  }

  async function submit() {
    const text = response.trim()
    if (!text) {
      setError(t('missions.respond.errRequired'))
      return
    }
    setError('')
    try {
      await onRespond(text, files)
    } catch {
      /* parent shows error */
    }
  }

  return (
    <Modal
      open={open}
      title={t('missions.respond.title')}
      subtitle={mission?.title}
      icon={<MessageSquareReply className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      zIndexClass="z-[120]"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            {t('missions.respond.save')}
          </button>
        </div>
      }
    >
      <div className="space-y-3 p-5">
        <p className="text-sm text-slate-400">{t('missions.respond.hint')}</p>
        {mission?.description?.trim() && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-start">
            <p className="text-[11px] font-bold text-slate-500">{t('missions.cols.description')}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{mission.description.trim()}</p>
          </div>
        )}
        <Field label={t('missions.respond.field')}>
          <textarea
            className={`${inputCls()} min-h-[8rem] resize-y`}
            value={response}
            onChange={e => setResponse(e.target.value)}
            placeholder={t('missions.respond.placeholder')}
            disabled={saving}
          />
        </Field>
        <Field label={t('missions.respond.attachments')}>
          <input
            ref={fileInputRef}
            type="file"
            accept={MISSION_RESPONSE_ACCEPT}
            multiple
            className="hidden"
            onChange={e => pickFiles(e.target.files)}
            disabled={saving}
          />
          {files.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {files.map((file, index) => (
                <MissionResponseFileTile
                  key={`${file.name}-${index}`}
                  url={previews[index]}
                  fileName={file.name}
                  mimeType={missionResponseResolvedMime(file)}
                  removeLabel={t('missions.respond.removeImage')}
                  onRemove={() => removeFile(index)}
                  disabled={saving}
                />
              ))}
            </div>
          )}
          {files.length < MISSION_RESPONSE_MAX_FILES && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 bg-slate-900/40 px-4 py-4 text-sm font-bold text-slate-400 hover:border-cyan-500/50 hover:text-cyan-200 disabled:opacity-50"
            >
              <FilePlus className="h-5 w-5" />
              {t('missions.respond.addImages')}
            </button>
          )}
        </Field>
        {error && <p className="text-sm font-bold text-red-300">{error}</p>}
      </div>
    </Modal>
  )
}
