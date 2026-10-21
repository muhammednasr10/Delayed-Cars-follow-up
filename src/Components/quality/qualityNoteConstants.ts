import type { QualityNote8D, QualityNoteRepairTime, QualityNoteSeverity, QualityNoteStatus } from '../../Types/qualityNote'

export const QUALITY_NOTE_CELL =
  'table-cell text-center align-middle whitespace-nowrap px-3 py-2.5'

export const QUALITY_NOTE_SEVERITIES: QualityNoteSeverity[] = ['recurring', 'critical']
export const QUALITY_NOTE_REPAIR_TIMES: QualityNoteRepairTime[] = ['little', 'medium', 'much']
export const QUALITY_NOTE_STATUSES: QualityNoteStatus[] = ['open', 'under_study', 'closed']
export const QUALITY_NOTE_STUDY_STATUSES: QualityNoteStatus[] = ['under_study', 'closed']

export const QUALITY_NOTE_8D_STEPS: { key: keyof QualityNote8D; code: string }[] = [
  { key: 'd1Team', code: 'D1' },
  { key: 'd2Problem', code: 'D2' },
  { key: 'd3Containment', code: 'D3' },
  { key: 'd4RootCause', code: 'D4' },
  { key: 'd5Corrective', code: 'D5' },
  { key: 'd6Implement', code: 'D6' },
  { key: 'd7Prevent', code: 'D7' },
  { key: 'd8Congratulate', code: 'D8' }
]

export const QUALITY_NOTE_STATUS_BORDER: Record<QualityNoteStatus, string> = {
  open: 'border-sky-400',
  under_study: 'border-violet-400',
  closed: 'border-slate-500'
}
