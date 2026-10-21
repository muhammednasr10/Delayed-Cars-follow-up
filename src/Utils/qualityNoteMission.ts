import type { QualityNoteRecord } from '../Types/qualityNote'
import { formatStationReferenceCode } from './stationHierarchy'

export function qualityNoteMissionTitle(note: QualityNoteRecord): string {
  const desc = note.description.trim()
  const short = desc.length > 80 ? `${desc.slice(0, 77)}…` : desc
  return short ? `8D — ${short}` : '8D — دراسة ملاحظة جودة'
}

export function qualityNoteMissionDescription(
  note: QualityNoteRecord,
  labels: { category: string; severity: string; repairTime: string }
): string {
  const lines = [
    note.description.trim(),
    note.modelNames.length ? `الموديل: ${note.modelNames.join(', ')}` : '',
    note.stationCode ? `المحطة: ${formatStationReferenceCode(note.stationCode)}` : '',
    note.workerLineCode ? `خط العامل: ${note.workerLineCode}` : '',
    labels.category ? `التصنيف: ${labels.category}` : '',
    `الشدة: ${labels.severity}`,
    `وقت الإصلاح: ${labels.repairTime}`,
    note.vins.length ? `الشاسيه: ${note.vins.join(', ')}` : '',
    'المصدر: دراسة ملاحظة جودة (8D)'
  ]
  return lines.filter(Boolean).join('\n')
}
