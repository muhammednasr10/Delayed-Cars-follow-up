import type { QualityNoteRecord } from '../../Types/qualityNote'

export function QualitySeverityBadge({
  severity,
  label
}: {
  severity: QualityNoteRecord['severity']
  label: string
}) {
  const tones: Record<QualityNoteRecord['severity'], string> = {
    recurring: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
    critical: 'bg-red-500/15 text-red-200 border-red-500/30'
  }
  return (
    <span className={`inline-block rounded-lg border px-2 py-0.5 text-xs font-bold ${tones[severity]}`}>
      {label}
    </span>
  )
}

export function QualityRepairTimeBadge({
  repairTime,
  label
}: {
  repairTime: QualityNoteRecord['repairTime']
  label: string
}) {
  const tones: Record<QualityNoteRecord['repairTime'], string> = {
    little: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
    medium: 'bg-sky-500/15 text-sky-200 border-sky-500/30',
    much: 'bg-orange-500/15 text-orange-200 border-orange-500/30'
  }
  return (
    <span className={`inline-block rounded-lg border px-2 py-0.5 text-xs font-bold ${tones[repairTime]}`}>
      {label}
    </span>
  )
}
