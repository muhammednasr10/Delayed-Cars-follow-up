import { QUALITY_NOTE_STATUSES, QUALITY_NOTE_STATUS_BORDER } from './qualityNoteConstants'
import type { QualityNoteStatus } from '../../Types/qualityNote'

type Props = {
  value: QualityNoteStatus
  disabled?: boolean
  ariaLabel: string
  labelFor: (status: QualityNoteStatus) => string
  onChange: (status: QualityNoteStatus) => void
}

export function QualityNoteStatusSelect({ value, disabled, ariaLabel, labelFor, onChange }: Props) {
  return (
    <select
      className={`rounded-lg border-2 bg-slate-950 px-2 py-1.5 text-xs font-black text-white outline-none ring-0 disabled:opacity-60 ${QUALITY_NOTE_STATUS_BORDER[value]}`}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={e => onChange(e.target.value as QualityNoteStatus)}
    >
      {QUALITY_NOTE_STATUSES.map(key => (
        <option key={key} value={key} className="bg-slate-950 font-bold text-white">
          {labelFor(key)}
        </option>
      ))}
    </select>
  )
}
