import { FileText } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { Modal } from './Modal'
import type { MissingPartDetail } from '../Types/missingPart'

type Props = {
  part: MissingPartDetail | null
  onClose: () => void
}

export function MissingPartDetailModal({ part, onClose }: Props) {
  const { t } = useLang()
  if (!part) return null

  return (
    <Modal
      open={Boolean(part)}
      onClose={onClose}
      title={t('mp.detail.title')}
      subtitle={part.partDescription}
      icon={<FileText className="h-5 w-5" />}
      maxWidthClass="max-w-md"
    >
      <dl className="space-y-3 text-sm">
        <Row label={t('mp.f.part')} value={part.partDescription} />
        <Row label={t('mp.cols.reason')} value={t(`reason.${part.reason}`)} />
        <Row label={t('mp.cols.department')} value={t(`department.${part.department}`)} />
        <Row label={t('mp.detail.stopper')} value={t(`stopper.${part.stopperType}`)} />
        <Row label={t('mp.f.notes')} value={part.notes?.trim() || '—'} multiline />
      </dl>
    </Modal>
  )
}

function Row({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5">
      <dt className="text-xs font-bold text-slate-500">{label}</dt>
      <dd className={`mt-1 font-medium text-slate-100 ${multiline ? 'whitespace-pre-wrap' : ''}`}>{value}</dd>
    </div>
  )
}
