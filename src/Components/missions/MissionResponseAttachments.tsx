import { FilePlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { Field } from '../FormField'
import {
  appendMissionResponseFiles,
  MISSION_RESPONSE_ACCEPT,
  MISSION_RESPONSE_MAX_FILES,
  missionResponseResolvedMime
} from '../../Utils/missionResponseFiles'
import { MissionResponseFileTile } from './MissionResponseFileTile'

type Props = {
  files: File[]
  disabled?: boolean
  onChange: (files: File[]) => void
  onError: (message: string) => void
}

export function MissionResponseAttachments({ files, disabled, onChange, onError }: Props) {
  const { t } = useLang()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = useState<string[]>([])

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
    onChange(next.files)
    if (next.error === 'too_many') onError(t('missions.respond.errTooMany'))
    else if (next.error === 'too_large') onError(t('missions.respond.errTooLarge'))
    else if (next.error === 'invalid_type') onError(t('missions.respond.errInvalidType'))
    else onError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <Field label={t('missions.respond.attachments')}>
      <input
        ref={fileInputRef}
        type="file"
        accept={MISSION_RESPONSE_ACCEPT}
        multiple
        className="hidden"
        onChange={e => pickFiles(e.target.files)}
        disabled={disabled}
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
              onRemove={() => onChange(files.filter((_, i) => i !== index))}
              disabled={disabled}
            />
          ))}
        </div>
      )}
      {files.length < MISSION_RESPONSE_MAX_FILES && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 bg-slate-900/40 px-4 py-4 text-sm font-bold text-slate-400 hover:border-cyan-500/50 hover:text-cyan-200 disabled:opacity-50"
        >
          <FilePlus className="h-5 w-5" />
          {t('missions.respond.addImages')}
        </button>
      )}
    </Field>
  )
}
