import { FileText, X } from 'lucide-react'
import { isMissionResponseImage } from '../../Utils/missionResponseFiles'

type Props = {
  url: string
  fileName: string
  mimeType: string
  removeLabel?: string
  onRemove?: () => void
  disabled?: boolean
}

export function MissionResponseFileTile({ url, fileName, mimeType, removeLabel, onRemove, disabled }: Props) {
  const image = isMissionResponseImage(mimeType)

  return (
    <div className="relative">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="block overflow-hidden rounded-xl border border-slate-700 bg-slate-900"
        title={fileName}
      >
        {image ? (
          <img src={url} alt={fileName} className="h-20 w-20 object-cover" />
        ) : (
          <span className="flex h-20 w-20 flex-col items-center justify-center gap-1 px-1.5 text-cyan-200">
            <FileText className="h-6 w-6" />
            <span className="w-full truncate text-center text-[10px] font-bold text-slate-300">{fileName}</span>
          </span>
        )}
      </a>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="absolute -top-1 -end-1 rounded-full bg-slate-900 p-1 text-slate-300 hover:text-white disabled:opacity-50"
          aria-label={removeLabel}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
